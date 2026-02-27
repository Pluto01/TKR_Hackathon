import { useState, useMemo, useRef, useEffect, RefObject } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import FinancialInput from "@/components/FinancialInput";
import WarningCard from "@/components/WarningCard";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CreditCard,
  Wallet,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const loadingSteps = [
  "Validating financial inputs",
  "Scoring risk model",
  "Compiling recommendations",
];
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const FinancialInputPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const dailySalesRef = useRef<HTMLInputElement>(null);
  const dailyExpensesRef = useRef<HTMLInputElement>(null);
  const receivablesRef = useRef<HTMLInputElement>(null);
  const emiRef = useRef<HTMLInputElement>(null);
  const cashRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef<number | null>(null);
  const navigateTimerRef = useRef<number | null>(null);
  const [fields, setFields] = useState({
    dailySales: "",
    dailyExpenses: "",
    receivables: "",
    emi: "",
    cash: "",
  });

  const update = (key: keyof typeof fields) => (value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const warnings = useMemo(() => {
    const w: { severity: "low" | "medium" | "high"; message: string }[] = [];
    const sales = (Number(fields.dailySales) || 0) * 30;
    const expenses = (Number(fields.dailyExpenses) || 0) * 30;
    const receivables = Number(fields.receivables) || 0;
    const cash = Number(fields.cash) || 0;

    if (sales > 0 && expenses > sales) {
      w.push({ severity: "high", message: "Your expenses exceed your monthly sales. This is unsustainable." });
    }
    if (sales > 0 && receivables > sales * 0.5) {
      w.push({ severity: "medium", message: "High receivables detected — over 50% of your sales are pending collection." });
    }
    if (sales > 0 && cash < expenses * 0.25) {
      w.push({ severity: "high", message: "Cash balance is critically low — less than 1 week of expenses covered." });
    }
    return w;
  }, [fields]);

  const derived = useMemo(() => {
    const monthlySales = (Number(fields.dailySales) || 0) * 30;
    const monthlyExpenses = (Number(fields.dailyExpenses) || 0) * 30;
    return { monthlySales, monthlyExpenses };
  }, [fields]);

  const hasInput = Object.values(fields).some((v) => v !== "");
  const activeStep = progress < 34 ? 0 : progress < 68 ? 1 : 2;

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
      }
      if (navigateTimerRef.current) {
        window.clearTimeout(navigateTimerRef.current);
      }
    };
  }, []);

  const handleAnalyze = async () => {
    if (loading) return;
    setAnalyzeError("");
    // Prevent stale result rendering when new analysis fails.
    localStorage.removeItem("finpilot_prediction");

    const monthlySales = (Number(fields.dailySales) || 0) * 30;
    const monthlyExpenses = (Number(fields.dailyExpenses) || 0) * 30;
    const receivables = Number(fields.receivables) || 0;
    const emi = Number(fields.emi) || 0;
    const cash = Number(fields.cash) || 0;
    const receivablesRatio = monthlySales > 0 ? receivables / monthlySales : 0;
    const margin = monthlySales > 0 ? (monthlySales - monthlyExpenses) / monthlySales : 0;
    const salesMonthlyGrowth = (margin >= 0 ? 0.025 : -0.02) - (receivablesRatio > 0.35 ? 0.01 : 0);
    const expensesMonthlyGrowth = (monthlyExpenses > monthlySales ? 0.04 : 0.015) + (emi > monthlySales * 0.3 ? 0.01 : 0);
    const m2Sales = monthlySales / Math.pow(1 + salesMonthlyGrowth, 2);
    const m1Sales = monthlySales / (1 + salesMonthlyGrowth);
    const m2Expenses = monthlyExpenses / Math.pow(1 + expensesMonthlyGrowth, 2);
    const m1Expenses = monthlyExpenses / (1 + expensesMonthlyGrowth);

    localStorage.setItem(
      "finpilot_analysis",
      JSON.stringify({
        monthlySales,
        monthlyExpenses,
        receivables,
        emi,
        cash,
        salesMonthlyGrowth,
        expensesMonthlyGrowth,
        chart: [
          { month: "M-2", sales: Math.round(m2Sales), expenses: Math.round(m2Expenses) },
          { month: "M-1", sales: Math.round(m1Sales), expenses: Math.round(m1Expenses) },
          { month: "Current", sales: Math.round(monthlySales), expenses: Math.round(monthlyExpenses) },
        ],
      }),
    );

    setLoading(true);
    setProgress(8);

    progressTimerRef.current = window.setInterval(() => {
      setProgress((prev) => Math.min(92, prev + Math.random() * 12 + 3));
    }, 140);

    let userId: number | null = null;
    try {
      const rawUser = localStorage.getItem("finpilot_user");
      const parsedUser = rawUser ? JSON.parse(rawUser) : null;
      if (parsedUser && typeof parsedUser.user_id === "number") {
        userId = parsedUser.user_id;
      }
    } catch {
      userId = null;
    }

    const checkinResponse = userId
      ? await fetch(`${API_BASE}/checkins/daily`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            daily_sales: Number(fields.dailySales) || 0,
            daily_expenses: Number(fields.dailyExpenses) || 0,
            receivables,
            loan_emi: emi,
            cash_balance: cash,
          }),
        })
          .then(async (resp) => {
            if (!resp.ok) return null;
            return await resp.json();
          })
          .catch(() => null)
      : null;

    const predictPayload = userId
      ? {
          user_id: userId,
          use_daily_mode: true,
          receivables,
          loan_emi: emi,
          cash_balance: cash,
        }
      : {
          // Fallback to manual mode only if session user is unavailable.
          monthly_sales: monthlySales,
          monthly_expenses: monthlyExpenses,
          receivables,
          loan_emi: emi,
          cash_balance: cash,
        };

    const predictPromise = fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(predictPayload),
    })
      .then(async (resp) => {
        if (!resp.ok) {
          let detail = "";
          try {
            const err = await resp.json();
            detail = err?.detail ? String(err.detail) : "";
          } catch {
            detail = "";
          }
          return {
            __error: detail || `HTTP ${resp.status} from ${API_BASE}/predict`,
          };
        }
        return await resp.json();
      })
      .catch(() => ({ __error: `Network error while calling ${API_BASE}/predict` }));

    const minLoadingPromise = new Promise((resolve) => window.setTimeout(resolve, 1600));
    const [predictResponse] = await Promise.all([predictPromise, minLoadingPromise]);

    if (predictResponse && !predictResponse.__error) {
      localStorage.setItem("finpilot_prediction", JSON.stringify(predictResponse));
    } else {
      setLoading(false);
      setProgress(0);
      setAnalyzeError(
        predictResponse?.__error ||
          "Could not fetch latest prediction from backend. Please retry.",
      );
      return;
    }
    if (checkinResponse) {
      localStorage.setItem("finpilot_metrics", JSON.stringify(checkinResponse));
    }

    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setProgress(100);
    navigateTimerRef.current = window.setTimeout(() => navigate("/result"), 260);
  };

  const focusRef = (ref: RefObject<HTMLInputElement>) => {
    ref.current?.focus();
  };

  return (
    <AppLayout title={t("input.title")} showBack>
      <div className="space-y-3 mb-6">
        <FinancialInput
          label={t("input.dailySales")}
          icon={TrendingUp}
          value={fields.dailySales}
          onChange={update("dailySales")}
          inputRef={dailySalesRef}
          onEnter={() => focusRef(dailyExpensesRef)}
        />
        <FinancialInput
          label={t("input.dailyExpenses")}
          icon={TrendingDown}
          value={fields.dailyExpenses}
          onChange={update("dailyExpenses")}
          inputRef={dailyExpensesRef}
          onEnter={() => focusRef(receivablesRef)}
        />
        <FinancialInput
          label={t("input.receivables")}
          icon={Clock}
          value={fields.receivables}
          onChange={update("receivables")}
          inputRef={receivablesRef}
          onEnter={() => focusRef(emiRef)}
        />
        <FinancialInput
          label={t("input.loanEmi")}
          icon={CreditCard}
          value={fields.emi}
          onChange={update("emi")}
          inputRef={emiRef}
          onEnter={() => focusRef(cashRef)}
        />
        <FinancialInput
          label={t("input.cashBalance")}
          icon={Wallet}
          value={fields.cash}
          onChange={update("cash")}
          inputRef={cashRef}
          onEnter={() => {
            if (hasInput) handleAnalyze();
          }}
        />
      </div>

      <div className="mb-6 bg-card rounded-2xl p-4 shadow-card border border-border animate-fade-in">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Auto-Calculated Monthly Values
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-border bg-secondary/40 p-3">
            <p className="text-muted-foreground">Current Monthly Sales</p>
            <p className="text-foreground font-semibold">₹{Math.round(derived.monthlySales).toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 p-3">
            <p className="text-muted-foreground">Current Monthly Expenses</p>
            <p className="text-foreground font-semibold">₹{Math.round(derived.monthlyExpenses).toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 p-3">
            <p className="text-muted-foreground">Estimated Net Monthly</p>
            <p className="text-foreground font-semibold">₹{Math.round(derived.monthlySales - derived.monthlyExpenses).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Real-time Warnings */}
      {warnings.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            ⚠️ Real-time Warnings
          </h2>
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <WarningCard key={i} severity={w.severity} message={w.message} />
            ))}
          </div>
        </div>
      )}

      {analyzeError && (
        <div className="mb-6 rounded-xl border border-risk-high/30 bg-risk-high/10 px-3 py-2 text-sm text-risk-high">
          {analyzeError}
        </div>
      )}

      {/* Empty state */}
      {!hasInput && (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">
            Enter your financial details above to see real-time risk warnings.
          </p>
        </div>
      )}

      {/* Sticky Analyze Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border">
        <div className="max-w-lg mx-auto">
          <div
            className={`overflow-hidden transition-all duration-300 ${
              loading ? "max-h-20 opacity-100 mb-3" : "max-h-0 opacity-0 mb-0"
            }`}
          >
            <div className="bg-card rounded-xl border border-border px-3 py-2 shadow-card">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span className="transition-all duration-300">
                  {loadingSteps[activeStep]}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2 bg-secondary/70 mb-2" />
              <div className="grid grid-cols-3 gap-1.5">
                {loadingSteps.map((step, idx) => {
                  const isComplete = progress > 99 || idx < activeStep;
                  const isActive = idx === activeStep && progress < 100;
                  return (
                    <div
                      key={step}
                      className={`rounded-md border px-2 py-1 transition-all duration-300 ${
                        isComplete
                          ? "border-primary/25 bg-primary/10 text-primary"
                          : isActive
                          ? "border-accent/30 bg-accent/10 text-accent animate-pulse"
                          : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isComplete ? (
                          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 flex-shrink-0" />
                        )}
                        <span className="text-[10px] leading-tight truncate">{step}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={!hasInput || loading}
            className="btn-smooth w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 shadow-hero disabled:opacity-40 disabled:shadow-none hover:opacity-90"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t("input.analyzing")}
              </>
            ) : (
              <>
                {t("input.analyze")}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bottom spacer for sticky button */}
      <div className="h-24" />
    </AppLayout>
  );
};

export default FinancialInputPage;
