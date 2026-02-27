import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserCircle2, LogOut, Repeat } from "lucide-react";
import { LANGUAGE_OPTIONS, useLanguage } from "@/lib/i18n";
import { Moon, Sun } from "lucide-react";
import { useThemeMode } from "@/lib/theme";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  action?: React.ReactNode;
  contentClassName?: string;
}

const AppLayout = ({ children, title, showBack = false, action, contentClassName }: AppLayoutProps) => {
  const navigate = useNavigate();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useThemeMode();
  const clearSession = () => {
    localStorage.removeItem("finpilot_user");
    localStorage.removeItem("finpilot_prediction");
    localStorage.removeItem("finpilot_analysis");
    localStorage.removeItem("finpilot_metrics");
  };

  return (
    <div className="min-h-screen bg-background">
      {(title || showBack) && (
        <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            {showBack && (
              <button
                onClick={() => navigate(-1)}
                className="btn-smooth p-1.5 -ml-1.5 rounded-lg hover:bg-secondary"
              >
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="btn-smooth rounded-lg p-1 hover:bg-secondary"
            >
              <img
                src="/finpilot-logo.png"
                alt="FINPilot"
                className="h-7 w-auto object-contain"
              />
            </button>
            {title && (
              <h1 className="text-lg font-semibold text-foreground flex-1">{title}</h1>
            )}
            {action && <div>{action}</div>}
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as "en" | "hi" | "te")}
              className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground"
              aria-label="Language selector"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={toggleTheme}
              className="btn-smooth rounded-lg border border-border p-1.5 hover:bg-secondary"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-foreground" />
              ) : (
                <Moon className="w-4 h-4 text-foreground" />
              )}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="btn-smooth rounded-lg p-1.5 hover:bg-secondary"
                  aria-label={t("app.openMenu")}
                >
                  <UserCircle2 className="w-5 h-5 text-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    clearSession();
                    navigate("/home");
                  }}
                >
                  <Repeat className="w-4 h-4 mr-2" />
                  {t("app.switchUser")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    clearSession();
                    navigate("/");
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("app.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
      )}
      <main className={`mx-auto px-4 py-6 animate-page-enter ${contentClassName || "max-w-lg"}`}>
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
