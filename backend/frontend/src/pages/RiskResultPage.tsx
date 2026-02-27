import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import RiskGauge from "@/components/RiskGauge";
import { Brain, Lightbulb, LayoutDashboard } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const RiskResultPage = () => {
  const navigate = useNavigate();
  const { t, tr } = useLanguage();

  const { prediction, analysis } = useMemo(() => {
    const parse = (value: string | null) => {
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    };
    return {
      prediction: parse(localStorage.getItem("finpilot_prediction")),
      analysis: parse(localStorage.getItem("finpilot_analysis")),
    };
  }, []);

  const riskPercent = Number(prediction?.risk_score ?? 78);
  const riskLevelRaw = String(prediction?.risk_level ?? "HIGH");
  const riskLevel =
    riskLevelRaw === "LOW" || riskLevelRaw === "MEDIUM" || riskLevelRaw === "HIGH"
      ? (riskLevelRaw as "LOW" | "MEDIUM" | "HIGH")
      : "HIGH";

  const llmUi = prediction?.llm_explanation_ui;
  const summaryText =
    tr(
      llmUi?.summary ||
        "Your business shows elevated risk based on the financial indicators provided.",
    );
  const priorityAction = prediction?.priority_action;

  const monthlyExpenses = Number(analysis?.monthlyExpenses || 0);
  const monthlySales = Number(analysis?.monthlySales || 0);
  const cash = Number(analysis?.cash || 0);
  const receivables = Number(analysis?.receivables || 0);
  const runway = monthlyExpenses > 0 ? cash / monthlyExpenses : 0;
  const collectionDays = monthlySales > 0 ? (receivables / monthlySales) * 30 : 0;

  return (
    <AppLayout title={t("result.title")} showBack>
      {/* Hero Card */}
      <div className="bg-card rounded-3xl p-6 shadow-elevated border border-border mb-6 animate-scale-in">
        <h2 className="text-sm font-semibold text-muted-foreground text-center mb-4 uppercase tracking-wider">
          {t("result.score")}
        </h2>
        <RiskGauge percentage={riskPercent} level={riskLevel} />
        <p className="text-sm text-muted-foreground text-center mt-4 leading-relaxed">
          {summaryText}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6 stagger-fade">
        {[
          {
            label: "Burn Rate",
            value: monthlyExpenses ? `₹${(monthlyExpenses / 100000).toFixed(1)}L/mo` : "N/A",
            color: monthlyExpenses > monthlySales ? "text-risk-high" : "text-risk-medium",
          },
          {
            label: "Runway",
            value: runway ? `${runway.toFixed(1)} mo` : "N/A",
            color: runway < 1 ? "text-risk-high" : "text-risk-medium",
          },
          {
            label: "Collection",
            value: collectionDays ? `${Math.round(collectionDays)} days` : "N/A",
            color: collectionDays > 45 ? "text-risk-high" : "text-risk-medium",
          },
        ].map((stat, i) => (
          <div key={i} className="bg-card rounded-2xl p-3 shadow-card border border-border text-center animate-fade-in" style={{ animationDelay: `${(i + 1) * 150}ms` }}>
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{tr(stat.label)}</p>
          </div>
        ))}
      </div>

      {llmUi && (
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-6 animate-fade-in">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t("result.aiExplanation")}
          </h3>
          <p className="text-sm text-foreground/90 leading-relaxed mb-3">{tr(llmUi.summary)}</p>
          <div className="grid grid-cols-1 gap-2">
            {(llmUi.key_drivers || []).slice(0, 3).map((driver: string, idx: number) => (
              <div key={`${driver}-${idx}`} className="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground">
                {tr(driver)}
              </div>
            ))}
          </div>
        </div>
      )}

      {priorityAction && (
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-6 animate-fade-in">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t("result.highestFix")}
          </h3>
          <div className="rounded-xl border border-border bg-accent/10 px-3 py-3">
            <p className="text-sm font-semibold text-foreground">{tr(priorityAction.top_fix)}</p>
            <p className="text-sm text-foreground/80 mt-1">
              {tr("Target amount:")} <strong>₹{Number(priorityAction.target_amount).toLocaleString()}</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-2">{tr(priorityAction.expected_impact)}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3 stagger-fade">
        <button
          onClick={() => navigate("/explanation")}
          className="btn-smooth w-full bg-card rounded-2xl p-4 shadow-card border border-border flex items-center gap-3 hover:shadow-elevated text-left group"
        >
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{tr("Why is the risk high?")}</h3>
            <p className="text-sm text-muted-foreground">{tr("Understand key risk factors")}</p>
          </div>
        </button>

        <button
          onClick={() => navigate("/optimization")}
          className="btn-smooth w-full bg-card rounded-2xl p-4 shadow-card border border-border flex items-center gap-3 hover:shadow-elevated text-left group"
        >
          <div className="p-2.5 rounded-xl bg-accent/10">
            <Lightbulb className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">{tr("Get Recommendations")}</h3>
            <p className="text-sm text-muted-foreground">{tr("Actionable steps to reduce risk")}</p>
          </div>
        </button>

        <button
          onClick={() => navigate("/dashboard")}
          className="btn-smooth w-full bg-card rounded-2xl p-4 shadow-card border border-border flex items-center gap-3 hover:shadow-elevated text-left group"
        >
          <div className="p-2.5 rounded-xl bg-secondary">
            <LayoutDashboard className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{t("result.viewDashboard")}</h3>
            <p className="text-sm text-muted-foreground">{tr("Full summary & trends")}</p>
          </div>
        </button>
      </div>
    </AppLayout>
  );
};

export default RiskResultPage;
