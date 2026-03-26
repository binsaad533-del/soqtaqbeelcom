import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SupervisorPermissions {
  id: string;
  user_id: string;
  manage_listings: boolean;
  manage_deals: boolean;
  manage_users: boolean;
  manage_crm: boolean;
  manage_reports: boolean;
  manage_security: boolean;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
}

export const PERMISSION_LABELS: Record<string, string> = {
  manage_listings: "إدارة الإعلانات",
  manage_deals: "إدارة الصفقات",
  manage_users: "إدارة المستخدمين",
  manage_crm: "إدارة العملاء المحتملين",
  manage_reports: "إدارة البلاغات",
  manage_security: "إدارة الأمان",
};

export function useSupervisorPermissions() {
  const getAllPermissions = useCallback(async () => {
    const { data } = await supabase
      .from("supervisor_permissions")
      .select("*")
      .order("created_at", { ascending: false });
    return (data || []) as SupervisorPermissions[];
  }, []);

  const getMyPermissions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("supervisor_permissions")
      .select("*")
      .eq("user_id", user.id)
      .single();
    return data as SupervisorPermissions | null;
  }, []);

  const upsertPermissions = useCallback(async (
    userId: string,
    permissions: Partial<Omit<SupervisorPermissions, "id" | "user_id" | "created_at" | "updated_at">>
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("supervisor_permissions")
      .upsert(
        { user_id: userId, ...permissions, assigned_by: user?.id, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      )
      .select()
      .single();
    return { data: data as SupervisorPermissions | null, error };
  }, []);

  const deletePermissions = useCallback(async (userId: string) => {
    const { error } = await supabase
      .from("supervisor_permissions")
      .delete()
      .eq("user_id", userId);
    return { error };
  }, []);

  const promoteToSupervisor = useCallback(async (
    userId: string,
    permissions: Record<string, boolean>
  ) => {
    // Update role to supervisor
    const { error: roleError } = await supabase
      .from("user_roles")
      .update({ role: "supervisor" })
      .eq("user_id", userId);
    if (roleError) return { error: roleError };

    // Set permissions
    const { error: permError } = await supabase
      .from("supervisor_permissions")
      .upsert({
        user_id: userId,
        manage_listings: permissions.manage_listings || false,
        manage_deals: permissions.manage_deals || false,
        manage_users: permissions.manage_users || false,
        manage_crm: permissions.manage_crm || false,
        manage_reports: permissions.manage_reports || false,
        manage_security: permissions.manage_security || false,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    return { error: permError };
  }, []);

  const demoteToCustomer = useCallback(async (userId: string) => {
    // Update role back to customer
    const { error: roleError } = await supabase
      .from("user_roles")
      .update({ role: "customer" })
      .eq("user_id", userId);
    if (roleError) return { error: roleError };

    // Remove permissions
    await supabase
      .from("supervisor_permissions")
      .delete()
      .eq("user_id", userId);

    return { error: null };
  }, []);

  /** Suspend supervisor access (role → customer) but keep permissions record */
  const suspendSupervisor = useCallback(async (userId: string) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: "customer" })
      .eq("user_id", userId);
    return { error };
  }, []);

  /** Re-enable supervisor access (role → supervisor), permissions record must still exist */
  const enableSupervisor = useCallback(async (userId: string) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: "supervisor" })
      .eq("user_id", userId);
    return { error };
  }, []);

  return { getAllPermissions, getMyPermissions, upsertPermissions, deletePermissions, promoteToSupervisor, demoteToCustomer, suspendSupervisor, enableSupervisor };
}
