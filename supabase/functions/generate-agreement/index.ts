import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { dealId, agreementData } = await req.json();
    if (!dealId || !agreementData) {
      return new Response(JSON.stringify({ error: "Missing dealId or agreementData" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current version count
    const { count } = await supabase
      .from("deal_agreements")
      .select("*", { count: "exact", head: true })
      .eq("deal_id", dealId);

    const version = (count || 0) + 1;
    const timestamp = Date.now();
    const agreementNumber = `AGR-${timestamp}-V${version}`;

    // Insert agreement record
    const { data: agreement, error: insertError } = await supabase
      .from("deal_agreements")
      .insert({
        deal_id: dealId,
        version,
        agreement_number: agreementNumber,
        buyer_name: agreementData.buyerName,
        buyer_contact: agreementData.buyerContact,
        seller_name: agreementData.sellerName,
        seller_contact: agreementData.sellerContact,
        deal_title: agreementData.dealTitle,
        deal_type: agreementData.dealType,
        location: agreementData.location,
        business_activity: agreementData.businessActivity,
        included_assets: agreementData.includedAssets || [],
        excluded_assets: agreementData.excludedAssets || [],
        financial_terms: agreementData.financialTerms || {},
        declarations: agreementData.declarations || {},
        documents_referenced: agreementData.documentsReferenced || [],
        liabilities: agreementData.liabilities || {},
        important_notes: agreementData.importantNotes || [],
        license_status: agreementData.licenseStatus || {},
        lease_details: agreementData.leaseDetails || {},
        previous_version_id: agreementData.previousVersionId || null,
        amendment_reason: agreementData.amendmentReason || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lock the deal
    await supabase
      .from("deals")
      .update({ status: "completed", locked: true, completed_at: new Date().toISOString() })
      .eq("id", dealId);

    // Record history
    await supabase.from("deal_history").insert({
      deal_id: dealId,
      action: version === 1 ? "agreement_created" : "agreement_amended",
      actor_id: agreementData.actorId,
      details: { agreement_id: agreement.id, version, agreement_number: agreementNumber },
    });

    return new Response(JSON.stringify({ success: true, agreement }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-agreement error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
