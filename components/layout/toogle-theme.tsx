import { useTheme } from "next-themes";
import { Button } from "../ui/button";
import { Moon, Sun } from "lucide-react";

export const ToggleTheme = () => {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      size="icon"
      variant="ghost"
      aria-label={
        resolvedTheme === "dark"
          ? "Chuyển sang giao diện sáng"
          : "Chuyển sang giao diện tối"
      }
      title={resolvedTheme === "dark" ? "Giao diện sáng" : "Giao diện tối"}
      className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <div className="flex dark:hidden">
        <Moon className="h-5 w-5" />
      </div>

      <div className="hidden dark:flex">
        <Sun className="h-5 w-5" />
      </div>
    </Button>
  );
};
