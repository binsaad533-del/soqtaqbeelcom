import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export interface CrmLead {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  subject: string;
  message: string | null;
  source: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmLeadActivity {
  id: string;
  lead_id: string;
  actor_id: string;
  action_type: string;
  details: string | null;
  created_at: string;
}

export const CRM_STATUSES = [
  { value: "new", label: "جديد", color: "bg-blue-100 text-blue-700" },
  { value: "contacted", label: "تم التواصل", color: "bg-cyan-100 text-cyan-700" },
  { value: "follow_up", label: "متابعة مطلوبة", color: "bg-yellow-100 text-yellow-700" },
  { value: "interested", label: "مهتم", color: "bg-green-100 text-green-700" },
  { value: "not_interested", label: "غير مهتم", color: "bg-gray-100 text-gray-600" },
  { value: "converted", label: "تم التحويل", color: "bg-emerald-100 text-emerald-700" },
  { value: "closed", label: "مغلق", color: "bg-red-100 text-red-700" },
];

export const FOLLOW_UP_ACTIONS = [
  "اتصال بالعميل",
  "بانتظار الرد",
  "طلب تفاصيل إضافية",
  "مهتم",
  "يحتاج تذكير",
  "تم الحل",
];

export function useCrmLeads() {
  const { user, role } = useAuthContext();
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    if (!user || (role !== "platform_owner" && role !== "supervisor")) return;
    setLoading(true);
    const { data } = await supabase
      .from("crm_leads")
      .select("*")
      .order("created_at", { ascending: false });
    setLeads((data || []) as unknown as CrmLead[]);
    setLoading(false);
  }, [user, role]);

  const createLead = useCallback(async (lead: {
    full_name: string;
    phone: string;
    email?: string;
    subject: string;
    message?: string;
    source?: string;
  }) => {
    const { data, error } = await supabase
      .from("crm_leads")
      .insert(lead as any)
      .select()
      .single();
    return { data: data as unknown as CrmLead | null, error };
  }, []);

  const updateLead = useCallback(async (id: string, updates: Partial<CrmLead>) => {
    const { error } = await supabase
      .from("crm_leads")
      .update(updates as any)
      .eq("id", id);
    if (!error) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    }
    return { error };
  }, []);

  const getLeadActivities = useCallback(async (leadId: string) => {
    const { data } = await supabase
      .from("crm_lead_activities")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    return (data || []) as unknown as CrmLeadActivity[];
  }, []);

  const addActivity = useCallback(async (leadId: string, actionType: string, details?: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("crm_lead_activities")
      .insert({
        lead_id: leadId,
        actor_id: user.id,
        action_type: actionType,
        details,
      } as any);
    return { error };
  }, [user]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user || (role !== "platform_owner" && role !== "supervisor")) return;
    fetchLeads();

    const channel = supabase
      .channel("crm-leads-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_leads" }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, role, fetchLeads]);

  return { leads, loading, fetchLeads, createLead, updateLead, getLeadActivities, addActivity };
}
