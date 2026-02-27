import { useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import FactorCard from "@/components/FactorCard";
import { TrendingDown, CreditCard, Wallet } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const ExplanationPage = () => {
  const { t, tr } = useLanguage();
  const prediction = useMemo(() => {
    try {
      const raw = localStorage.getItem("finpilot_prediction");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const reasons: string[] = prediction?.reasons || [];
  const llmDrivers: string[] = prediction?.llm_explanation_ui?.key_drivers || [];
  const drivers = (llmDrivers.length ? llmDrivers : reasons).slice(0, 4);

  const factors = drivers.map((driver: string, i: number) => ({
    icon: i % 3 === 0 ? TrendingDown : i % 3 === 1 ? CreditCard : Wallet,
    title: `${tr("Driver")} ${i + 1}`,
    description: tr(driver),
    impact: i < 2 ? ("high" as const) : ("medium" as const),
  }));

  return (
    <AppLayout title={t("explanation.title")} showBack>
      <div className="mb-6 animate-fade-in">
        <h2 className="text-xl font-bold text-foreground mb-2">
          {t("explanation.heading")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {tr("These are the main factors currently increasing risk in your business.")}
        </p>
      </div>

      <div className="space-y-3 stagger-fade">
        {factors.length ? factors.map((factor, i) => (
          <FactorCard key={i} index={i} {...factor} />
        )) : (
          <div className="bg-card rounded-2xl p-4 shadow-card border border-border text-sm text-muted-foreground">
            {tr("Analyze your financial data first to view personalized risk drivers.")}
          </div>
        )}
      </div>

      {/* Tip */}
      <div className="mt-6 bg-primary/5 rounded-2xl p-4 border border-primary/10 animate-fade-in" style={{ animationDelay: "400ms" }}>
        <p className="text-sm text-foreground/80 leading-relaxed">
          💡 <strong>Tip:</strong> Addressing the highest impact factors first will have the greatest effect on reducing your overall risk score.
        </p>
      </div>
    </AppLayout>
  );
};

export default ExplanationPage;
