import { checkPasswordStrength, PASSWORD_STRENGTH_LABELS, PASSWORD_STRENGTH_COLORS } from "@/lib/security";
import { cn } from "@/lib/utils";

interface Props {
  password: string;
}

const PasswordStrengthBar = ({ password }: Props) => {
  if (!password) return null;

  const { score, issues } = checkPasswordStrength(password);

  return (
    <div className="space-y-1.5" dir="rtl">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < score ? PASSWORD_STRENGTH_COLORS[score] : "bg-muted"
            )}
          />
        ))}
      </div>
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground">{PASSWORD_STRENGTH_LABELS[score]}</span>
      </div>
      {issues.length > 0 && (
        <ul className="space-y-0.5">
          {issues.map((issue, i) => (
            <li key={i} className="text-[10px] text-muted-foreground">• {issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PasswordStrengthBar;
