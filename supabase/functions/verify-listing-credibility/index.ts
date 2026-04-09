import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { listing_id } = await req.json();
    if (!listing_id) throw new Error("listing_id is required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch listing data
    const { data: listing, error } = await supabaseAdmin
      .from("listings")
      .select("*")
      .eq("id", listing_id)
      .single();

    if (error || !listing) throw new Error("Listing not found");

    // Fetch seller profile
    const { data: seller } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("user_id", listing.owner_id)
      .single();

    // Fetch seller's deal history
    const { count: completedDeals } = await supabaseAdmin
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", listing.owner_id)
      .eq("status", "completed");

    // Fetch seller reviews
    const { data: reviews } = await supabaseAdmin
      .from("seller_reviews")
      .select("overall_experience, honesty, listing_accuracy")
      .eq("seller_id", listing.owner_id);

    // Calculate credibility score
    const checks: { name: string; score: number; max: number; details: string; status: string }[] = [];

    // 1. Data completeness (20 points)
    let dataScore = 0;
    const requiredFields = ["title", "description", "price", "city", "business_activity"];
    const filledFields = requiredFields.filter(f => listing[f] && String(listing[f]).trim());
    dataScore = Math.round((filledFields.length / requiredFields.length) * 12);
    if (listing.photos && Object.keys(listing.photos).length > 0) dataScore += 4;
    if (listing.location_lat && listing.location_lng) dataScore += 4;
    checks.push({
      name: "اكتمال البيانات",
      score: dataScore,
      max: 20,
      details: `${filledFields.length}/${requiredFields.length} حقل أساسي مكتمل`,
      status: dataScore >= 16 ? "pass" : dataScore >= 10 ? "warning" : "fail"
    });

    // 2. Disclosure transparency (20 points)
    let disclosureScore = 0;
    const disclosures = listing.deal_disclosures || {};
    const disclosureFields = ["liabilities", "overdue_salaries", "overdue_rent", "municipality_license", "civil_defense_license", "surveillance_cameras"];
    const disclosedCount = disclosureFields.filter(f => listing[f] !== null && listing[f] !== undefined && listing[f] !== "").length;
    disclosureScore = Math.round((disclosedCount / disclosureFields.length) * 20);
    checks.push({
      name: "شفافية الإفصاحات",
      score: disclosureScore,
      max: 20,
      details: `${disclosedCount}/${disclosureFields.length} إفصاح مكتمل`,
      status: disclosureScore >= 16 ? "pass" : disclosureScore >= 10 ? "warning" : "fail"
    });

    // 3. Price reasonability (20 points)
    let priceScore = 15; // default reasonable
    if (listing.ai_price_analysis) {
      const priceAnalysis = listing.ai_price_analysis as any;
      if (priceAnalysis.assessment === "fair") priceScore = 20;
      else if (priceAnalysis.assessment === "overpriced") priceScore = 8;
      else if (priceAnalysis.assessment === "excellent_opportunity") priceScore = 18;
      else if (priceAnalysis.assessment === "suspicious") priceScore = 3;
    }
    checks.push({
      name: "عدالة السعر",
      score: priceScore,
      max: 20,
      details: priceScore >= 15 ? "السعر ضمن النطاق المعقول" : priceScore >= 8 ? "السعر يحتاج مراجعة" : "السعر مريب",
      status: priceScore >= 15 ? "pass" : priceScore >= 8 ? "warning" : "fail"
    });

    // 4. Seller reputation (25 points)
    let sellerScore = 5; // base
    if (seller?.is_verified) sellerScore += 5;
    if (seller?.verification_level === "full") sellerScore += 5;
    if ((completedDeals || 0) > 0) sellerScore += Math.min((completedDeals || 0) * 3, 10);
    if (reviews && reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + (r.overall_experience + r.honesty + r.listing_accuracy) / 3, 0) / reviews.length;
      if (avgRating >= 4) sellerScore = Math.min(sellerScore + 5, 25);
    }
    sellerScore = Math.min(sellerScore, 25);
    checks.push({
      name: "سمعة البائع",
      score: sellerScore,
      max: 25,
      details: seller?.is_verified ? `بائع موثق — ${completedDeals || 0} صفقة مكتملة` : "بائع غير موثق بعد",
      status: sellerScore >= 18 ? "pass" : sellerScore >= 10 ? "warning" : "fail"
    });

    // 5. Asset verification (15 points)
    let assetScore = 5;
    if (listing.ai_detected_assets || listing.ai_assets_combined) {
      assetScore += 5;
      if (listing.ai_detected_assets_images && listing.ai_detected_assets_files) {
        assetScore += 5; // cross-verified from multiple sources
      }
    }
    checks.push({
      name: "التحقق من الأصول",
      score: assetScore,
      max: 15,
      details: assetScore >= 10 ? "تم التحقق من الأصول عبر مصادر متعددة" : "تحقق جزئي من الأصول",
      status: assetScore >= 10 ? "pass" : assetScore >= 5 ? "warning" : "fail"
    });

    const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
    const maxScore = checks.reduce((sum, c) => sum + c.max, 0);
    const percentage = Math.round((totalScore / maxScore) * 100);

    let grade: string;
    let label: string;
    if (percentage >= 85) { grade = "excellent"; label = "موثوق جداً"; }
    else if (percentage >= 70) { grade = "good"; label = "موثوق"; }
    else if (percentage >= 50) { grade = "moderate"; label = "متوسط"; }
    else { grade = "low"; label = "يحتاج تحقق"; }

    // Fraud flags
    const flags: string[] = [];
    if (listing.price && listing.price < 1000) flags.push("سعر منخفض بشكل مريب");
    if (!listing.photos || Object.keys(listing.photos || {}).length === 0) flags.push("لا توجد صور");
    if (!seller?.is_verified && listing.price && listing.price > 500000) flags.push("صفقة كبيرة من بائع غير موثق");
    if (listing.fraud_score && listing.fraud_score > 50) flags.push("تم رصد مؤشرات احتيال");

    const result = {
      listing_id,
      score: percentage,
      grade,
      label,
      checks,
      flags,
      verified_at: new Date().toISOString(),
    };

    // Cache the result on the listing
    await supabaseAdmin
      .from("listings")
      .update({
        ai_trust_score: result,
        ai_analysis_updated_at: new Date().toISOString(),
      })
      .eq("id", listing_id);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("credibility error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
