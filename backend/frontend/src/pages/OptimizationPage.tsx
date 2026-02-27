import { useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import ActionCard from "@/components/ActionCard";
import { Receipt, Scissors, RefreshCcw } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const OptimizationPage = () => {
  const { t, tr } = useLanguage();
  const prediction = useMemo(() => {
    try {
      const raw = localStorage.getItem("finpilot_prediction");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const llmActions: string[] = prediction?.llm_explanation_ui?.immediate_actions || [];
  const actionsFallback: string[] = prediction?.actions || [];
  const actions = (llmActions.length ? llmActions : actionsFallback).slice(0, 4).map((action: string, i: number) => ({
    icon: i % 3 === 0 ? Receipt : i % 3 === 1 ? Scissors : RefreshCcw,
    title: `${tr("Action")} ${i + 1}`,
    description: tr(action),
    impact: tr("High priority"),
  }));

  return (
    <AppLayout title={t("optimization.title")} showBack>
      <div className="mb-6 animate-fade-in">
        <h2 className="text-xl font-bold text-foreground mb-2">
          {t("optimization.heading")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {tr("Start with these simple next steps to reduce risk.")}
        </p>
      </div>

      <div className="space-y-3">
        {actions.length ? actions.map((action, i) => (
          <ActionCard key={i} index={i} {...action} />
        )) : (
          <div className="bg-card rounded-2xl p-4 shadow-card border border-border text-sm text-muted-foreground">
            {tr("Analyze your financial data first to view personalized recommendations.")}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-6 bg-accent/5 rounded-2xl p-4 border border-accent/10 animate-fade-in" style={{ animationDelay: "400ms" }}>
        <p className="text-sm text-foreground/80 leading-relaxed">
          ✅ Focus on the first one or two actions this week for the fastest improvement.
        </p>
      </div>
    </AppLayout>
  );
};

export default OptimizationPage;
