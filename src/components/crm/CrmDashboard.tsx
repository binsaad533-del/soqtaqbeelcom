import { useState, useMemo } from "react";
import { useCrmLeads, CRM_STATUSES, type CrmLead } from "@/hooks/useCrmLeads";
import { useProfiles } from "@/hooks/useProfiles";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Loader2, Users, UserPlus, Phone as PhoneIcon, Star, CheckCircle, XCircle, MessageSquare } from "lucide-react";
import CrmLeadDetails from "./CrmLeadDetails";

const CrmDashboard = () => {
  const { leads, loading, updateLead, getLeadActivities, addActivity } = useCrmLeads();
  const { getAllProfiles } = useProfiles();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);

  // Load profiles once
  if (!profilesLoaded) {
    getAllProfiles().then(p => { setProfiles(p); setProfilesLoaded(true); });
  }

  const getProfileName = (userId: string | null) => {
    if (!userId) return "غير محدد";
    return profiles.find((p: any) => p.user_id === userId)?.full_name || "—";
  };

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (statusFilter !== "all") {
      result = result.filter(l => l.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.full_name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.subject.toLowerCase().includes(q)
      );
    }
    return result;
  }, [leads, statusFilter, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: leads.length };
    CRM_STATUSES.forEach(s => { counts[s.value] = leads.filter(l => l.status === s.value).length; });
    return counts;
  }, [leads]);

  if (selectedLead) {
    return (
      <CrmLeadDetails
        lead={selectedLead}
        onBack={() => setSelectedLead(null)}
        getProfileName={getProfileName}
        profiles={profiles}
        updateLead={updateLead}
        getLeadActivities={getLeadActivities}
        addActivity={addActivity}
      />
    );
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {[
          { label: "الكل", value: statusCounts.all, icon: Users, key: "all" },
          { label: "جديد", value: statusCounts.new || 0, icon: UserPlus, key: "new" },
          { label: "تم التواصل", value: statusCounts.contacted || 0, icon: PhoneIcon, key: "contacted" },
          { label: "متابعة", value: statusCounts.follow_up || 0, icon: MessageSquare, key: "follow_up" },
          { label: "مهتم", value: statusCounts.interested || 0, icon: Star, key: "interested" },
          { label: "تم التحويل", value: statusCounts.converted || 0, icon: CheckCircle, key: "converted" },
          { label: "مغلق", value: statusCounts.closed || 0, icon: XCircle, key: "closed" },
        ].map(card => (
          <button
            key={card.key}
            onClick={() => setStatusFilter(card.key)}
            className={cn(
              "bg-card rounded-xl p-3 text-center transition-all border",
              statusFilter === card.key ? "border-primary/30 shadow-sm" : "border-border/30 hover:border-border/60"
            )}
          >
            <card.icon size={14} className="mx-auto mb-1 text-muted-foreground" strokeWidth={1.3} />
            <div className="text-sm font-semibold">{card.value}</div>
            <div className="text-[9px] text-muted-foreground">{card.label}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-72">
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الجوال أو الموضوع..."
          className="pr-9 text-sm rounded-xl"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-right text-[11px]">الاسم</TableHead>
              <TableHead className="text-right text-[11px]">الجوال</TableHead>
              <TableHead className="text-right text-[11px]">الموضوع</TableHead>
              <TableHead className="text-right text-[11px]">التاريخ</TableHead>
              <TableHead className="text-right text-[11px]">الحالة</TableHead>
              <TableHead className="text-right text-[11px]">المسؤول</TableHead>
              <TableHead className="text-right text-[11px]">آخر تحديث</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.map(lead => {
              const statusObj = CRM_STATUSES.find(s => s.value === lead.status);
              return (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => setSelectedLead(lead)}
                >
                  <TableCell className="text-xs font-medium">{lead.full_name}</TableCell>
                  <TableCell className="text-xs" dir="ltr">{lead.phone}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{lead.subject}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(lead.created_at).toLocaleDateString("en-US")}
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-md", statusObj?.color || "bg-muted")}>
                      {statusObj?.label || lead.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">{getProfileName(lead.assigned_to)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(lead.updated_at).toLocaleDateString("en-US")}
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredLeads.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-12">
                  لا توجد عملاء محتملين
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-[10px] text-muted-foreground text-center">{filteredLeads.length} عميل محتمل</p>
    </div>
  );
};

export default CrmDashboard;
