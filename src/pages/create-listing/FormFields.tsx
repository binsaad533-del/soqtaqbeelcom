import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toEnglishNumerals } from "@/lib/arabicNumerals";

export const FormField = ({ label, placeholder, suffix, value, onChange, error, numericOnly }: {
  label: string;
  placeholder: string;
  suffix?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  numericOnly?: boolean;
}) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <div className="relative">
      <input
        type="text"
        inputMode={numericOnly ? "decimal" : "text"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          const raw = toEnglishNumerals(e.target.value);
          if (numericOnly) {
            const cleaned = raw.replace(/[^\d.]/g, "");
            onChange(cleaned);
          } else {
            onChange(raw);
          }
        }}
        className={cn(
          "w-full px-3 py-2 rounded-lg border bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 transition-all",
          suffix && "pl-10",
          error ? "border-destructive/60 focus:border-destructive/60 focus:ring-destructive/30" : "border-border/50 focus:border-primary/30 focus:ring-primary/20"
        )}
      />
      {suffix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">{suffix}</span>}
    </div>
    {error && <p className="text-[11px] text-destructive mt-1 flex items-center gap-1"><AlertTriangle size={11} /> {error}</p>}
  </div>
);

export const SelectField = ({ label, options, value, onChange, error, placeholder }: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
}) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(
      "w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-1 transition-all",
      error ? "border-destructive/60 focus:border-destructive/60 focus:ring-destructive/30" : "border-border/50 focus:border-primary/30 focus:ring-primary/20"
    )}>
      <option value="">{placeholder ?? "اختر..."}</option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
    {error && <p className="text-[11px] text-destructive mt-1 flex items-center gap-1"><AlertTriangle size={11} /> {error}</p>}
  </div>
);
