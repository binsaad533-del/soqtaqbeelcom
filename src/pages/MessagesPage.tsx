import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { MessageSquare, Search, Clock, Sparkles, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useSEO } from "@/hooks/useSEO";
import { ar } from "date-fns/locale";
import { useTranslation } from "react-i18next";

interface Conversation {
  dealId: string;
  listingTitle: string | null;
  otherPartyName: string | null;
  otherPartyId: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  dealStatus: string;
  iAmBuyer: boolean;
}

const MessagesPage = () => {
  const { t } = useTranslation();
  useSEO({ title: "المحادثات", description: "تابع محادثاتك ومفاوضاتك على سوق تقبيل", canonical: "/messages" });
  const { user } = useAuthContext();
  const { tx } = useLanguage();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    loadConversations();

    const channel = supabase
      .channel("inbox-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "negotiation_messages" },
        () => loadConversations()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;
    setLoading(true);

    // Get all deals where user is a party
    const { data: deals } = await supabase
      .from("deals")
      .select("id, buyer_id, seller_id, status, listing_id")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

    if (!deals || deals.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const dealIds = deals.map((d) => d.id);

    // Fetch latest message per deal + unread count
    const { data: messages } = await supabase
      .from("negotiation_messages")
      .select("deal_id, message, created_at, sender_id, is_read")
      .in("deal_id", dealIds)
      .order("created_at", { ascending: false });

    // Fetch listing titles
    const listingIds = [...new Set(deals.map((d) => d.listing_id))];
    const { data: listings } = await supabase
      .from("listings")
      .select("id, title")
      .in("id", listingIds);

    const listingMap = new Map(listings?.map((l) => [l.id, l.title]) ?? []);

    // Get other party profile names
    const otherPartyIds = deals.map((d) =>
      d.buyer_id === user.id ? d.seller_id : d.buyer_id
    ).filter(Boolean) as string[];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", otherPartyIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) ?? []);

    // Build conversations
    const convs: Conversation[] = deals.map((deal) => {
      const dealMessages = messages?.filter((m) => m.deal_id === deal.id) ?? [];
      const latest = dealMessages[0];
      const unread = dealMessages.filter(
        (m) => m.sender_id !== user.id && !m.is_read
      ).length;
      const otherPartyId =
        deal.buyer_id === user.id ? deal.seller_id! : deal.buyer_id!;

      return {
        dealId: deal.id,
        listingTitle: listingMap.get(deal.listing_id) ?? null,
        otherPartyName: profileMap.get(otherPartyId) ?? null,
        otherPartyId,
        lastMessage: latest?.message ?? "",
        lastMessageAt: latest?.created_at ?? deal.id,
        unreadCount: unread,
        dealStatus: deal.status,
        iAmBuyer: deal.buyer_id === user.id,
      };
    });

    // Sort by latest message
    convs.sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() -
        new Date(a.lastMessageAt).getTime()
    );

    setConversations(convs);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        c.otherPartyName?.toLowerCase().includes(q) ||
        c.listingTitle?.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const statusColor = (s: string) => {
    if (s === "completed" || s === "finalized") return "bg-emerald-500/10 text-emerald-600";
    if (s === "cancelled") return "bg-destructive/10 text-destructive";
    return "bg-primary/10 text-primary";
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      negotiating: "تفاوض",
      agreed: "متفق",
      completed: "مكتمل",
      finalized: "نهائي",
      cancelled: "ملغي",
    };
    return map[s] ?? s;
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="container max-w-2xl py-6 space-y-4">
      <div className="flex items-center gap-3">
        <MessageSquare size={22} className="text-primary" />
        <h1 className="text-xl font-bold">{t("nav.messages")}</h1>
      </div>

      <div className="relative">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("messages.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground space-y-2">
          <MessageSquare size={40} className="mx-auto opacity-30" />
          <p className="text-sm">
            {t("messages.noConversations")}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border bg-card">
          {filtered.map((conv) => (
            <button
              key={conv.dealId}
              onClick={() => navigate(`/negotiate/${conv.dealId}`)}
              className={cn(
                "w-full flex items-start gap-3 px-4 py-3.5 text-right hover:bg-muted/30 transition-colors",
                conv.unreadCount > 0 && "bg-primary/[0.03]"
              )}
            >
              <Avatar className="h-10 w-10 shrink-0 mt-0.5">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {(conv.otherPartyName ?? "?")[0]}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-sm truncate",
                      conv.unreadCount > 0
                        ? "font-semibold text-foreground"
                        : "font-medium text-foreground/80"
                    )}
                  >
                    {conv.otherPartyName || tx("مستخدم", "User")}
                  </span>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                    <Clock size={11} />
                    {conv.lastMessageAt !== conv.dealId
                      ? formatDistanceToNow(new Date(conv.lastMessageAt), {
                          addSuffix: true,
                          locale: ar,
                        })
                      : "—"}
                  </span>
                </div>

                {conv.listingTitle && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {conv.listingTitle}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      "text-xs truncate max-w-[70%]",
                      conv.unreadCount > 0
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {conv.lastMessage || tx("لا رسائل بعد", "No messages yet")}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {/* AI in-chat hint */}
                    {conv.dealStatus === "negotiating" && (
                      <span className="text-[9px] text-primary flex items-center gap-0.5" title="مقبل يراقب هذه المحادثة">
                        <Sparkles size={9} />
                      </span>
                    )}
                    <Badge
                      variant="secondary"
                      className={cn("text-[10px] px-1.5 py-0", statusColor(conv.dealStatus))}
                    >
                      {statusLabel(conv.dealStatus)}
                    </Badge>
                    {conv.unreadCount > 0 && (
                      <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                        {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
