import { useState, useEffect } from "react";
import { useTickets, type SupportTicket } from "@/hooks/useTickets";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Search, UserPlus, CheckCircle, Loader2, Send } from "lucide-react";
import type { TicketMessage } from "@/hooks/useTickets";
import { useAuthContext } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import ReplyTemplatesButton from "@/components/supervisor/ReplyTemplatesButton";

const statusLabels: Record<string, { ar: string; cls: string }> = {
  open: { ar: "مفتوحة", cls: "bg-primary/10 text-primary" },
  in_progress: { ar: "قيد المعالجة", cls: "bg-warning/10 text-warning" },
  waiting_response: { ar: "بانتظار الرد", cls: "bg-accent/10 text-accent-foreground" },
  resolved: { ar: "تم الحل", cls: "bg-success/10 text-success" },
  closed: { ar: "مغلقة", cls: "bg-muted text-muted-foreground" },
};
const priorityLabels: Record<string, { ar: string; cls: string }> = {
  low: { ar: "منخفضة", cls: "bg-muted text-muted-foreground" },
  medium: { ar: "متوسطة", cls: "bg-primary/10 text-primary" },
  high: { ar: "عالية", cls: "bg-warning/10 text-warning" },
  urgent: { ar: "عاجلة", cls: "bg-destructive/10 text-destructive" },
};
const categoryLabels: Record<string, string> = {
  general: "عام", technical: "تقني", billing: "فواتير",
  complaint: "شكوى", suggestion: "اقتراح", other: "أخرى",
};

export default function SupportTicketsPanel() {
  const { tickets, loading, assignTicket, updateTicketStatus, getMessages, sendMessage, fetchTickets } = useTickets();
  const { user } = useAuthContext();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const ids = [...new Set(tickets.map(t => t.user_id))];
    if (ids.length === 0) return;
    supabase.from("profiles").select("user_id, full_name").in("user_id", ids)
      .then(({ data }) => {
        const m: Record<string, string> = {};
        data?.forEach((p: any) => { m[p.user_id] = p.full_name || "—"; });
        setProfiles(m);
      });
  }, [tickets]);

  const filtered = tickets.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = (profiles[t.user_id] || "").toLowerCase();
      if (!t.subject.toLowerCase().includes(q) && !name.includes(q)) return false;
    }
    return true;
  });

  const openConversation = async (t: SupportTicket) => {
    setSelectedTicket(t);
    const msgs = await getMessages(t.id);
    setMessages(msgs);
  };

  const handleSend = async () => {
    if (!reply.trim() || !selectedTicket) return;
    setSending(true);
    await sendMessage(selectedTicket.id, reply.trim());
    setReply("");
    const msgs = await getMessages(selectedTicket.id);
    setMessages(msgs);
    await fetchTickets();
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالموضوع أو اسم المستخدم..." className="pr-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.ar}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="الأولوية" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.ar}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground text-sm">لا توجد تذاكر</p>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(t => (
            <div key={t.id} className="p-3 rounded-lg border border-border/30 bg-card flex items-center gap-3 cursor-pointer hover:border-primary/20 transition-colors"
              onClick={() => openConversation(t)}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.subject}</p>
                <p className="text-[10px] text-muted-foreground">{profiles[t.user_id] || "—"} · {categoryLabels[t.category] || t.category}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] shrink-0 ${priorityLabels[t.priority]?.cls || ""}`}>
                {priorityLabels[t.priority]?.ar || t.priority}
              </Badge>
              <Badge variant="outline" className={`text-[10px] shrink-0 ${statusLabels[t.status]?.cls || ""}`}>
                {statusLabels[t.status]?.ar || t.status}
              </Badge>
              <span className="text-[10px] text-muted-foreground shrink-0">{new Date(t.created_at).toLocaleDateString("en-SA")}</span>
            </div>
          ))}
        </div>
      )}

      {/* Conversation Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={o => { if (!o) setSelectedTicket(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm">{selectedTicket?.subject}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-2">
            {selectedTicket && !selectedTicket.assigned_to && (
              <Button size="sm" variant="outline" onClick={async () => {
                await assignTicket(selectedTicket.id);
                toast.success("تم استلام التذكرة");
                const t = tickets.find(x => x.id === selectedTicket.id);
                if (t) setSelectedTicket({ ...t, assigned_to: user?.id || null, status: "in_progress" });
              }}>
                <UserPlus size={12} className="mr-1" /> تعيين لي
              </Button>
            )}
            {selectedTicket && selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" && (
              <Button size="sm" variant="outline" onClick={async () => {
                await updateTicketStatus(selectedTicket.id, "resolved");
                toast.success("تم الحل");
                setSelectedTicket(null);
              }}>
                <CheckCircle size={12} className="mr-1" /> تم الحل
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 mb-2">
            {messages.map(m => (
              <div key={m.id} className={cn("flex", m.is_staff ? "justify-start" : "justify-end")}>
                <div className={cn("max-w-[80%] p-2.5 rounded-lg text-sm",
                  m.is_staff ? "bg-primary/5 border border-primary/10" : "bg-muted")}>
                  <p className="text-[10px] text-muted-foreground mb-0.5">
                    {m.is_staff ? "فريق الدعم" : profiles[m.sender_id] || "مستخدم"}
                    {" · "}
                    {new Date(m.created_at).toLocaleTimeString("en-SA", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
                </div>
              </div>
            ))}
          </div>
          {selectedTicket && selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" && (
            <div className="space-y-2">
              <ReplyTemplatesButton onSelect={text => setReply(text)} />
              <div className="flex gap-2">
                <Textarea value={reply} onChange={e => setReply(e.target.value)} rows={2}
                  placeholder="اكتب الرد..." className="flex-1 min-h-[50px]"
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
                <Button size="icon" onClick={handleSend} disabled={sending || !reply.trim()}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={14} />}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
