import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";

const SplashPage = () => {
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);
  const { t } = useLanguage();

  const handleContinue = () => {
    if (exiting) return;
    setExiting(true);
    window.setTimeout(() => navigate("/home"), 760);
  };

  return (
    <button
      type="button"
      onClick={handleContinue}
      className={`min-h-screen w-full flex items-center justify-center px-6 ${
        exiting ? "animate-splash-exit-bg" : "bg-background"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.12),transparent_58%)] transition-opacity duration-500 ${
          exiting ? "opacity-100" : "opacity-50"
        }`}
      />
      <div
        className={`w-full max-w-2xl bg-card rounded-3xl border border-border shadow-elevated p-8 md:p-12 ${
          exiting
            ? "animate-splash-exit-card"
            : "opacity-100 translate-y-0 scale-100 animate-page-enter"
        }`}
      >
        <img
          src="/finpilot-logo.png"
          alt="FINPilot logo"
          className="w-full h-auto object-contain"
        />
        <p className="text-center mt-6 text-sm text-muted-foreground transition-opacity duration-300">
          {exiting ? t("splash.opening") : t("splash.tap")}
        </p>
      </div>
    </button>
  );
};

export default SplashPage;
