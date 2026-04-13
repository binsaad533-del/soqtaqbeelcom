import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_staff: boolean;
  attachments: string[] | null;
  created_at: string;
}

function autoPriority(text: string): string {
  const lower = text.toLowerCase();
  const ar = text;
  if (/عاجل|مستعجل|urgent/.test(ar) || /urgent/.test(lower)) return "urgent";
  if (/مشكلة|لا يعمل|خطأ|error|bug/.test(ar)) return "high";
  if (/اقتراح|ملاحظة|suggestion/.test(ar)) return "low";
  return "medium";
}

export function useTickets() {
  const { user, role } = useAuthContext();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const isStaff = role === "platform_owner" || role === "supervisor";

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("support_tickets" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setTickets((data as any as SupportTicket[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const createTicket = useCallback(async (subject: string, category: string, description: string) => {
    if (!user) return null;
    const priority = autoPriority(subject + " " + description);
    const { data: ticket, error } = await supabase
      .from("support_tickets" as any)
      .insert({ user_id: user.id, subject, category, priority } as any)
      .select()
      .single();
    if (error || !ticket) return null;
    // Add first message
    await supabase.from("ticket_messages" as any).insert({
      ticket_id: (ticket as any).id,
      sender_id: user.id,
      message: description,
      is_staff: false,
    } as any);
    await fetchTickets();
    return (ticket as any) as SupportTicket;
  }, [user, fetchTickets]);

  const getTicket = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("support_tickets" as any)
      .select("*")
      .eq("id", id)
      .single();
    return data as any as SupportTicket | null;
  }, []);

  const getMessages = useCallback(async (ticketId: string) => {
    const { data } = await supabase
      .from("ticket_messages" as any)
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    return (data as any as TicketMessage[]) || [];
  }, []);

  const sendMessage = useCallback(async (ticketId: string, message: string, attachments?: string[]) => {
    if (!user) return;
    await supabase.from("ticket_messages" as any).insert({
      ticket_id: ticketId,
      sender_id: user.id,
      message,
      is_staff: isStaff,
      attachments: attachments || null,
    } as any);
    // Update ticket status
    const newStatus = isStaff ? "in_progress" : "waiting_response";
    await supabase.from("support_tickets" as any).update({ status: newStatus } as any).eq("id", ticketId);
  }, [user, isStaff]);

  const updateTicketStatus = useCallback(async (ticketId: string, status: string) => {
    const updates: any = { status };
    if (status === "resolved" || status === "closed") {
      updates.resolved_at = new Date().toISOString();
    }
    await supabase.from("support_tickets" as any).update(updates).eq("id", ticketId);
    await fetchTickets();
  }, [fetchTickets]);

  const assignTicket = useCallback(async (ticketId: string) => {
    if (!user) return;
    await supabase.from("support_tickets" as any).update({ assigned_to: user.id, status: "in_progress" } as any).eq("id", ticketId);
    await fetchTickets();
  }, [user, fetchTickets]);

  const openTicketCount = tickets.filter(t => t.status === "open" || t.status === "waiting_response").length;

  return {
    tickets, loading, isStaff, openTicketCount,
    createTicket, getTicket, getMessages, sendMessage,
    updateTicketStatus, assignTicket, fetchTickets,
  };
}
