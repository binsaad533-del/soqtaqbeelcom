import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { STATUS_LABELS, DEAL_TYPE_LABELS } from "@/lib/translations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { useSEO } from "@/hooks/useSEO";
import {
  ArrowLeftRight,
  Search,
  Filter,
  Eye,
  Calendar,
  User,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Handshake,
} from "lucide-react";

/* ── pipeline column definitions ── */
const PIPELINE_COLUMNS = [
  { id: "negotiating", label: "قيد التفاوض", icon: Handshake, color: "text-blue-500" },
  { id: "confirmed", label: "مؤكدة", icon: CheckCircle2, color: "text-amber-500" },
  { id: "completed", label: "مكتملة", icon: CheckCircle2, color: "text-green-500" },
  { id: "cancelled", label: "ملغاة", icon: XCircle, color: "text-destructive" },
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
}

function mapStatusToColumn(status: string, locked: boolean): ColumnId {
  if (status === "completed" || status === "finalized") return "completed";
  if (status === "cancelled" || status === "rejected") return "cancelled";
  if (locked || status === "confirmed") return "confirmed";
  return "negotiating";
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
  const { tx } = useLanguage();
  const navigate = useNavigate();
  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useSEO({
    title: "مسار الصفقات | سوق تقبيل",
    description: "تتبع مسار الصفقات من التفاوض حتى الإتمام",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch deals
      const { data: dealsData, error } = await supabase
        .from("deals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch related profiles & listings for display names
      const buyerIds = [...new Set((dealsData || []).map((d) => d.buyer_id).filter(Boolean))] as string[];
      const sellerIds = [...new Set((dealsData || []).map((d) => d.seller_id).filter(Boolean))] as string[];
      const allUserIds = [...new Set([...buyerIds, ...sellerIds])];
      const listingIds = [...new Set((dealsData || []).map((d) => d.listing_id).filter(Boolean))];

      const [profilesRes, listingsRes] = await Promise.all([
        allUserIds.length
          ? supabase.from("profiles").select("user_id, full_name").in("user_id", allUserIds)
          : { data: [] },
        listingIds.length
          ? supabase.from("listings").select("id, title").in("id", listingIds)
          : { data: [] },
      ]);

      const profileMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p.full_name || "—"]));
      const listingMap = new Map((listingsRes.data || []).map((l) => [l.id, l.title || "بدون عنوان"]));

      const enriched: PipelineDeal[] = (dealsData || []).map((d) => ({
        ...d,
        listing_title: listingMap.get(d.listing_id) || "—",
        buyer_name: d.buyer_id ? profileMap.get(d.buyer_id) || "—" : "—",
        seller_name: d.seller_id ? profileMap.get(d.seller_id) || "—" : "—",
      }));

      setDeals(enriched);
    } catch (err) {
      console.error("[DealPipeline] load error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("deal-pipeline-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => {
        load();
      })
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
      negotiating: [],
      confirmed: [],
      completed: [],
      cancelled: [],
    };
    filtered.forEach((d) => {
      const col = mapStatusToColumn(d.status, d.locked);
      map[col].push(d);
    });
    return map;
  }, [filtered]);

  const dealTypes = useMemo(() => {
    const types = new Set(deals.map((d) => d.deal_type).filter(Boolean) as string[]);
    return Array.from(types);
  }, [deals]);

  const totals = useMemo(() => {
    const totalValue = filtered.reduce((s, d) => s + (d.agreed_price || 0), 0);
    const avgDays =
      filtered.length > 0
        ? Math.round(
            filtered.reduce((s, d) => s + (Date.now() - new Date(d.created_at).getTime()) / 86_400_000, 0) /
              filtered.length
          )
        : 0;
    return { count: filtered.length, totalValue, avgDays };
  }, [filtered]);

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      if (!result.destination) return;
      const destCol = result.destination.droppableId as ColumnId;
      const dealId = result.draggableId;
      const deal = deals.find((d) => d.id === dealId);
      if (!deal) return;

      const currentCol = mapStatusToColumn(deal.status, deal.locked);
      if (currentCol === destCol) return;

      // Map column back to status
      const statusMap: Record<ColumnId, string> = {
        negotiating: "negotiating",
        confirmed: "confirmed",
        completed: "completed",
        cancelled: "cancelled",
      };

      const newStatus = statusMap[destCol];

      // Optimistic update
      setDeals((prev) =>
        prev.map((d) =>
          d.id === dealId
            ? {
                ...d,
                status: newStatus,
                locked: destCol === "confirmed" || destCol === "completed",
                completed_at: destCol === "completed" ? new Date().toISOString() : d.completed_at,
              }
            : d
        )
      );

      const updateData: Record<string, unknown> = { status: newStatus };
      if (destCol === "confirmed" || destCol === "completed") updateData.locked = true;
      if (destCol === "completed") updateData.completed_at = new Date().toISOString();
      if (destCol === "negotiating") updateData.locked = false;

      const { error } = await supabase.from("deals").update(updateData).eq("id", dealId);
      if (error) {
        console.error("[DealPipeline] drag update error", error);
        load(); // revert
      }
    },
    [deals, load]
  );

  return (
    <div className="container mx-auto py-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مسار الصفقات</h1>
          <p className="text-sm text-muted-foreground mt-1">تتبع وإدارة مسار جميع الصفقات</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو العنوان..."
              className="pr-9 w-56"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44">
              <Filter className="h-4 w-4 ml-1" />
              <SelectValue placeholder="نوع الصفقة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأنواع</SelectItem>
              {dealTypes.map((dt) => (
                <SelectItem key={dt} value={dt}>
                  {DEAL_TYPE_LABELS[dt] || dt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {PIPELINE_COLUMNS.map((col) => {
          const Icon = col.icon;
          const count = columns[col.id].length;
          const value = columns[col.id].reduce((s, d) => s + (d.agreed_price || 0), 0);
          return (
            <Card key={col.id} className="border-t-2" style={{ borderTopColor: `var(--${col.id === "negotiating" ? "primary" : col.id === "confirmed" ? "warning" : col.id === "completed" ? "success" : "destructive"})` }}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${col.color}`} />
                  <span className="text-xs font-medium text-muted-foreground">{col.label}</span>
                </div>
                <p className="text-xl font-bold text-foreground">{count}</p>
                <p className="text-xs text-muted-foreground">{formatPrice(value)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-8 w-full rounded" />
              <Skeleton className="h-32 w-full rounded" />
              <Skeleton className="h-32 w-full rounded" />
            </div>
          ))}
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-h-[60vh]">
            {PIPELINE_COLUMNS.map((col) => {
              const Icon = col.icon;
              const colDeals = columns[col.id];
              return (
                <div key={col.id} className="flex flex-col">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Icon className={`h-4 w-4 ${col.color}`} />
                    <span className="font-semibold text-sm text-foreground">{col.label}</span>
                    <Badge variant="secondary" className="mr-auto text-xs">
                      {colDeals.length}
                    </Badge>
                  </div>
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 rounded-lg border border-dashed p-2 space-y-2 transition-colors min-h-[200px] ${
                          snapshot.isDraggingOver ? "bg-accent/50 border-primary" : "bg-muted/30 border-border"
                        }`}
                      >
                        {colDeals.map((deal, idx) => (
                          <Draggable key={deal.id} draggableId={deal.id} index={idx}>
                            {(dragProvided, dragSnapshot) => (
                              <Card
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                className={`cursor-grab active:cursor-grabbing transition-shadow ${
                                  dragSnapshot.isDragging ? "shadow-lg ring-2 ring-primary/30" : ""
                                }`}
                              >
                                <CardContent className="p-3 space-y-2">
                                  {/* Title */}
                                  <div className="flex items-start justify-between gap-1">
                                    <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
                                      {deal.listing_title}
                                    </p>
                                    {deal.risk_score != null && deal.risk_score > 50 && (
                                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                                    )}
                                  </div>

                                  {/* Deal type */}
                                  {deal.deal_type && (
                                    <Badge variant="outline" className="text-[10px]">
                                      {DEAL_TYPE_LABELS[deal.deal_type] || deal.deal_type}
                                    </Badge>
                                  )}

                                  {/* Parties */}
                                  <div className="space-y-1 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span>بائع: {deal.seller_name}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span>مشتري: {deal.buyer_name}</span>
                                    </div>
                                  </div>

                                  {/* Price & date */}
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-medium text-foreground flex items-center gap-1">
                                      <DollarSign className="h-3 w-3" />
                                      {formatPrice(deal.agreed_price)}
                                    </span>
                                    <span className="text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {relativeDate(deal.created_at)}
                                    </span>
                                  </div>

                                  {/* Action */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full h-7 text-xs"
                                    onClick={() => navigate(`/negotiate/${deal.id}`)}
                                  >
                                    <Eye className="h-3 w-3 ml-1" />
                                    عرض التفاصيل
                                  </Button>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {colDeals.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <ArrowLeftRight className="h-6 w-6 mb-2 opacity-40" />
                            <span className="text-xs">لا توجد صفقات</span>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}
    </div>
  );
};

export default DealPipelinePage;
