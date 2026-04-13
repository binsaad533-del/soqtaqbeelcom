import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Send, Loader2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import ReplyTemplatesButton from "./ReplyTemplatesButton";

interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string | null;
  last_message: string | null;
  last_message_at: string | null;
  status: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface Props {
  profiles: Array<{ user_id: string; full_name: string | null }>;
}

export default function SupervisorMessaging({ profiles }: Props) {
  const { user } = useAuthContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const getProfileName = useCallback((id: string) => {
    if (!id) return "—";
    if (id === user?.id) return "فريق الدعم — سوق تقبيل";
    return profiles.find(p => p.user_id === id)?.full_name || "مستخدم";
  }, [profiles, user]);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });
    setConversations((data || []) as Conversation[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const openConversation = async (conv: Conversation) => {
    setSelectedConv(conv);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });
    setMessages((data || []) as Message[]);
    // Mark as read
    await supabase.from("messages").update({ is_read: true } as any).eq("conversation_id", conv.id).neq("sender_id", user?.id || "");
  };

  const handleSend = async () => {
    if (!reply.trim() || !selectedConv || !user) return;
    setSending(true);
    await supabase.from("messages").insert({
      conversation_id: selectedConv.id,
      sender_id: user.id,
      content: reply.trim(),
    } as any);
    await supabase.from("conversations").update({
      last_message: reply.trim(),
      last_message_at: new Date().toISOString(),
    } as any).eq("id", selectedConv.id);
    
    // Log to audit
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "staff_message_sent",
      resource_type: "conversation",
      resource_id: selectedConv.id,
      details: { recipient: selectedConv.buyer_id === user.id ? selectedConv.seller_id : selectedConv.buyer_id },
    } as any);

    setReply("");
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", selectedConv.id).order("created_at", { ascending: true });
    setMessages((data || []) as Message[]);
    setSending(false);
    toast.success("تم إرسال الرسالة");
  };

  const startConversation = async (targetUserId: string) => {
    if (!user) return;
    // Check existing conversation
    const { data: existing } = await supabase
      .from("conversations")
      .select("*")
      .or(`and(buyer_id.eq.${user.id},seller_id.eq.${targetUserId}),and(buyer_id.eq.${targetUserId},seller_id.eq.${user.id})`)
      .limit(1);

    if (existing && existing.length > 0) {
      openConversation(existing[0] as Conversation);
      return;
    }

    const { data: newConv } = await supabase
      .from("conversations")
      .insert({
        buyer_id: user.id,
        seller_id: targetUserId,
        status: "active",
        last_message: "محادثة جديدة من فريق الدعم",
        last_message_at: new Date().toISOString(),
      } as any)
      .select()
      .single();

    if (newConv) {
      // Send welcome message
      await supabase.from("messages").insert({
        conversation_id: (newConv as any).id,
        sender_id: user.id,
        content: "مرحباً بك! فريق الدعم في سوق تقبيل. كيف نقدر نساعدك؟",
      } as any);
      
      await fetchConversations();
      openConversation(newConv as Conversation);
      toast.success("تم فتح محادثة جديدة");
    }
  };

  const getOtherParty = (conv: Conversation) => {
    const otherId = conv.buyer_id === user?.id ? conv.seller_id : conv.buyer_id;
    return getProfileName(otherId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MessageCircle size={15} className="text-primary" /> المراسلات
        </h3>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : conversations.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">لا توجد محادثات</p>
      ) : (
        <div className="space-y-1.5">
          {conversations.map(c => (
            <div key={c.id}
              className="p-3 rounded-lg border border-border/30 bg-card flex items-center gap-3 cursor-pointer hover:border-primary/20 transition-colors"
              onClick={() => openConversation(c)}>
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium shrink-0">
                {getOtherParty(c).charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{getOtherParty(c)}</p>
                <p className="text-[10px] text-muted-foreground truncate">{c.last_message || "—"}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString("en-GB") : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Chat dialog */}
      <Dialog open={!!selectedConv} onOpenChange={o => { if (!o) setSelectedConv(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm">{selectedConv ? getOtherParty(selectedConv) : ""}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 mb-2">
            {messages.map(m => (
              <div key={m.id} className={cn("flex", m.sender_id === user?.id ? "justify-start" : "justify-end")}>
                <div className={cn("max-w-[80%] p-2.5 rounded-lg text-sm",
                  m.sender_id === user?.id ? "bg-primary/5 border border-primary/10" : "bg-muted")}>
                  <p className="text-[10px] text-muted-foreground mb-0.5">
                    {m.sender_id === user?.id ? "فريق الدعم — سوق تقبيل" : getProfileName(m.sender_id)}
                    {" · "}
                    {new Date(m.created_at).toLocaleTimeString("en-SA", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-end">
            <ReplyTemplatesButton onSelect={text => setReply(text)} />
            <Textarea value={reply} onChange={e => setReply(e.target.value)} rows={2}
              placeholder="اكتب الرد..." className="flex-1 min-h-[50px]"
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
            <Button size="icon" onClick={handleSend} disabled={sending || !reply.trim()}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={14} />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { type Conversation };
export const startConversationWithUser = async (supervisorId: string, targetUserId: string) => {
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .or(`and(buyer_id.eq.${supervisorId},seller_id.eq.${targetUserId}),and(buyer_id.eq.${targetUserId},seller_id.eq.${supervisorId})`)
    .limit(1);

  if (existing && existing.length > 0) return existing[0] as Conversation;

  const { data: newConv } = await supabase
    .from("conversations")
    .insert({
      buyer_id: supervisorId,
      seller_id: targetUserId,
      status: "active",
      last_message: "محادثة جديدة من فريق الدعم",
      last_message_at: new Date().toISOString(),
    } as any)
    .select()
    .single();

  if (newConv) {
    await supabase.from("messages").insert({
      conversation_id: (newConv as any).id,
      sender_id: supervisorId,
      content: "مرحباً بك! فريق الدعم في سوق تقبيل. كيف نقدر نساعدك؟",
    } as any);
  }

  return newConv as Conversation | null;
};
