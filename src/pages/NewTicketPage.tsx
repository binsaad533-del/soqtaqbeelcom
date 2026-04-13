import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTickets } from "@/hooks/useTickets";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const categories = [
  { value: "general", label: "عام" },
  { value: "technical", label: "تقني" },
  { value: "billing", label: "فواتير" },
  { value: "complaint", label: "شكوى" },
  { value: "suggestion", label: "اقتراح" },
  { value: "other", label: "أخرى" },
];

const NewTicketPage = () => {
  const { tx } = useLanguage();
  const navigate = useNavigate();
  const { createTicket } = useTickets();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useSEO({ title: tx("تذكرة جديدة | سوق تقبيل", "New Ticket | Soq Taqbeel") });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error(tx("الموضوع والوصف مطلوبان", "Subject and description are required"));
      return;
    }
    if (subject.length > 200) {
      toast.error(tx("الموضوع طويل جداً (200 حرف كحد أقصى)", "Subject too long (max 200 chars)"));
      return;
    }
    if (description.length > 2000) {
      toast.error(tx("الوصف طويل جداً (2000 حرف كحد أقصى)", "Description too long (max 2000 chars)"));
      return;
    }
    setSubmitting(true);
    const ticket = await createTicket(subject.trim(), category, description.trim());
    setSubmitting(false);
    if (ticket) {
      toast.success(tx("تم إرسال تذكرتك — سنرد عليك قريباً", "Ticket submitted — we'll respond soon"));
      navigate(`/support/ticket/${ticket.id}`);
    } else {
      toast.error(tx("حدث خطأ — حاول مرة أخرى", "Error — please try again"));
    }
  };

  return (
    <div className="container py-8 max-w-xl">
      <h1 className="text-xl font-bold mb-6">{tx("تذكرة دعم جديدة", "New Support Ticket")}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">{tx("الموضوع", "Subject")} *</label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} maxLength={200}
            placeholder={tx("اكتب موضوع التذكرة...", "Write ticket subject...")} />
          <span className="text-[10px] text-muted-foreground">{subject.length}/200</span>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">{tx("التصنيف", "Category")}</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">{tx("الوصف", "Description")} *</label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)}
            maxLength={2000} rows={6}
            placeholder={tx("اشرح المشكلة أو الطلب بالتفصيل...", "Describe the issue in detail...")} />
          <span className="text-[10px] text-muted-foreground">{description.length}/2000</span>
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : tx("إرسال التذكرة", "Submit Ticket")}
        </Button>
      </form>
    </div>
  );
};

export default NewTicketPage;
