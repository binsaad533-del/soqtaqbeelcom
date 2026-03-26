import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toEnglishNumerals } from "@/lib/arabicNumerals";

export const FormField = ({ label, placeholder, suffix, value, onChange, error }: {
  label: string;
  placeholder: string;
  suffix?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(toEnglishNumerals(e.target.value))}
        className={cn(
          "w-full px-3 py-2 rounded-lg border bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 transition-all",
          error ? "border-destructive/60 focus:border-destructive/60 focus:ring-destructive/30" : "border-border/50 focus:border-primary/30 focus:ring-primary/20"
        )}
      />
      {suffix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
    </div>
    {error && <p className="text-[11px] text-destructive mt-1 flex items-center gap-1"><AlertTriangle size={11} /> {error}</p>}
  </div>
);

export const SelectField = ({ label, options, value, onChange }: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all">
      <option value="">اختر...</option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  </div>
);
