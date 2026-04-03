import { useState } from "react";
import { ChevronDown, Globe, Bot, MessageSquare, Lock, Settings, ExternalLink } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SOCIAL_LINKS } from "@/lib/socialLinks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SECTIONS = [
  { id: "platform", label: "إعدادات المنصة", desc: "الإعدادات العامة للمنصة", icon: Settings },
  { id: "social", label: "حسابات السوشل ميديا", desc: "تعديل روابط الحسابات الرسمية", icon: Globe },
  { id: "ai", label: "إدارة الذكاء الاصطناعي", desc: "إعدادات الـAI والنماذج", icon: Bot },
  { id: "complaints", label: "إدارة الشكاوى والتواصل", desc: "رسائل التواصل والدعم", icon: MessageSquare },
  { id: "security", label: "إعدادات الأمان", desc: "سياسات الحماية والصلاحيات", icon: Lock },
] as const;

const OwnerSettingsPanel = () => {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggle = (id: string) => setOpenSection(prev => prev === id ? null : id);

  return (
    <div className="space-y-3">
      {SECTIONS.map((s) => {
        const Icon = s.icon;
        const isOpen = openSection === s.id;
        return (
          <Collapsible key={s.id} open={isOpen} onOpenChange={() => toggle(s.id)}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between p-4 rounded-xl border border-border/40 bg-card hover:bg-accent/30 transition-all cursor-pointer text-start">
                <div className="flex items-center gap-3">
                  <Icon size={18} className="text-muted-foreground shrink-0" />
                  <div>
                    <div className="text-sm font-medium">{s.label}</div>
                    <div className="text-[11px] text-muted-foreground">{s.desc}</div>
                  </div>
                </div>
                <ChevronDown size={16} className={cn("text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 px-1">
              <div className="rounded-xl border border-border/30 bg-muted/20 p-5 space-y-4">
                {s.id === "platform" && <PlatformSettings />}
                {s.id === "social" && <SocialSettings />}
                {s.id === "ai" && <AiSettings />}
                {s.id === "complaints" && <ComplaintsSettings />}
                {s.id === "security" && <SecuritySettings />}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
};

/* ─── Sub-panels ─── */

function PlatformSettings() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">اسم المنصة</Label>
          <Input defaultValue="سوق تقبيل" className="text-sm" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">البريد الرسمي</Label>
          <Input defaultValue="info@soqtaqbeel.com" className="text-sm" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">وضع الصيانة</p>
          <p className="text-[11px] text-muted-foreground">تعطيل الوصول للموقع مؤقتاً</p>
        </div>
        <Switch />
      </div>
      <Button size="sm" className="text-xs" onClick={() => toast.success("تم حفظ الإعدادات")}>حفظ التغييرات</Button>
    </div>
  );
}

function SocialSettings() {
  const platforms = [
    { key: "linkedin", label: "لينكدإن" },
    { key: "x", label: "إكس (تويتر)" },
    { key: "tiktok", label: "تيك توك" },
    { key: "snapchat", label: "سناب شات" },
  ] as const;

  return (
    <div className="space-y-3">
      {platforms.map((p) => (
        <div key={p.key}>
          <Label className="text-xs text-muted-foreground mb-1.5 block">{p.label}</Label>
          <div className="flex gap-2 items-center">
            <Input defaultValue={SOCIAL_LINKS[p.key]} className="text-sm font-mono text-xs" dir="ltr" />
            <a href={SOCIAL_LINKS[p.key]} target="_blank" rel="noopener noreferrer" className="shrink-0 p-2 rounded-md hover:bg-accent/50 transition-colors">
              <ExternalLink size={14} className="text-muted-foreground" />
            </a>
          </div>
        </div>
      ))}
      <Button size="sm" className="text-xs" onClick={() => toast.success("تم تحديث الروابط")}>حفظ الروابط</Button>
    </div>
  );
}

function AiSettings() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">المساعد الذكي</p>
          <p className="text-[11px] text-muted-foreground">تفعيل مساعد الذكاء الاصطناعي للمستخدمين</p>
        </div>
        <Switch defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">فحص الصفقات بالذكاء الاصطناعي</p>
          <p className="text-[11px] text-muted-foreground">تقييم تلقائي للصفقات</p>
        </div>
        <Switch defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">توليد المقالات</p>
          <p className="text-[11px] text-muted-foreground">إنشاء محتوى المدوّنة تلقائياً</p>
        </div>
        <Switch defaultChecked />
      </div>
      <Button size="sm" className="text-xs" onClick={() => toast.success("تم حفظ إعدادات الذكاء الاصطناعي")}>حفظ</Button>
    </div>
  );
}

function ComplaintsSettings() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">إشعارات الشكاوى الجديدة</p>
          <p className="text-[11px] text-muted-foreground">إرسال إشعار فوري عند ورود شكوى</p>
        </div>
        <Switch defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">الرد التلقائي</p>
          <p className="text-[11px] text-muted-foreground">إرسال رسالة استلام تلقائية</p>
        </div>
        <Switch defaultChecked />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">بريد استقبال الشكاوى</Label>
        <Input defaultValue="support@soqtaqbeel.com" className="text-sm" dir="ltr" />
      </div>
      <Button size="sm" className="text-xs" onClick={() => toast.success("تم حفظ إعدادات التواصل")}>حفظ</Button>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">تسجيل الأنشطة</p>
          <p className="text-[11px] text-muted-foreground">تسجيل كل العمليات الحساسة</p>
        </div>
        <Switch defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">كشف الاحتيال التلقائي</p>
          <p className="text-[11px] text-muted-foreground">فحص الإعلانات والصفقات بشكل آلي</p>
        </div>
        <Switch defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">قفل الحسابات المشبوهة</p>
          <p className="text-[11px] text-muted-foreground">تعليق تلقائي عند اكتشاف سلوك مريب</p>
        </div>
        <Switch />
      </div>
      <Button size="sm" className="text-xs" onClick={() => toast.success("تم حفظ إعدادات الأمان")}>حفظ</Button>
    </div>
  );
}

export default OwnerSettingsPanel;
