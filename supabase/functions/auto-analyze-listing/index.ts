import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { listingId, force } = body;
    if (!listingId) {
      return new Response(JSON.stringify({ error: "listingId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch the listing
    const { data: listing, error: fetchErr } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .single();

    if (fetchErr || !listing) {
      return new Response(JSON.stringify({ error: "Listing not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip if already analyzed recently (within 1 hour) — unless force flag is set
    if (!force && listing.ai_analysis_cache) {
      const cache = listing.ai_analysis_cache as any;
      if (cache.generated_at) {
        const age = Date.now() - new Date(cache.generated_at).getTime();
        if (age < 60 * 60 * 1000) {
          return new Response(JSON.stringify({ success: true, skipped: true, reason: "recent_cache" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

    // Helper to invoke edge functions internally
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
      return resp.json();
    };

    // Collect photo URLs
    const photoUrls: string[] = [];
    if (listing.photos && typeof listing.photos === "object") {
      for (const urls of Object.values(listing.photos as Record<string, string[]>)) {
        if (Array.isArray(urls)) {
          for (const u of urls) {
            if (typeof u === "string" && u.startsWith("http")) photoUrls.push(u);
          }
        }
      }
    }

    // Collect file URLs
    const fileUrls: string[] = [];
    if (Array.isArray(listing.documents)) {
      for (const doc of listing.documents) {
        if (Array.isArray((doc as any)?.files)) {
          for (const url of (doc as any).files) {
            if (typeof url === "string" && url.startsWith("http")) fileUrls.push(url);
          }
        }
      }
    }

    // Step 1: Detect assets (includes price analysis + trust score)
    // FIX: Pass manualInventory + listingData fully so engine can valuate even without photos
    let combinedAssets = null;
    let assetDetectionPayload: any = null;
    const manualInventory = Array.isArray(listing.inventory) ? listing.inventory : [];
    const hasAnyAssetSource = photoUrls.length > 0 || fileUrls.length > 0 || manualInventory.length > 0;

    if (hasAnyAssetSource) {
      try {
        const assetResult = await invokeFunction("detect-assets", {
          photoUrls,
          fileUrls,
          businessActivity: listing.business_activity || listing.category,
          dealPrice: listing.price || null,
          listingData: listing,
          manualInventory,
        });
        if (assetResult?.success && assetResult.detected) {
          combinedAssets = assetResult.detected.combined;
          assetDetectionPayload = assetResult.detected;
          // Persist full asset detection (incl. price range + trust score) to listing
          await supabase.from("listings").update({
            ai_detected_assets: combinedAssets,
            ai_assets_combined: combinedAssets,
            ai_price_analysis: assetResult.detected.priceAnalysis || null,
            ai_trust_score: assetResult.detected.trustScore || null,
            ai_analysis_updated_at: new Date().toISOString(),
          }).eq("id", listingId);
        } else if (assetResult?.error) {
          console.error("detect-assets returned error:", assetResult.error);
        }
      } catch (e) {
        console.error("Asset detection failed:", e);
      }
    }

    // Step 1.5: Classify uploaded documents to verify slot/content match
    let documentClassification = null;
    if (Array.isArray(listing.documents) && listing.documents.length > 0) {
      try {
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

    // Step 3: Run feasibility study
    // Guard #1: Skip feasibility for "assets_only" deals — economic feasibility
    // does not apply to pure asset sales (no operational business to project).
    const primaryDealType = String(listing.primary_deal_type || listing.deal_type || "").trim();
    if (primaryDealType === "assets_only") {
      console.log(`Skipping feasibility-study: primary_deal_type="${primaryDealType}" (assets_only deals are not eligible).`);
    } else try {
      const feasResult = await invokeFunction("feasibility-study", { listing });
      if (feasResult?.success && feasResult.study) {
        // Save to feasibility_studies table
        await supabase.from("feasibility_studies").upsert({
          listing_id: listingId,
          requested_by: listing.owner_id,
          study_data: feasResult.study,
          last_updated_at: new Date().toISOString(),
        }, { onConflict: "listing_id" });

        // Update cache
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

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Auto-analyze error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
