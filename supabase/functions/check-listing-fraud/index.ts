import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { listing_id } = await req.json();
    if (!listing_id) throw new Error("listing_id required");

    const { data: listing, error } = await admin.from("listings").select("*").eq("id", listing_id).single();
    if (error || !listing) throw new Error("Listing not found");

    const flags: Array<{
      user_id: string;
      listing_id: string;
      flag_type: string;
      severity: string;
      details: Record<string, unknown>;
    }> = [];
    let fraudIncrement = 0;

    // 1) Abnormal pricing
    if (listing.price !== null) {
      if (listing.price < 1000) {
        flags.push({
          user_id: listing.owner_id,
          listing_id,
          flag_type: "abnormal_pricing",
          severity: "high",
          details: { price: listing.price, reason: "price_below_1000" },
        });
        fraudIncrement += 15;
      } else if (listing.price > 50_000_000) {
        flags.push({
          user_id: listing.owner_id,
          listing_id,
          flag_type: "abnormal_pricing",
          severity: "medium",
          details: { price: listing.price, reason: "price_above_50m" },
        });
        fraudIncrement += 10;
      }
    }

    // 2) Spam: >5 listings in 24h
    const oneDayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { count: dayCount } = await admin
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", listing.owner_id)
      .gte("created_at", oneDayAgo);

    if ((dayCount || 0) > 5) {
      flags.push({
        user_id: listing.owner_id,
        listing_id,
        flag_type: "spam_listing",
        severity: "high",
        details: { listings_in_24h: dayCount },
      });
      fraudIncrement += 20;
    }

    // 3) New account publishing (< 24h old)
    const { data: profile } = await admin
      .from("profiles")
      .select("created_at, is_verified, fraud_score")
      .eq("user_id", listing.owner_id)
      .single();

    if (profile) {
      const accountAge = Date.now() - new Date(profile.created_at).getTime();
      if (accountAge < 24 * 3600_000) {
        flags.push({
          user_id: listing.owner_id,
          listing_id,
          flag_type: "new_account_publish",
          severity: "medium",
          details: { account_age_hours: Math.round(accountAge / 3600_000) },
        });
        fraudIncrement += 10;
      }

      // 4) Unverified phone trying to publish → block
      if (!profile.is_verified) {
        flags.push({
          user_id: listing.owner_id,
          listing_id,
          flag_type: "suspicious_account",
          severity: "high",
          details: { reason: "unverified_phone_publish" },
        });
        fraudIncrement += 15;
      }
    }

    // 5) Duplicate text detection (title similarity > 80%)
    if (listing.title) {
      const { data: otherListings } = await admin
        .from("listings")
        .select("id, title, description")
        .neq("id", listing_id)
        .eq("status", "published")
        .not("title", "is", null)
        .limit(100);

      if (otherListings) {
        const normalize = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
        const listingTitle = normalize(listing.title);
        
        for (const other of otherListings) {
          if (!other.title) continue;
          const otherTitle = normalize(other.title);
          // Simple similarity: shared chars / max length
          const maxLen = Math.max(listingTitle.length, otherTitle.length);
          if (maxLen === 0) continue;
          let shared = 0;
          const shorter = listingTitle.length <= otherTitle.length ? listingTitle : otherTitle;
          const longer = listingTitle.length > otherTitle.length ? listingTitle : otherTitle;
          if (longer.includes(shorter) && shorter.length > 10) {
            shared = shorter.length;
          }
          const similarity = shared / maxLen;
          if (similarity > 0.8) {
            flags.push({
              user_id: listing.owner_id,
              listing_id,
              flag_type: "duplicate_text",
              severity: "medium",
              details: { similar_listing_id: other.id, similarity: Math.round(similarity * 100) },
            });
            fraudIncrement += 10;
            break; // one is enough
          }
        }
      }
    }

    // Insert flags
    if (flags.length > 0) {
      await admin.from("fraud_flags").insert(flags);

      // Update user fraud_score
      const newScore = Math.min((profile?.fraud_score || 0) + fraudIncrement, 100);
      await admin.from("profiles").update({ fraud_score: newScore }).eq("user_id", listing.owner_id);

      // Update listing fraud metadata
      await admin.from("listings").update({
        fraud_flags: flags.map(f => f.flag_type),
        fraud_score: Math.min((listing.fraud_score || 0) + fraudIncrement, 100),
      }).eq("id", listing_id);

      // Notify supervisors
      const { data: supervisors } = await admin
        .from("user_roles")
        .select("user_id")
        .in("role", ["platform_owner", "supervisor"]);

      if (supervisors && supervisors.length > 0) {
        const notifications = supervisors.map((s: any) => ({
          user_id: s.user_id,
          title: "تنبيه احتيال — إعلان جديد",
          body: `إعلان "${listing.title || "بدون عنوان"}" يحتوي على ${flags.length} تنبيه احتيال`,
          type: "security",
          reference_type: "listing",
          reference_id: listing_id,
        }));
        await admin.from("notifications").insert(notifications);
      }

      // If fraud_score > 50, mark listing as needing review
      if (newScore > 50) {
        await admin.from("listings").update({ status: "draft" }).eq("id", listing_id);
      }
    }

    return new Response(
      JSON.stringify({ flags_count: flags.length, flags }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Fraud check error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
