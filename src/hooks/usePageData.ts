import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Extracts relevant page data (listing, deal, etc.) based on the current route
 * so the AI assistant can be context-aware without asking the user for info.
 */
export function usePageData() {
  const { pathname } = useLocation();
  const [pageData, setPageData] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const fetchListingData = useCallback(async (id: string) => {
    const { data } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
    if (!data) return "";

    const lines: string[] = [
      `--- بيانات الإعلان الحالي ---`,
      data.title ? `العنوان: ${data.title}` : "",
      data.category ? `النشاط: ${data.category}` : "",
      data.business_activity ? `وصف النشاط: ${data.business_activity}` : "",
      data.city ? `المدينة: ${data.city}` : "",
      data.district ? `الحي: ${data.district}` : "",
      data.price != null ? `السعر: ${data.price.toLocaleString()} ريال` : "",
      data.annual_rent != null ? `الإيجار السنوي: ${data.annual_rent.toLocaleString()} ريال` : "",
      data.lease_remaining ? `المتبقي من العقد: ${data.lease_remaining}` : "",
      data.lease_duration ? `مدة العقد: ${data.lease_duration}` : "",
      data.deal_type ? `نوع الصفقة: ${data.deal_type}` : "",
      data.description ? `الوصف: ${data.description}` : "",
      data.municipality_license ? `رخصة البلدية: ${data.municipality_license}` : "",
      data.civil_defense_license ? `رخصة الدفاع المدني: ${data.civil_defense_license}` : "",
      data.overdue_rent ? `إيجار متأخر: ${data.overdue_rent}` : "",
      data.overdue_salaries ? `رواتب متأخرة: ${data.overdue_salaries}` : "",
      data.liabilities ? `التزامات: ${data.liabilities}` : "",
      data.surveillance_cameras ? `كاميرات مراقبة: ${data.surveillance_cameras}` : "",
    ];

    if (data.inventory && Array.isArray(data.inventory) && (data.inventory as any[]).length > 0) {
      lines.push(`المعدات والأصول: ${(data.inventory as any[]).map((i: any) => `${i.name} (${i.qty})`).join("، ")}`);
    }

    if (data.deal_disclosures && typeof data.deal_disclosures === "object") {
      const disc = data.deal_disclosures as Record<string, any>;
      const discLines = Object.entries(disc)
        .filter(([, v]) => v != null && v !== "")
        .map(([k, v]) => `  ${k}: ${v}`);
      if (discLines.length > 0) {
        lines.push(`الإفصاحات:`, ...discLines);
      }
    }

    if (data.ai_summary) lines.push(`ملخص ذكي: ${data.ai_summary}`);
    if (data.ai_rating) lines.push(`تقييم ذكي: ${data.ai_rating}`);

    lines.push(`---`);
    lines.push(`ملاحظة: كل هذه البيانات متوفرة لك من الإعلان مباشرة. لا تسأل المستخدم عنها. حلل وأجب مباشرة بناءً عليها.`);

    return lines.filter(Boolean).join("\n");
  }, []);

  const fetchDealData = useCallback(async (dealId: string) => {
    const { data: deal } = await supabase.from("deals").select("*").eq("id", dealId).maybeSingle();
    if (!deal) return "";

    const { data: listing } = deal.listing_id
      ? await supabase.from("listings").select("title, price, category, city, district, business_activity, description").eq("id", deal.listing_id).maybeSingle()
      : { data: null };

    const lines: string[] = [
      `--- بيانات الصفقة الحالية ---`,
      `حالة الصفقة: ${deal.status}`,
      deal.agreed_price != null ? `السعر المتفق عليه: ${deal.agreed_price.toLocaleString()} ريال` : "",
      deal.deal_type ? `نوع الصفقة: ${deal.deal_type}` : "",
      deal.risk_score != null ? `درجة المخاطر: ${deal.risk_score}%` : "",
    ];

    if (listing) {
      lines.push(
        listing.title ? `اسم الفرصة: ${listing.title}` : "",
        listing.price != null ? `السعر المعروض: ${listing.price.toLocaleString()} ريال` : "",
        listing.category ? `النشاط: ${listing.category}` : "",
        listing.city ? `المدينة: ${listing.city}` : "",
        listing.description ? `الوصف: ${listing.description}` : "",
      );
    }

    lines.push(`---`);
    lines.push(`ملاحظة: كل هذه البيانات متوفرة لك. لا تسأل المستخدم عنها. حلل وأجب مباشرة.`);

    return lines.filter(Boolean).join("\n");
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      let result = "";

      if (pathname.startsWith("/listing/")) {
        const id = pathname.split("/")[2];
        if (id) result = await fetchListingData(id);
      } else if (pathname.startsWith("/negotiate/")) {
        const id = pathname.split("/")[2];
        if (id) result = await fetchDealData(id);
      } else if (pathname.startsWith("/agreement/")) {
        const id = pathname.split("/")[2];
        if (id) result = await fetchDealData(id);
      }

      if (!cancelled) {
        setPageData(result);
        setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [pathname, fetchListingData, fetchDealData]);

  return { pageData, loading };
}
