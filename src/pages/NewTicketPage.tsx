import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTickets } from "@/hooks/useTickets";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createTicket } = useTickets();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useSEO({ title: t("support.metaNew") });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error(t("support.errSubjectRequired"));
      return;
    }
    if (subject.length > 200) {
      toast.error(t("support.errSubjectLong"));
      return;
    }
    if (description.length > 2000) {
      toast.error(t("support.errDescLong"));
      return;
    }
    setSubmitting(true);
    const ticket = await createTicket(subject.trim(), category, description.trim());
    setSubmitting(false);
    if (ticket) {
      toast.success(t("support.submitSuccess"));
      navigate(`/support/ticket/${ticket.id}`);
    } else {
      toast.error(t("support.submitError"));
    }
  };

  return (
    <div className="container py-8 max-w-xl">
      <h1 className="text-xl font-bold mb-6">{t("support.newTitle")}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">{t("support.subject")} *</label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} maxLength={200}
            placeholder={t("support.subjectPlaceholder")} />
          <span className="text-[10px] text-muted-foreground">{subject.length}/200</span>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">{t("support.category")}</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">{t("support.description")} *</label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)}
            maxLength={2000} rows={6}
            placeholder={t("support.descriptionPlaceholder")} />
          <span className="text-[10px] text-muted-foreground">{description.length}/2000</span>
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("support.submit")}
        </Button>
      </form>
    </div>
  );
};

export default NewTicketPage;
