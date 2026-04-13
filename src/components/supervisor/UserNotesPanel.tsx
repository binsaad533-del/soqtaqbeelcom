import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { StickyNote, Plus, Loader2 } from "lucide-react";

interface UserNote {
  id: string;
  user_id: string;
  note: string;
  created_by: string;
  created_at: string;
}

interface Props {
  userId: string;
  staffProfiles?: Record<string, string>;
}

export default function UserNotesPanel({ userId, staffProfiles = {} }: Props) {
  const { user } = useAuthContext();
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchNotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_notes" as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setNotes((data as any as UserNote[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchNotes(); }, [userId]);

  const handleAdd = async () => {
    if (!newNote.trim() || !user) return;
    setSaving(true);
    await supabase.from("user_notes" as any).insert({
      user_id: userId,
      note: newNote.trim(),
      created_by: user.id,
    } as any);
    setNewNote("");
    toast.success("تم إضافة الملاحظة");
    await fetchNotes();
    setSaving(false);
  };

  const getStaffName = (id: string) => staffProfiles[id] || "مشرف";

  return (
    <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
      <h3 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
        <StickyNote size={13} className="text-warning" /> ملاحظات داخلية
      </h3>
      <p className="text-[10px] text-muted-foreground mb-3">هذه الملاحظات مرئية فقط للمشرفين والمالك — لا تظهر للعميل</p>

      <div className="flex gap-2 mb-3">
        <Textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="أضف ملاحظة..."
          rows={2}
          className="flex-1 text-xs min-h-[50px]"
        />
        <Button size="sm" onClick={handleAdd} disabled={saving || !newNote.trim()} className="shrink-0">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus size={14} />}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : notes.length === 0 ? (
        <p className="text-center text-[11px] text-muted-foreground py-4">لا توجد ملاحظات</p>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {notes.map(n => (
            <div key={n.id} className="p-2.5 rounded-lg bg-warning/5 border border-warning/10">
              <p className="text-xs leading-relaxed whitespace-pre-wrap">{n.note}</p>
              <p className="text-[9px] text-muted-foreground mt-1">
                {getStaffName(n.created_by)} · {new Date(n.created_at).toLocaleDateString("en-GB")} {new Date(n.created_at).toLocaleTimeString("en-SA", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
