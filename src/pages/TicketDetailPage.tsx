import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useTickets, type SupportTicket, type TicketMessage } from "@/hooks/useTickets";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Send, CheckCircle, XCircle, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  open: "مفتوحة", in_progress: "قيد المعالجة", waiting_response: "بانتظار الرد",
  resolved: "تم الحل", closed: "مغلقة",
};

const priorityLabels: Record<string, string> = {
  low: "منخفضة", medium: "متوسطة", high: "عالية", urgent: "عاجلة",
};

const TicketDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { tx } = useLanguage();
  const { user } = useAuthContext();
  const { getTicket, getMessages, sendMessage, updateTicketStatus, assignTicket, isStaff } = useTickets();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useSEO({ title: tx("تذكرة الدعم | سوق تقبيل", "Support Ticket | Soq Taqbeel") });

  const refresh = async () => {
    if (!id) return;
    const [t, m] = await Promise.all([getTicket(id), getMessages(id)]);
    setTicket(t);
    setMessages(m);
    setLoading(false);
    // Fetch profile names
    const ids = new Set(m.map(msg => msg.sender_id));
    if (t) ids.add(t.user_id);
    const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", Array.from(ids));
    const map: Record<string, string> = {};
    profs?.forEach((p: any) => { map[p.user_id] = p.full_name || "مستخدم"; });
    setProfiles(map);
  };

  useEffect(() => { refresh(); }, [id]);

  // Realtime for new messages
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`ticket-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${id}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    if (!reply.trim() || !id) return;
    setSending(true);
    await sendMessage(id, reply.trim());
    setReply("");
    await refresh();
    setSending(false);
  };

  const isClosed = ticket?.status === "closed" || ticket?.status === "resolved";

  if (loading) return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (!ticket) return (
    <div className="container py-16 text-center text-muted-foreground">
      {tx("التذكرة غير موجودة", "Ticket not found")}
    </div>
  );

  return (
    <div className="container py-6 max-w-2xl space-y-4">
      {/* Header */}
      <div className="p-4 rounded-xl border border-border/40 bg-card space-y-2">
        <h1 className="text-base font-bold">{ticket.subject}</h1>
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <Badge variant="outline">{statusLabels[ticket.status] || ticket.status}</Badge>
          <Badge variant="outline">{priorityLabels[ticket.priority] || ticket.priority}</Badge>
          <span className="text-muted-foreground">{new Date(ticket.created_at).toLocaleDateString("en-SA")}</span>
        </div>
        <div className="flex gap-2 flex-wrap pt-1">
          {!isClosed && !isStaff && (
            <Button size="sm" variant="outline" onClick={() => { updateTicketStatus(ticket.id, "closed"); refresh(); }}>
              <XCircle size={13} className="mr-1" /> {tx("إغلاق التذكرة", "Close Ticket")}
            </Button>
          )}
          {!isClosed && isStaff && (
            <>
              {!ticket.assigned_to && (
                <Button size="sm" variant="outline" onClick={() => { assignTicket(ticket.id); refresh(); toast.success("تم استلام التذكرة"); }}>
                  <UserPlus size={13} className="mr-1" /> {tx("تعيين لي", "Assign to me")}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => { updateTicketStatus(ticket.id, "resolved"); refresh(); toast.success("تم الحل"); }}>
                <CheckCircle size={13} className="mr-1" /> {tx("تم الحل", "Resolved")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-2 max-h-[50vh] overflow-y-auto px-1">
        {messages.map(m => {
          const isMe = m.sender_id === user?.id;
          return (
            <div key={m.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] p-3 rounded-xl text-sm",
                m.is_staff
                  ? "bg-primary/5 border border-primary/10"
                  : isMe ? "bg-muted" : "bg-card border border-border/30"
              )}>
                <p className="text-[10px] text-muted-foreground mb-1">
                  {m.is_staff ? tx("فريق الدعم", "Support") : profiles[m.sender_id] || tx("مستخدم", "User")}
                  {" · "}
                  {new Date(m.created_at).toLocaleTimeString("en-SA", { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply */}
      {!isClosed && (
        <div className="flex gap-2">
          <Textarea value={reply} onChange={e => setReply(e.target.value)}
            placeholder={tx("اكتب ردك...", "Write your reply...")}
            rows={2} className="flex-1 min-h-[60px]"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
          <Button size="icon" onClick={handleSend} disabled={sending || !reply.trim()}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={16} />}
          </Button>
        </div>
      )}
    </div>
  );
};

export default TicketDetailPage;
