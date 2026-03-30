import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  business_name: z.string().trim().min(2, "اسم النشاط مطلوب (حرفان على الأقل)").max(200),
  commercial_register_number: z.string().trim().min(4, "رقم السجل التجاري مطلوب").max(30),
  id_type: z.enum(["national_id", "iqama", "passport"]),
  id_number: z.string().trim().min(4, "رقم الهوية مطلوب").max(20),
});

const ID_TYPE_OPTIONS = [
  { value: "national_id", label: "هوية وطنية" },
  { value: "iqama", label: "إقامة" },
  { value: "passport", label: "جواز سفر" },
];

const VerifySellerPage = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [form, setForm] = useState({ business_name: "", commercial_register_number: "", id_type: "national_id", id_number: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("يجب تسجيل الدخول أولاً"); return; }

    const result = schema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => { fieldErrors[err.path[0] as string] = err.message; });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("seller_verifications").insert({
      user_id: user.id,
      business_name: result.data.business_name,
      commercial_register_number: result.data.commercial_register_number,
      id_type: result.data.id_type,
      id_number: result.data.id_number,
    } as any);

    setSubmitting(false);
    if (error) {
      toast.error("حدث خطأ أثناء الإرسال");
      return;
    }
    toast.success("تم إرسال طلب التحقق بنجاح ✓");
    navigate("/dashboard");
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>التحقق من هوية البائع</CardTitle>
          <CardDescription>أكمل بياناتك للحصول على شارة "بائع موثق"</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5" dir="rtl">
            <Field label="اسم النشاط التجاري" error={errors.business_name}>
              <Input placeholder="مثال: مؤسسة الرياض التجارية" value={form.business_name} onChange={e => handleChange("business_name", e.target.value)} maxLength={200} />
            </Field>

            <Field label="رقم السجل التجاري" error={errors.commercial_register_number}>
              <Input placeholder="مثال: 1010XXXXXX" value={form.commercial_register_number} onChange={e => handleChange("commercial_register_number", e.target.value)} maxLength={30} />
            </Field>

            <Field label="نوع الهوية" error={errors.id_type}>
              <Select value={form.id_type} onValueChange={v => handleChange("id_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ID_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            <Field label="رقم الهوية" error={errors.id_number}>
              <Input placeholder="مثال: 10XXXXXXXX" value={form.id_number} onChange={e => handleChange("id_number", e.target.value)} maxLength={20} />
            </Field>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري الإرسال...</> : "إرسال طلب التحقق"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default VerifySellerPage;
