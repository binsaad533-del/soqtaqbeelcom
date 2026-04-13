import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageSquareText, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface ReplyTemplate {
  id: string;
  title: string;
  body: string;
  category: string;
  created_at: string;
}

const categoryLabels: Record<string, string> = {
  general: "عام",
  support: "دعم فني",
  billing: "فواتير",
  warning: "تحذير",
};

interface Props {
  onSelect: (text: string) => void;
}

export default function ReplyTemplatesButton({ onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Partial<ReplyTemplate> | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState("all");

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase.from("reply_templates" as any).select("*").order("created_at", { ascending: true });
    setTemplates((data as any as ReplyTemplate[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchTemplates();
  }, [open]);

  const handleSave = async () => {
    if (!editTemplate?.title?.trim() || !editTemplate?.body?.trim()) return;
    setSaving(true);
    if (editTemplate.id) {
      await supabase.from("reply_templates" as any).update({
        title: editTemplate.title,
        body: editTemplate.body,
        category: editTemplate.category || "general",
      } as any).eq("id", editTemplate.id);
      toast.success("تم تحديث القالب");
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("reply_templates" as any).insert({
        title: editTemplate.title,
        body: editTemplate.body,
        category: editTemplate.category || "general",
        created_by: user?.id,
      } as any);
      toast.success("تم إضافة القالب");
    }
    setEditTemplate(null);
    setEditMode(false);
    setSaving(false);
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("reply_templates" as any).delete().eq("id", id);
    toast.success("تم حذف القالب");
    fetchTemplates();
  };

  const filtered = filterCat === "all" ? templates : templates.filter(t => t.category === filterCat);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5 text-xs">
        <MessageSquareText size={12} /> ردود جاهزة
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center justify-between">
              <span>الردود الجاهزة</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditMode(!editMode)} className="text-[11px]">
                  {editMode ? "إلغاء التعديل" : <><Pencil size={11} /> تعديل</>}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditTemplate({ title: "", body: "", category: "general" }); setEditMode(true); }} className="text-[11px] gap-1">
                  <Plus size={11} /> جديد
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {editTemplate && (
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/30 mb-2">
              <Input value={editTemplate.title || ""} onChange={e => setEditTemplate({ ...editTemplate, title: e.target.value })} placeholder="عنوان القالب" className="text-xs" />
              <Textarea value={editTemplate.body || ""} onChange={e => setEditTemplate({ ...editTemplate, body: e.target.value })} placeholder="نص الرد" rows={3} className="text-xs" />
              <div className="flex gap-2">
                <Select value={editTemplate.category || "general"} onValueChange={v => setEditTemplate({ ...editTemplate, category: v })}>
                  <SelectTrigger className="w-32 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "حفظ"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditTemplate(null)} className="text-xs">إلغاء</Button>
              </div>
            </div>
          )}

          <div className="mb-2">
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">لا توجد قوالب</p>
            ) : (
              filtered.map(t => (
                <div key={t.id} className="p-3 rounded-lg border border-border/30 bg-card hover:border-primary/20 transition-colors cursor-pointer group"
                  onClick={() => { if (!editMode) { onSelect(t.body); setOpen(false); } }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{t.title}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded">{categoryLabels[t.category] || t.category}</span>
                      {editMode && (
                        <>
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); setEditTemplate(t); }}>
                            <Pencil size={10} />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}>
                            <Trash2 size={10} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{t.body}</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
