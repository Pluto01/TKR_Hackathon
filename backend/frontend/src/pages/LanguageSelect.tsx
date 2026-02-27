import { useNavigate } from "react-router-dom";
import { Globe } from "lucide-react";
import { LANGUAGE_OPTIONS, useLanguage } from "@/lib/i18n";

const languages = [
  { code: "en", native: "English" },
  { code: "hi", native: "Hindi" },
  { code: "te", native: "Telugu" },
];

const LanguageSelect = () => {
  const navigate = useNavigate();
  const { t, setLang } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-10">
          <img
            src="/finpilot-logo.png"
            alt="FINPilot"
            className="h-20 w-auto object-contain mb-4 animate-float-soft"
          />
          <h1 className="text-2xl font-bold text-foreground text-center">
            {t("language.title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-2 text-center">
            {t("language.subtitle")}
          </p>
        </div>

        {/* Language Selection */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{t("language.choose")}</span>
          </div>
          <div className="space-y-3 stagger-fade">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  const selected = LANGUAGE_OPTIONS.find((opt) => opt.code === lang.code);
                  setLang(lang.code as "en" | "hi" | "te");
                  if (!selected) return;
                  navigate("/input");
                }}
                className="btn-smooth w-full bg-card rounded-2xl p-4 shadow-card border border-border text-left hover:shadow-elevated hover:border-primary/30 group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {t(`lang.${lang.native.toLowerCase()}`)}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">{lang.native}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-primary">
                      {lang.code.toUpperCase()}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {t("language.footer")}
        </p>
      </div>
    </div>
  );
};

export default LanguageSelect;
