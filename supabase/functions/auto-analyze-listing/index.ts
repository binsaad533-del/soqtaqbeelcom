import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

// Background processing — runs after the HTTP response is sent
async function processListing(listingId: string, force: boolean) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
  const supabase = createClient(supabaseUrl, serviceKey);

  console.log(`[auto-analyze:bg] start listingId=${listingId} force=${force}`);

  // Fetch the listing
  const { data: listing, error: fetchErr } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .single();

  if (fetchErr || !listing) {
    console.error(`[auto-analyze:bg] listing not found: ${listingId}`, fetchErr);
    return;
  }

  // Skip if already analyzed recently (within 1 hour) — unless force flag is set
  if (!force && listing.ai_analysis_cache) {
    const cache = listing.ai_analysis_cache as any;
    if (cache.generated_at) {
      const age = Date.now() - new Date(cache.generated_at).getTime();
      if (age < 60 * 60 * 1000) {
        console.log(`[auto-analyze:bg] skipped (recent cache) listingId=${listingId}`);
        return;
      }
    }
  }

  const invokeFunction = async (name: string, fnBody: any) => {
    const resp = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": anonKey,
      },
      body: JSON.stringify(fnBody),
    });
    const text = await resp.text();
    if (!resp.ok || !text) {
      console.error(`[auto-analyze:bg] ${name} HTTP ${resp.status} bodyLen=${text.length} bodyPreview=${text.slice(0, 300)}`);
    }
    if (!text) return { success: false, error: `empty response (status ${resp.status})` };
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error(`[auto-analyze:bg] ${name} JSON parse failed: ${(e as Error).message} bodyPreview=${text.slice(0, 300)}`);
      return { success: false, error: `invalid JSON from ${name}` };
    }
  };

  // Collect photo URLs (handle object {category:[...]}, array, or nested) + dedup
  const photoUrlSet = new Set<string>();
  const photosField = listing.photos;
  if (photosField) {
    if (Array.isArray(photosField)) {
      for (const u of photosField) {
        if (typeof u === "string" && u.startsWith("http")) photoUrlSet.add(u);
      }
    } else if (typeof photosField === "object") {
      for (const [key, urls] of Object.entries(photosField as Record<string, unknown>)) {
        if (Array.isArray(urls)) {
          for (const u of urls) {
            if (typeof u === "string" && u.startsWith("http")) photoUrlSet.add(u);
          }
        } else if (typeof urls === "string" && (urls as string).startsWith("http")) {
          photoUrlSet.add(urls as string);
        } else {
          console.log(`[auto-analyze:bg] photos.${key} unexpected type=${typeof urls}`);
        }
      }
    } else {
      console.log(`[auto-analyze:bg] photos field unexpected type=${typeof photosField}`);
    }
  }

  // Collect file URLs + dedup
  const fileUrlSet = new Set<string>();
  if (Array.isArray(listing.documents)) {
    for (const doc of listing.documents) {
      if (Array.isArray((doc as any)?.files)) {
        for (const url of (doc as any).files) {
          if (typeof url === "string" && url.startsWith("http")) fileUrlSet.add(url);
        }
      }
    }
  }

  // إعادة تصنيف: الصور المرفوعة خطأً كمستندات تُنقل إلى photoUrls
  const IMAGE_EXTS = /\.(jpg|jpeg|png|heic|heif|webp|gif|bmp|avif)(\?|$|#)/i;
  const reclassifiedImages: string[] = [];
  const trulyDocuments: string[] = [];
  for (const url of fileUrlSet) {
    if (IMAGE_EXTS.test(url)) {
      reclassifiedImages.push(url);
      photoUrlSet.add(url);
    } else {
      trulyDocuments.push(url);
    }
  }
  const fileUrls: string[] = trulyDocuments;
  // photoUrls built AFTER reclassification so re-routed images are included
  const photoUrls: string[] = Array.from(photoUrlSet);

  console.log(`[auto-analyze:bg] reclassified ${reclassifiedImages.length} images from documents → photos`);
  console.log(`[auto-analyze:bg] final: photoUrls=${photoUrls.length}, fileUrls=${fileUrls.length}`);

  if (reclassifiedImages.length > 0) {
    try {
      await supabase.from("audit_logs").insert({
        action: "images_reclassified_from_documents",
        resource_type: "listing",
        resource_id: listingId,
        details: {
          count: reclassifiedImages.length,
          sample_urls: reclassifiedImages.slice(0, 3),
        },
      });
    } catch (e) {
      console.error("Failed to log reclassification:", e);
    }
  }

  // Step 1: Detect assets
  let combinedAssets = null;
  const manualInventory = Array.isArray(listing.inventory) ? listing.inventory : [];
  const hasAnyAssetSource = photoUrls.length > 0 || fileUrls.length > 0 || manualInventory.length > 0;

  console.log(`[auto-analyze:bg] collected photoUrls=${photoUrls.length} fileUrls=${fileUrls.length} manualInventory=${manualInventory.length} photosType=${Array.isArray(photosField) ? 'array' : typeof photosField} hasAnyAssetSource=${hasAnyAssetSource}`);

  if (hasAnyAssetSource) {
    try {
      console.log(`[auto-analyze:bg] step 1: detect-assets`);
      const assetResult = await invokeFunction("detect-assets", {
        photoUrls,
        fileUrls,
        businessActivity: listing.business_activity || listing.category,
        dealPrice: listing.price || null,
        listingData: listing,
        manualInventory,
        listingId,
      });
      if (assetResult?.success && assetResult.detected) {
        combinedAssets = assetResult.detected.combined;
        await supabase.from("listings").update({
          ai_detected_assets: combinedAssets,
          ai_assets_combined: combinedAssets,
          ai_price_analysis: assetResult.detected.priceAnalysis || null,
          ai_trust_score: assetResult.detected.trustScore || null,
          ai_analysis_updated_at: new Date().toISOString(),
        }).eq("id", listingId);

        // Await price-assets (inside background task — does not affect HTTP response).
        // Previously fire-and-forget, but the request was often killed when the parent
        // worker finished, leaving inventory un-priced. With Commit 2 (B) the inventory
        // is already seeded by detect-assets, so a price-assets failure is non-fatal.
        try {
          console.log(`[auto-analyze:bg] invoking price-assets for ${listingId}`);
          const priceResp = await fetch(`${supabaseUrl}/functions/v1/price-assets`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${serviceKey}`,
              "apikey": anonKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ listing_id: listingId, force_refresh: false }),
          });

          if (!priceResp.ok) {
            const errText = await priceResp.text().catch(() => "unknown");
            console.error(
              `[auto-analyze:bg] price-assets failed status=${priceResp.status}: ${errText}`
            );
            await supabase.from("audit_logs").insert({
              action: "price_assets_failed",
              resource_type: "listing",
              resource_id: listingId,
              details: { status: priceResp.status, error: errText.slice(0, 500) },
            }).then(() => {}, () => {}); // best-effort
          } else {
            console.log(`[auto-analyze:bg] price-assets completed for ${listingId}`);
          }
        } catch (err) {
          console.error(`[auto-analyze:bg] price-assets call exception:`, err);
          await supabase.from("audit_logs").insert({
            action: "price_assets_exception",
            resource_type: "listing",
            resource_id: listingId,
            details: { error: String(err).slice(0, 500) },
          }).then(() => {}, () => {});
          // Do not rethrow — auto-analyze continues with the rest of its work.
        }
      } else if (assetResult?.error) {
        console.error("detect-assets returned error:", assetResult.error);
      }
    } catch (e) {
      console.error("Asset detection failed:", e);
    }
  }

  // Step 1.5: Classify uploaded documents
  let documentClassification = null;
  if (Array.isArray(listing.documents) && listing.documents.length > 0) {
    try {
      console.log(`[auto-analyze:bg] step 1.5: classify-documents`);
      const classifyResult = await invokeFunction("classify-documents", {
        documents: listing.documents,
      });
      if (classifyResult?.success) {
        documentClassification = classifyResult;
      }
    } catch (e) {
      console.error("Document classification failed:", e);
    }
  }

  // Step 2: Run deal check
  try {
    console.log(`[auto-analyze:bg] step 2: deal-check`);
    const listingWithAssets = {
      ...listing,
      ai_detected_assets: combinedAssets,
      ai_document_classification: documentClassification,
    };
    const dealCheckResult = await invokeFunction("deal-check", {
      listing: listingWithAssets,
      perspective: "buyer",
    });
    if (dealCheckResult?.success && dealCheckResult.analysis) {
      const cacheEntry = {
        dealCheck: dealCheckResult.analysis,
        documentClassification,
        generated_at: new Date().toISOString(),
      };
      await supabase.from("listings").update({
        ai_analysis_cache: cacheEntry,
        ai_structure_validation: dealCheckResult.analysis,
      }).eq("id", listingId);
    }
  } catch (e) {
    console.error("Deal check failed:", e);
  }

  // Step 3: Run feasibility study (skip for assets_only)
  const primaryDealType = String(listing.primary_deal_type || listing.deal_type || "").trim();
  if (primaryDealType === "assets_only") {
    console.log(`[auto-analyze:bg] skip feasibility (assets_only)`);
  } else {
    try {
      console.log(`[auto-analyze:bg] step 3: feasibility-study`);
      const feasResult = await invokeFunction("feasibility-study", { listing });
      if (feasResult?.success && feasResult.study) {
        await supabase.from("feasibility_studies").upsert({
          listing_id: listingId,
          requested_by: listing.owner_id,
          study_data: feasResult.study,
          last_updated_at: new Date().toISOString(),
        }, { onConflict: "listing_id" });

        const { data: current } = await supabase
          .from("listings")
          .select("ai_analysis_cache")
          .eq("id", listingId)
          .single();

        const existingCache = (current?.ai_analysis_cache as any) || {};
        await supabase.from("listings").update({
          ai_analysis_cache: {
            ...existingCache,
            feasibility: feasResult.study,
            generated_at: new Date().toISOString(),
          },
        }).eq("id", listingId);
      }
    } catch (e) {
      console.error("Feasibility study failed:", e);
    }
  }

  console.log(`[auto-analyze:bg] completed listingId=${listingId}`);

  // Log success to audit_logs
  try {
    await supabase.from("audit_logs").insert({
      action: "auto_analyze_background_completed",
      resource_type: "listing",
      resource_id: listingId,
      details: { completed_at: new Date().toISOString() },
    });
  } catch (e) {
    console.error("Failed to write completion audit log:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { listingId, force } = body;
    if (!listingId) {
      return new Response(JSON.stringify({ error: "listingId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Background processing — wrap in error handler so failures get logged
    const work = (async () => {
      try {
        await processListing(listingId, !!force);
      } catch (e) {
        console.error("[auto-analyze:bg] background processing failed:", e);
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const supabase = createClient(supabaseUrl, serviceKey);
          await supabase.from("audit_logs").insert({
            action: "auto_analyze_background_failed",
            resource_type: "listing",
            resource_id: listingId,
            details: { error: String((e as Error)?.message || e) },
          });
        } catch (logErr) {
          console.error("Failed to write failure audit log:", logErr);
        }
      }
    })();

    // @ts-ignore - EdgeRuntime global is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(work);

    return new Response(
      JSON.stringify({ status: "queued", listing_id: listingId }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Auto-analyze error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
