import { LucideIcon } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface FactorCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  index: number;
}

const FactorCard = ({ icon: Icon, title, description, impact, index }: FactorCardProps) => {
  const { t } = useLanguage();
  const impactConfig = {
    high: { label: t("impact.high"), color: "bg-risk-high/10 text-risk-high" },
    medium: { label: t("impact.medium"), color: "bg-risk-medium/10 text-risk-medium" },
    low: { label: t("impact.low"), color: "bg-risk-low/10 text-risk-low" },
  };

  return (
    <div
      className="bg-card rounded-2xl p-4 shadow-card border border-border animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${impactConfig[impact].color}`}>
              {impactConfig[impact].label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
};

export default FactorCard;
