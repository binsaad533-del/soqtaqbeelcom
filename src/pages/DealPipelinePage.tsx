import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { DEAL_TYPE_LABELS } from "@/lib/translations";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { useSEO } from "@/hooks/useSEO";
import {
  ArrowLeftRight,
  Search,
  Filter,
  Eye,
  User,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Handshake,
  FileText,
  Store,
  Heart,
  MessageSquare,
  CreditCard,
  ArrowRightLeft,
  Lock,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* ── 8 pipeline stages — gradient: gray → blue → green ── */
const PIPELINE_COLUMNS = [
  { id: "listing",       label: "الإعلان",     desc: "إعلانات جديدة بانتظار الاهتمام",        icon: Store,          color: "text-slate-400",    accent: "hsl(220, 10%, 65%)",  action: "عرض الإعلان",    actionRoute: (d: PipelineDeal) => `/listing/${d.listing_id}` },
  { id: "interest",      label: "الاهتمام",    desc: "عروض أسعار مقدّمة من المشترين",          icon: Heart,          color: "text-slate-500",    accent: "hsl(220, 15%, 55%)",  action: "مراجعة العروض",  actionRoute: (d: PipelineDeal) => `/listing/${d.listing_id}` },
  { id: "communication", label: "التواصل",     desc: "محادثات جارية بين الأطراف",              icon: MessageSquare,  color: "text-blue-400",     accent: "hsl(210, 60%, 60%)",  action: "فتح المحادثة",   actionRoute: (d: PipelineDeal) => `/negotiate/${d.id}` },
  { id: "negotiation",   label: "التفاوض",     desc: "مفاوضات نشطة على السعر والشروط",         icon: Handshake,      color: "text-blue-500",     accent: "hsl(210, 70%, 50%)",  action: "متابعة التفاوض", actionRoute: (d: PipelineDeal) => `/negotiate/${d.id}` },
  { id: "agreement",     label: "الاتفاقية",   desc: "تم إعداد الاتفاقية بانتظار التوقيع",     icon: FileText,       color: "text-blue-600",     accent: "hsl(200, 70%, 45%)",  action: "عرض الاتفاقية",  actionRoute: (d: PipelineDeal) => `/agreement/${d.id}` },
  { id: "payment",       label: "الدفع",       desc: "بانتظار تأكيد الدفع والعمولة",           icon: CreditCard,     color: "text-cyan-500",     accent: "hsl(180, 60%, 42%)",  action: "تفاصيل الدفع",   actionRoute: (d: PipelineDeal) => `/negotiate/${d.id}` },
  { id: "transfer",      label: "النقل",       desc: "جاري نقل الملكية والأصول",               icon: ArrowRightLeft, color: "text-emerald-500",  accent: "hsl(155, 60%, 42%)",  action: "متابعة النقل",   actionRoute: (d: PipelineDeal) => `/negotiate/${d.id}` },
  { id: "closed",        label: "مُغلقة",      desc: "صفقات مكتملة أو ملغاة",                  icon: Lock,           color: "text-green-600",    accent: "hsl(140, 65%, 38%)",  action: "عرض الملخص",     actionRoute: (d: PipelineDeal) => `/negotiate/${d.id}` },
] as const;

type ColumnId = (typeof PIPELINE_COLUMNS)[number]["id"];

interface PipelineDeal {
  id: string;
  listing_id: string;
  buyer_id: string | null;
  seller_id: string | null;
  status: string;
  deal_type: string | null;
  agreed_price: number | null;
  locked: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  risk_score: number | null;
  listing_title?: string;
  buyer_name?: string;
  seller_name?: string;
  has_agreement?: boolean;
  has_offer?: boolean;
  has_messages?: boolean;
}

/**
 * Maps deal DB state → 8-stage pipeline column.
 * Logic derives the stage from status + related data flags.
 */
function mapToStage(deal: PipelineDeal): ColumnId {
  const s = deal.status;
  // Terminal states
  if (s === "completed" || s === "finalized") return "closed";
  if (s === "cancelled" || s === "rejected") return "closed";

  // Has agreement → payment or transfer stage
  if (deal.has_agreement && deal.locked) return "transfer";
  if (deal.has_agreement) return "agreement";

  // Confirmed / locked without agreement → payment
  if (deal.locked || s === "confirmed") return "payment";

  // Negotiating with agreed price → negotiation
  if (s === "negotiating" && deal.agreed_price && deal.agreed_price > 0) return "negotiation";

  // Has messages → communication
  if (deal.has_messages) return "communication";

  // Has offer → interest
  if (deal.has_offer) return "interest";

  // Default → listing stage
  return "listing";
}

function formatPrice(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("ar-SA") + " ر.س";
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return "اليوم";
  if (days === 1) return "أمس";
  if (days < 30) return `منذ ${days} يوم`;
  return `منذ ${Math.floor(days / 30)} شهر`;
}

const DealPipelinePage = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useSEO({
    title: "مسار الصفقات | سوق تقبيل",
    description: "تتبع مسار الصفقات من الإعلان حتى الإغلاق عبر 8 مراحل",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: dealsData, error } = await supabase
        .from("deals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const dealIds = (dealsData || []).map((d) => d.id);
      const buyerIds = [...new Set((dealsData || []).map((d) => d.buyer_id).filter(Boolean))] as string[];
      const sellerIds = [...new Set((dealsData || []).map((d) => d.seller_id).filter(Boolean))] as string[];
      const allUserIds = [...new Set([...buyerIds, ...sellerIds])];
      const listingIds = [...new Set((dealsData || []).map((d) => d.listing_id).filter(Boolean))];

      // Parallel fetches
      const [profilesRes, listingsRes, agreementsRes, offersRes, messagesRes] = await Promise.all([
        allUserIds.length ? supabase.from("profiles").select("user_id, full_name").in("user_id", allUserIds) : { data: [] },
        listingIds.length ? supabase.from("listings").select("id, title").in("id", listingIds) : { data: [] },
        dealIds.length ? supabase.from("deal_agreements").select("deal_id").in("deal_id", dealIds) : { data: [] },
        listingIds.length ? supabase.from("listing_offers").select("listing_id").in("listing_id", listingIds) : { data: [] },
        dealIds.length ? supabase.from("negotiation_messages").select("deal_id").in("deal_id", dealIds).limit(500) : { data: [] },
      ]);

      const profileMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p.full_name || "—"]));
      const listingMap = new Map((listingsRes.data || []).map((l) => [l.id, l.title || "بدون عنوان"]));
      const agreementDealIds = new Set((agreementsRes.data || []).map((a) => a.deal_id));
      const offerListingIds = new Set((offersRes.data || []).map((o) => o.listing_id));
      const messageDealIds = new Set((messagesRes.data || []).map((m) => m.deal_id));

      const enriched: PipelineDeal[] = (dealsData || []).map((d) => ({
        ...d,
        listing_title: listingMap.get(d.listing_id) || "—",
        buyer_name: d.buyer_id ? profileMap.get(d.buyer_id) || "—" : "—",
        seller_name: d.seller_id ? profileMap.get(d.seller_id) || "—" : "—",
        has_agreement: agreementDealIds.has(d.id),
        has_offer: offerListingIds.has(d.listing_id),
        has_messages: messageDealIds.has(d.id),
      }));

      setDeals(enriched);
    } catch (err) {
      console.error("[DealPipeline] load error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("deal-pipeline-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const filtered = useMemo(() => {
    let result = deals;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (d) =>
          d.listing_title?.toLowerCase().includes(q) ||
          d.buyer_name?.toLowerCase().includes(q) ||
          d.seller_name?.toLowerCase().includes(q) ||
          d.id.includes(q)
      );
    }
    if (typeFilter !== "all") {
      result = result.filter((d) => d.deal_type === typeFilter);
    }
    return result;
  }, [deals, search, typeFilter]);

  const columns = useMemo(() => {
    const map: Record<ColumnId, PipelineDeal[]> = {
      listing: [], interest: [], communication: [], negotiation: [],
      agreement: [], payment: [], transfer: [], closed: [],
    };
    filtered.forEach((d) => { map[mapToStage(d)].push(d); });
    return map;
  }, [filtered]);

  const dealTypes = useMemo(() => {
    return Array.from(new Set(deals.map((d) => d.deal_type).filter(Boolean) as string[]));
  }, [deals]);

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      if (!result.destination) return;
      const destCol = result.destination.droppableId as ColumnId;
      const dealId = result.draggableId;
      const deal = deals.find((d) => d.id === dealId);
      if (!deal) return;
      if (mapToStage(deal) === destCol) return;

      // Determine new DB status based on target column
      const colToStatus: Partial<Record<ColumnId, string>> = {
        listing: "negotiating",
        interest: "negotiating",
        communication: "negotiating",
        negotiation: "negotiating",
        agreement: "negotiating",
        payment: "confirmed",
        transfer: "confirmed",
        closed: "completed",
      };

      const newStatus = colToStatus[destCol] || "negotiating";
      const shouldLock = ["payment", "transfer", "closed"].includes(destCol);

      setDeals((prev) =>
        prev.map((d) =>
          d.id === dealId
            ? { ...d, status: newStatus, locked: shouldLock, completed_at: destCol === "closed" ? new Date().toISOString() : d.completed_at }
            : d
        )
      );

      const updateData: Record<string, unknown> = { status: newStatus, locked: shouldLock };
      if (destCol === "closed") updateData.completed_at = new Date().toISOString();

      const { error } = await supabase.from("deals").update(updateData).eq("id", dealId);
      if (error) { console.error("[DealPipeline] drag error", error); load(); }
    },
    [deals, load]
  );

  return (
    <div className="container mx-auto py-6 space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مسار الصفقات</h1>
          <p className="text-sm text-muted-foreground mt-1">8 مراحل: من الإعلان حتى الإغلاق</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <Link to="/escrow" className="flex items-center gap-1.5">
              <Shield className="h-4 w-4" />
              نظام الضمان
            </Link>
          </Button>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="بحث..." className="pr-9 w-48" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 ml-1" />
              <SelectValue placeholder="نوع الصفقة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأنواع</SelectItem>
              {dealTypes.map((dt) => (
                <SelectItem key={dt} value={dt}>{DEAL_TYPE_LABELS[dt] || dt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stage progress bar */}
      <div className="flex items-center gap-0 overflow-x-auto pb-2">
        {PIPELINE_COLUMNS.map((col, i) => {
          const Icon = col.icon;
          const count = columns[col.id].length;
          return (
            <div key={col.id} className="flex items-center">
              <div className="flex flex-col items-center min-w-[90px]">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 ${
                    count > 0 ? "border-primary bg-primary/10" : "border-border bg-muted/50"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${count > 0 ? col.color : "text-muted-foreground"}`} />
                </div>
                <span className="text-[10px] font-medium mt-1 text-foreground">{col.label}</span>
                <Badge variant={count > 0 ? "default" : "secondary"} className="text-[10px] mt-0.5 h-4 px-1.5">
                  {count}
                </Badge>
              </div>
              {i < PIPELINE_COLUMNS.length - 1 && (
                <div className="w-6 h-px bg-border mx-0.5 mt-[-18px]" />
              )}
            </div>
          );
        })}
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="min-w-[220px] space-y-3">
              <Skeleton className="h-7 w-full rounded" />
              <Skeleton className="h-28 w-full rounded" />
              <Skeleton className="h-28 w-full rounded" />
            </div>
          ))}
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <ScrollArea className="w-full" dir="rtl">
            <div className="flex gap-3 pb-4" style={{ minWidth: "1600px" }}>
              {PIPELINE_COLUMNS.map((col) => {
                const Icon = col.icon;
                const colDeals = columns[col.id];
                return (
                  <div key={col.id} className="flex flex-col min-w-[200px] w-[200px]">
                    {/* Column header */}
                    <div
                      className="mb-2 px-2 py-2 rounded-md"
                      style={{ background: `${col.accent}15` }}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className={`h-4 w-4 ${col.color}`} />
                        <span className="font-semibold text-xs text-foreground">{col.label}</span>
                        <Badge variant="secondary" className="mr-auto text-[10px] h-4 px-1">
                          {colDeals.length}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{col.desc}</p>
                    </div>

                    <Droppable droppableId={col.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 rounded-lg border border-dashed p-1.5 space-y-1.5 transition-colors min-h-[200px] ${
                            snapshot.isDraggingOver ? "bg-accent/50 border-primary" : "bg-muted/20 border-border"
                          }`}
                        >
                          {colDeals.map((deal, idx) => (
                            <Draggable key={deal.id} draggableId={deal.id} index={idx}>
                              {(dragProvided, dragSnapshot) => (
                                <Card
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className={`cursor-grab active:cursor-grabbing transition-shadow text-xs ${
                                    dragSnapshot.isDragging ? "shadow-lg ring-2 ring-primary/30" : ""
                                  }`}
                                >
                                  <CardContent className="p-2.5 space-y-1.5">
                                    <div className="flex items-start justify-between gap-1">
                                      <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">
                                        {deal.listing_title}
                                      </p>
                                      {deal.risk_score != null && deal.risk_score > 50 && (
                                        <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                                      )}
                                    </div>

                                    {deal.deal_type && (
                                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                                        {DEAL_TYPE_LABELS[deal.deal_type] || deal.deal_type}
                                      </Badge>
                                    )}

                                    <div className="space-y-0.5 text-[10px] text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        <User className="h-2.5 w-2.5" />
                                        <span className="truncate">{deal.seller_name}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <User className="h-2.5 w-2.5" />
                                        <span className="truncate">{deal.buyer_name}</span>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="font-medium text-foreground flex items-center gap-0.5">
                                        <DollarSign className="h-2.5 w-2.5" />
                                        {formatPrice(deal.agreed_price)}
                                      </span>
                                      <span className="text-muted-foreground flex items-center gap-0.5">
                                        <Clock className="h-2.5 w-2.5" />
                                        {relativeDate(deal.created_at)}
                                      </span>
                                    </div>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-full h-6 text-[10px]"
                                      onClick={() => navigate(col.actionRoute(deal))}
                                    >
                                      <Eye className="h-3 w-3 ml-1" />
                                      {col.action}
                                    </Button>

                                    {col.id === "transfer" && user && deal.buyer_id === user.id && (
                                      <Button
                                        size="sm"
                                        className="w-full h-7 text-[10px] mt-1"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          const now = new Date().toISOString();
                                          const { error } = await supabase
                                            .from("deals")
                                            .update({ status: "completed", completed_at: now })
                                            .eq("id", deal.id);
                                          if (error) {
                                            console.error("[DealPipeline] confirm receipt error", error);
                                            return;
                                          }
                                          await supabase
                                            .from("listings")
                                            .update({ status: "sold" } as any)
                                            .eq("id", deal.listing_id);
                                          const notifs = [
                                            deal.buyer_id && {
                                              user_id: deal.buyer_id,
                                              title: "تمت الصفقة بنجاح 🎉",
                                              body: `تم إتمام صفقة "${deal.listing_title}" بنجاح. تم إصدار الفاتورة تلقائياً.`,
                                              type: "deal",
                                              reference_id: deal.id,
                                              reference_type: "deal",
                                            },
                                            deal.seller_id && {
                                              user_id: deal.seller_id,
                                              title: "تمت الصفقة بنجاح 🎉",
                                              body: `تم إتمام صفقة "${deal.listing_title}" بنجاح. المشتري أكّد استلام النشاط.`,
                                              type: "deal",
                                              reference_id: deal.id,
                                              reference_type: "deal",
                                            },
                                          ].filter(Boolean);
                                          if (notifs.length) {
                                            await supabase.from("notifications").insert(notifs);
                                          }
                                          load();
                                        }}
                                      >
                                        <CheckCircle2 className="h-3 w-3 ml-1" />
                                        تأكيد استلام النشاط
                                      </Button>
                                    )}
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {colDeals.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                              <ArrowLeftRight className="h-5 w-5 mb-1 opacity-30" />
                              <span className="text-[10px]">فارغ</span>
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </DragDropContext>
      )}
    </div>
  );
};

export default DealPipelinePage;
