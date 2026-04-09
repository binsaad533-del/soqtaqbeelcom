import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Extracts relevant page data (listing, deal, dashboard summary, etc.)
 * so the AI assistant can be fully context-aware.
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
      data.area_sqm != null ? `المساحة: ${data.area_sqm} متر مربع` : "",
    ];

    if (data.inventory && Array.isArray(data.inventory) && (data.inventory as any[]).length > 0) {
      lines.push(`المعدات والأصول: ${(data.inventory as any[]).map((i: any) => `${i.name} (${i.qty})`).join("، ")}`);
    }

    if (data.deal_disclosures && typeof data.deal_disclosures === "object") {
      const disc = data.deal_disclosures as Record<string, any>;
      const discLines = Object.entries(disc)
        .filter(([, v]) => v != null && v !== "")
        .map(([k, v]) => `  ${k}: ${v}`);
      if (discLines.length > 0) lines.push(`الإفصاحات:`, ...discLines);
    }

    if (data.ai_summary) lines.push(`ملخص ذكي: ${data.ai_summary}`);
    if (data.ai_rating) lines.push(`تقييم ذكي: ${data.ai_rating}`);

    lines.push(`---`);
    lines.push(`ملاحظة: كل هذه البيانات متوفرة لك. لا تسأل المستخدم عنها. حلل وأجب مباشرة.`);

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

  const fetchDashboardSummary = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "";

    const lines: string[] = [`--- ملخص لوحة التحكم ---`];

    try {
      // My listings
      const { data: listings } = await supabase
        .from("listings")
        .select("id, title, status, price, city, category")
        .eq("owner_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(10);

      if (listings && listings.length > 0) {
        lines.push(`إعلاناتك (${listings.length}):`);
        listings.forEach((l, i) => {
          lines.push(`  ${i + 1}. ${l.title || "بدون عنوان"} - ${l.status} - ${l.price?.toLocaleString() || "بدون سعر"} ريال - ${l.city || ""}`);
        });
      } else {
        lines.push("ما عندك إعلانات حالياً");
      }

      // Pending offers on my listings
      if (listings && listings.length > 0) {
        const ids = listings.map(l => l.id);
        const { data: offers } = await supabase
          .from("listing_offers")
          .select("id, offered_price, status, listing_id, created_at")
          .in("listing_id", ids)
          .eq("status", "pending")
          .limit(10);

        if (offers && offers.length > 0) {
          lines.push(`\nعروض معلّقة (${offers.length}):`);
          offers.forEach((o, i) => {
            const listing = listings.find(l => l.id === o.listing_id);
            lines.push(`  ${i + 1}. عرض ${o.offered_price.toLocaleString()} ريال على "${listing?.title || "إعلان"}" - بانتظار ردّك`);
          });
        }
      }

      // My active deals
      const { data: deals } = await supabase
        .from("deals")
        .select("id, status, agreed_price, deal_type, listing_id")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .not("status", "eq", "completed")
        .not("status", "eq", "cancelled")
        .limit(5);

      if (deals && deals.length > 0) {
        lines.push(`\nصفقات نشطة (${deals.length}):`);
        deals.forEach((d, i) => {
          lines.push(`  ${i + 1}. صفقة ${d.agreed_price?.toLocaleString() || "—"} ريال - الحالة: ${d.status}`);
        });
      }
    } catch (e) {
      console.error("Dashboard summary fetch error:", e);
    }

    lines.push(`---`);
    lines.push(`ملاحظة: هذا ملخص بيانات المستخدم الحالي. استخدمها للإجابة على أسئلته مباشرة.`);

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
      } else if (pathname === "/dashboard" || pathname.startsWith("/dashboard/") || pathname === "/seller-dashboard") {
        result = await fetchDashboardSummary();
      }

      if (!cancelled) {
        setPageData(result);
        setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [pathname, fetchListingData, fetchDealData, fetchDashboardSummary]);

  return { pageData, loading };
}
