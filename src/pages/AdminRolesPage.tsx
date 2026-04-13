import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Search, ShieldCheck } from "lucide-react";

interface UserRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
}

const roleLabels: Record<string, string> = {
  customer: "عميل",
  supervisor: "مشرف تشغيل",
  financial_manager: "مدير مالي",
  platform_owner: "مالك المنصة",
};

const assignableRoles = ["customer", "supervisor", "financial_manager"];

const AdminRolesPage = () => {
  const { tx } = useLanguage();
  const { user } = useAuthContext();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  useSEO({ title: tx("إدارة الأدوار | سوق تقبيل", "Role Management | Soq Taqbeel") });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, email, phone").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleMap: Record<string, string> = {};
    (roles || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });
    const merged: UserRow[] = (profiles || []).map((p: any) => ({
      user_id: p.user_id,
      full_name: p.full_name,
      email: p.email,
      phone: p.phone,
      role: roleMap[p.user_id] || "customer",
    }));
    setUsers(merged);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    if (targetUserId === user?.id) {
      toast.error(tx("لا يمكنك تغيير دورك", "Cannot change your own role"));
      return;
    }
    setUpdating(targetUserId);
    // Upsert role
    const { error } = await supabase
      .from("user_roles")
      .upsert({ user_id: targetUserId, role: newRole } as any, { onConflict: "user_id" });
    if (error) {
      toast.error(tx("حدث خطأ", "Error"));
      setUpdating(null);
      return;
    }
    // Audit log
    await supabase.from("audit_logs").insert({
      user_id: user?.id,
      action: "role_changed",
      resource_type: "user_role",
      resource_id: targetUserId,
      details: { new_role: newRole },
    } as any);

    toast.success(tx("تم تعيين الدور بنجاح", "Role assigned successfully"));
    setUsers(prev => prev.map(u => u.user_id === targetUserId ? { ...u, role: newRole } : u));
    setUpdating(null);
  };

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.full_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.phone || "").includes(q);
  });

  return (
    <div className="container py-8 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck size={20} className="text-primary" />
        <h1 className="text-xl font-bold">{tx("إدارة الأدوار", "Role Management")}</h1>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={tx("بحث بالاسم أو الإيميل أو الجوال...", "Search by name, email, or phone...")}
          className="pr-9 text-sm" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{tx("الاسم", "Name")}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{tx("الإيميل", "Email")}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{tx("الجوال", "Phone")}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{tx("الدور", "Role")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const isOwner = u.role === "platform_owner";
                  const isSelf = u.user_id === user?.id;
                  return (
                    <tr key={u.user_id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">{u.full_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{u.email || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs direction-ltr">{u.phone || "—"}</td>
                      <td className="px-4 py-3">
                        {isOwner || isSelf ? (
                          <Badge variant="outline" className="text-[10px]">{roleLabels[u.role] || u.role}</Badge>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Select value={u.role} onValueChange={v => handleRoleChange(u.user_id, v)}
                              disabled={updating === u.user_id}>
                              <SelectTrigger className="w-40 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {assignableRoles.map(r => (
                                  <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {updating === u.user_id && <Loader2 className="w-3 h-3 animate-spin" />}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRolesPage;
