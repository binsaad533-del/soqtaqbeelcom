import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const ThemeToggle = () => {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
      title={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
    >
      {theme === "dark" ? (
        <Sun size={17} strokeWidth={1.5} />
      ) : (
        <Moon size={17} strokeWidth={1.5} />
      )}
    </button>
  );
};

export default ThemeToggle;
