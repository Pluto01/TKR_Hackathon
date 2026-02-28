import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import RiskGauge from "@/components/RiskGauge";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, Legend } from "recharts";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info, HelpCircle } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/lib/i18n";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const REQUEST_TIMEOUT_MS = 60000;
const TOUR_STORAGE_KEY = "finpilot_dashboard_tour_done_v1";
const formatINR = (value: number) => `₹${Number(value || 0).toLocaleString()}`;
const metricsCacheKey = (userId: number) => `finpilot_metrics_user_${userId}`;
const historyCacheKey = (userId: number) => `finpilot_history_user_${userId}`;
const predictionCacheKey = (userId: number) => `finpilot_prediction_user_${userId}`;

const renderTrendTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload || {};
  const sales = Number(point.sales || 0);
  const expenses = Number(point.expenses || 0);
  const net = Number(point.net || sales - expenses);
  const margin = sales > 0 ? (net / sales) * 100 : 0;
  const observedDays = Number(point.observedDays || 0);

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-elevated min-w-[210px]">
      <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
      <div className="space-y-1 text-xs">
        <p className="text-risk-low">Sales: {formatINR(sales)}</p>
        <p className="text-risk-high">Expenses: {formatINR(expenses)}</p>
        <p className={net >= 0 ? "text-risk-low" : "text-risk-high"}>
          Net: {net >= 0 ? "+" : "-"}
          {formatINR(Math.abs(net))}
        </p>
        <p className="text-muted-foreground">Profit Margin: {margin.toFixed(1)}%</p>
        {observedDays > 0 ? <p className="text-muted-foreground">Data points: {observedDays} days</p> : null}
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { t, tr } = useLanguage();
  const [metrics, setMetrics] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [prediction, setPrediction] = useState<any>(null);
  const [trendView, setTrendView] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourCoachStyle, setTourCoachStyle] = useState<CSSProperties>({});
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const actionsCardRef = useRef<HTMLDivElement>(null);
  const indicatorsRef = useRef<HTMLDivElement>(null);
  const timeAnalysisRef = useRef<HTMLDivElement>(null);
  const survivalRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const analysis = useMemo(() => {
    try {
      const raw = localStorage.getItem("finpilot_analysis");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const withTimeout = (url: string, options?: RequestInit) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => window.clearTimeout(timeoutId));
  };

  const refreshPrediction = async (userId: number, metricsInput?: any) => {
    const source = metricsInput || metrics || {};
    const payload = {
      user_id: Number(userId),
      use_daily_mode: true,
      receivables: Number(source?.monthly_receivables || 0),
      loan_emi: Number(source?.monthly_loan_emi || 0),
      cash_balance: Number(source?.monthly_cash_balance || 0),
    };
    const resp = await withTimeout(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) return;
    const data = await resp.json().catch(() => null);
    if (!data) return;
    setPrediction(data);
    localStorage.setItem("finpilot_prediction", JSON.stringify(data));
    localStorage.setItem(predictionCacheKey(userId), JSON.stringify(data));
  };

  useEffect(() => {
    const run = async () => {
      try {
        const rawUser = localStorage.getItem("finpilot_user");
        const user = rawUser ? JSON.parse(rawUser) : null;
        if (!user?.user_id) return;
        const userId = Number(user.user_id);

        // Show cached user-specific data immediately after re-login.
        try {
          const cachedMetrics = localStorage.getItem(metricsCacheKey(userId));
          if (cachedMetrics) {
            const parsed = JSON.parse(cachedMetrics);
            setMetrics(parsed);
            localStorage.setItem("finpilot_metrics", JSON.stringify(parsed));
          }
        } catch {
          // ignore cache parse errors
        }
        try {
          const cachedHistory = localStorage.getItem(historyCacheKey(userId));
          if (cachedHistory) {
            const parsed = JSON.parse(cachedHistory);
            setHistory(Array.isArray(parsed) ? parsed : []);
          }
        } catch {
          // ignore cache parse errors
        }
        try {
          const cachedPrediction = localStorage.getItem(predictionCacheKey(userId));
          if (cachedPrediction) {
            const parsed = JSON.parse(cachedPrediction);
            setPrediction(parsed);
            localStorage.setItem("finpilot_prediction", JSON.stringify(parsed));
          }
        } catch {
          // ignore cache parse errors
        }

        const [metricsResp, historyResp] = await Promise.all([
          withTimeout(`${API_BASE}/users/${userId}/metrics`),
          withTimeout(`${API_BASE}/users/${userId}/checkins`),
        ]);
        if (metricsResp.ok) {
          const data = await metricsResp.json();
          setMetrics(data);
          localStorage.setItem("finpilot_metrics", JSON.stringify(data));
          localStorage.setItem(metricsCacheKey(userId), JSON.stringify(data));
          await refreshPrediction(userId, data);
        }
        if (historyResp.ok) {
          const rows = await historyResp.json();
          const safeRows = Array.isArray(rows) ? rows : [];
          setHistory(safeRows);
          localStorage.setItem(historyCacheKey(userId), JSON.stringify(safeRows));
        }
      } catch {
        try {
          const rawMetrics = localStorage.getItem("finpilot_metrics");
          setMetrics(rawMetrics ? JSON.parse(rawMetrics) : null);
        } catch {
          setMetrics(null);
        }
      }
    };
    run();
  }, []);

  const tourSteps = useMemo(
    () => [
      {
        title: tr("Welcome to your dashboard"),
        description: tr("Start by adding today's data or uploading historical CSV to build accurate trends."),
        target: actionsCardRef,
        anchor: "right" as const,
      },
      {
        title: tr("Key indicators"),
        description: tr("These cards quickly show whether revenue, expenses, debt pressure, and cash health are improving."),
        target: indicatorsRef,
        anchor: "left" as const,
      },
      {
        title: tr("Time analysis"),
        description: tr("Switch between daily, weekly, and monthly views to spot spikes, slowdowns, and seasonality."),
        target: timeAnalysisRef,
        anchor: "right" as const,
      },
      {
        title: tr("Survival analysis"),
        description: tr("Track runway, days left, monthly loss, and break-even target to avoid cash crunch."),
        target: survivalRef,
        anchor: "right" as const,
      },
      {
        title: tr("Suggested improvements"),
        description: tr("Follow these actions first to reduce risk fastest. Re-check daily after updates."),
        target: suggestionsRef,
        anchor: "right" as const,
      },
    ],
    [tr],
  );

  useEffect(() => {
    if (localStorage.getItem(TOUR_STORAGE_KEY) === "1") return;
    setTourOpen(true);
    setTourStep(0);
  }, []);

  useEffect(() => {
    if (!tourOpen) return;
    const target = tourSteps[tourStep]?.target?.current;
    if (!target) return;
    window.setTimeout(() => {
      const rect = target.getBoundingClientRect();
      const isVisible = rect.top >= 88 && rect.bottom <= window.innerHeight - 88;
      if (!isVisible) {
        target.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 120);
  }, [tourOpen, tourStep, tourSteps]);

  useEffect(() => {
    if (!tourOpen) return;

    const placeCoach = () => {
      const target = tourSteps[tourStep]?.target?.current;
      const viewportPadding = 10;
      const topMin = 64;
      const coachWidth = Math.min(320, window.innerWidth - viewportPadding * 2);
      const estimatedHeight = 148;

      if (!target) {
        setTourCoachStyle({
          left: viewportPadding,
          top: topMin,
          width: coachWidth,
        });
        return;
      }

      const rect = target.getBoundingClientRect();
      const roomRight = window.innerWidth - rect.right;
      const roomLeft = rect.left;
      const anchor = tourSteps[tourStep]?.anchor;
      let left = rect.left + 8;

      if (anchor === "right" && roomRight > coachWidth + 16) {
        left = rect.right + 12;
      } else if (anchor === "left" && roomLeft > coachWidth + 16) {
        left = rect.left - coachWidth - 12;
      } else if (roomRight > coachWidth + 16) {
        left = rect.right + 12;
      } else if (roomLeft > coachWidth + 16) {
        left = rect.left - coachWidth - 12;
      } else {
        left = rect.left + 8;
      }
      left = Math.max(viewportPadding, Math.min(left, window.innerWidth - coachWidth - viewportPadding));

      const preferredTop = rect.top + 8;
      const aboveTop = rect.top - estimatedHeight - 12;
      const belowTop = rect.bottom + 10;
      let top = preferredTop;
      if (top + estimatedHeight > window.innerHeight - viewportPadding) {
        top = aboveTop >= topMin ? aboveTop : belowTop;
      }
      top = Math.min(top, window.innerHeight - estimatedHeight - viewportPadding);
      top = Math.max(topMin, top);

      setTourCoachStyle({
        left,
        top,
        width: coachWidth,
      });
    };

    placeCoach();
    window.setTimeout(placeCoach, 220);
    window.addEventListener("resize", placeCoach);
    window.addEventListener("scroll", placeCoach, true);
    return () => {
      window.removeEventListener("resize", placeCoach);
      window.removeEventListener("scroll", placeCoach, true);
    };
  }, [tourOpen, tourStep, tourSteps]);

  const finishTour = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, "1");
    setTourOpen(false);
    setTourStep(0);
  };

  const refreshDashboardData = async (userId: number) => {
    const [metricsResp, historyResp] = await Promise.all([
      withTimeout(`${API_BASE}/users/${userId}/metrics`),
      withTimeout(`${API_BASE}/users/${userId}/checkins`),
    ]);
    if (metricsResp.ok) {
      const data = await metricsResp.json();
      setMetrics(data);
      localStorage.setItem("finpilot_metrics", JSON.stringify(data));
      localStorage.setItem(metricsCacheKey(userId), JSON.stringify(data));
      await refreshPrediction(userId, data);
    }
    if (historyResp.ok) {
      const rows = await historyResp.json();
      const safeRows = Array.isArray(rows) ? rows : [];
      setHistory(safeRows);
      localStorage.setItem(historyCacheKey(userId), JSON.stringify(safeRows));
    }
  };

  const handleCsvUpload = async (file: File) => {
    if (!file) return;
    setUploadMessage("");
    setUploading(true);
    try {
      const rawUser = localStorage.getItem("finpilot_user");
      const user = rawUser ? JSON.parse(rawUser) : null;
      if (!user?.user_id) {
        setUploadMessage(tr("Please sign in first before uploading CSV."));
        setUploading(false);
        return;
      }

      const form = new FormData();
      form.append("file", file);
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let resp: Response;
      try {
        resp = await fetch(`${API_BASE}/checkins/upload-csv?user_id=${user.user_id}`, {
          method: "POST",
          body: form,
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeoutId);
      }

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const detail = typeof data?.detail === "string" ? data.detail : data?.detail?.message;
        setUploadMessage(tr(detail || "CSV upload failed."));
        setUploading(false);
        return;
      }

      const processed = Number(data?.processed_rows || 0);
      const failed = Number(data?.failed_rows || 0);
      setUploadMessage(
        `${tr("Imported")} ${processed} ${tr("rows")}${failed ? `, ${failed} ${tr("failed")}` : ""}.`,
      );
      await refreshDashboardData(user.user_id);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setUploadMessage(tr("CSV upload timed out. Check backend server and try again."));
      } else {
        setUploadMessage(tr("CSV upload failed due to network error."));
      }
    } finally {
      setUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  };

  const monthlySales = Number(metrics?.monthly_sales || analysis?.monthlySales || 0);
  const monthlyExpenses = Number(metrics?.monthly_expenses || analysis?.monthlyExpenses || 0);
  const monthlyReceivables = Number(metrics?.monthly_receivables || 0);
  const monthlyEmi = Number(metrics?.monthly_loan_emi || analysis?.emi || 0);
  const monthlyCash = Number(metrics?.monthly_cash_balance || analysis?.cash || 0);
  const runwayMonths = monthlyExpenses > 0 ? monthlyCash / monthlyExpenses : 0;
  const expenseRatio = monthlySales > 0 ? (monthlyExpenses / monthlySales) * 100 : 0;

  const chartData = useMemo(() => {
    if (history.length) {
      const sortedRows = [...history].sort((a, b) =>
        String(a.checkin_date || "").localeCompare(String(b.checkin_date || "")),
      );

      if (trendView === "daily") {
        const last30 = sortedRows.slice(-30);
        return last30.map((row) => {
          const date = String(row.checkin_date || "");
          const label = date.length >= 10 ? `${date.slice(5, 7)}/${date.slice(8, 10)}` : date;
          const sales = Number(row.daily_sales || 0);
          const expenses = Number(row.daily_expenses || 0);
          return {
            month: label,
            sales,
            expenses,
            net: sales - expenses,
            observedDays: 1,
            monthKey: date,
          };
        });
      }

      if (trendView === "weekly") {
        const byWeek = new Map<string, { sales: number; expenses: number; count: number }>();
        for (const row of sortedRows) {
          const date = String(row.checkin_date || "");
          if (!date) continue;
          const d = new Date(`${date}T00:00:00`);
          if (Number.isNaN(d.getTime())) continue;
          const day = d.getDay();
          const shift = (day + 6) % 7;
          d.setDate(d.getDate() - shift);
          const weekKey = d.toISOString().slice(0, 10);
          const existing = byWeek.get(weekKey) || { sales: 0, expenses: 0, count: 0 };
          existing.sales += Number(row.daily_sales || 0);
          existing.expenses += Number(row.daily_expenses || 0);
          existing.count += 1;
          byWeek.set(weekKey, existing);
        }

        const weeks = Array.from(byWeek.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-12);
        return weeks.map(([weekKey, agg]) => {
          const label = `Wk ${weekKey.slice(5, 7)}/${weekKey.slice(8, 10)}`;
          return {
            month: label,
            sales: Math.round(agg.sales),
            expenses: Math.round(agg.expenses),
            net: Math.round(agg.sales - agg.expenses),
            observedDays: agg.count,
            monthKey: weekKey,
          };
        });
      }

      const byMonth = new Map<string, { sales: number; expenses: number; count: number }>();
      for (const row of sortedRows) {
        const date = String(row.checkin_date || "");
        const monthKey = date.slice(0, 7);
        if (!monthKey) continue;
        const existing = byMonth.get(monthKey) || { sales: 0, expenses: 0, count: 0 };
        existing.sales += Number(row.daily_sales || 0);
        existing.expenses += Number(row.daily_expenses || 0);
        existing.count += 1;
        byMonth.set(monthKey, existing);
      }

      const sorted = Array.from(byMonth.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      const lastThree = sorted.slice(-3);
      return lastThree.map(([monthKey, agg], idx) => {
        const [year, month] = monthKey.split("-");
        const label = idx === lastThree.length - 1 ? "Current" : `${month}/${year.slice(2)}`;
        return {
          month: label,
          sales: Math.round(agg.sales),
          expenses: Math.round(agg.expenses),
          net: Math.round(agg.sales - agg.expenses),
          observedDays: agg.count,
          monthKey,
        };
      });
    }

    const mSales = Number(metrics?.monthly_sales || analysis?.monthlySales || 0);
    const mExpenses = Number(metrics?.monthly_expenses || analysis?.monthlyExpenses || 0);
    if (mSales > 0 || mExpenses > 0) {
      const salesGrowth = typeof analysis?.salesMonthlyGrowth === "number" ? analysis.salesMonthlyGrowth : 0.02;
      const expenseGrowth =
        typeof analysis?.expensesMonthlyGrowth === "number" ? analysis.expensesMonthlyGrowth : 0.015;
      const m2Sales = mSales > 0 ? mSales / Math.pow(1 + salesGrowth, 2) : 0;
      const m1Sales = mSales > 0 ? mSales / (1 + salesGrowth) : 0;
      const m2Expenses = mExpenses > 0 ? mExpenses / Math.pow(1 + expenseGrowth, 2) : 0;
      const m1Expenses = mExpenses > 0 ? mExpenses / (1 + expenseGrowth) : 0;
      return [
        {
          month: "M-2",
          sales: Math.round(m2Sales),
          expenses: Math.round(m2Expenses),
          net: Math.round(m2Sales - m2Expenses),
          observedDays: 0,
        },
        {
          month: "M-1",
          sales: Math.round(m1Sales),
          expenses: Math.round(m1Expenses),
          net: Math.round(m1Sales - m1Expenses),
          observedDays: 0,
        },
        {
          month: "Current",
          sales: Math.round(mSales),
          expenses: Math.round(mExpenses),
          net: Math.round(mSales - mExpenses),
          observedDays: 0,
        },
      ];
    }

    if (analysis?.chart) return analysis.chart;
    return [];
  }, [history, analysis, metrics, trendView]);

  const monthlySeriesForGrowth = useMemo(() => {
    if (!history.length) return [] as Array<{ sales: number; expenses: number }>;
    const byMonth = new Map<string, { sales: number; expenses: number }>();
    for (const row of history) {
      const date = String(row.checkin_date || "");
      const monthKey = date.slice(0, 7);
      if (!monthKey) continue;
      const existing = byMonth.get(monthKey) || { sales: 0, expenses: 0 };
      existing.sales += Number(row.daily_sales || 0);
      existing.expenses += Number(row.daily_expenses || 0);
      byMonth.set(monthKey, existing);
    }
    return Array.from(byMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, values]) => values);
  }, [history]);

  const trendInsights = useMemo(() => {
    if (!chartData.length) return null;

    const latest = chartData[chartData.length - 1];
    const previous = chartData.length > 1 ? chartData[chartData.length - 2] : null;
    const bestNetMonth = chartData.reduce((best, row) => (Number(row.net || 0) > Number(best.net || 0) ? row : best), chartData[0]);
    const worstNetMonth = chartData.reduce((worst, row) => (Number(row.net || 0) < Number(worst.net || 0) ? row : worst), chartData[0]);
    const avgNet = chartData.reduce((sum, row) => sum + Number(row.net || 0), 0) / chartData.length;
    const salesChange = previous ? Number(latest.sales || 0) - Number(previous.sales || 0) : 0;
    const expenseChange = previous ? Number(latest.expenses || 0) - Number(previous.expenses || 0) : 0;

    return {
      bestNetMonth,
      worstNetMonth,
      avgNet,
      salesChange,
      expenseChange,
      latest,
    };
  }, [chartData]);

  const salesGrowth = useMemo(() => {
    if (monthlySeriesForGrowth.length >= 2) {
      const current = monthlySeriesForGrowth[monthlySeriesForGrowth.length - 1].sales;
      const previous = monthlySeriesForGrowth[monthlySeriesForGrowth.length - 2].sales;
      return previous > 0 ? (current - previous) / previous : 0;
    }
    return typeof analysis?.salesMonthlyGrowth === "number" ? analysis.salesMonthlyGrowth : 0;
  }, [monthlySeriesForGrowth, analysis]);

  const expenseGrowth = useMemo(() => {
    if (monthlySeriesForGrowth.length >= 2) {
      const current = monthlySeriesForGrowth[monthlySeriesForGrowth.length - 1].expenses;
      const previous = monthlySeriesForGrowth[monthlySeriesForGrowth.length - 2].expenses;
      return previous > 0 ? (current - previous) / previous : 0;
    }
    return typeof analysis?.expensesMonthlyGrowth === "number" ? analysis.expensesMonthlyGrowth : 0;
  }, [monthlySeriesForGrowth, analysis]);
  const riskPercent = Number(prediction?.risk_score ?? 0);
  const riskLevelRaw = String(prediction?.risk_level || (riskPercent > 0 ? "HIGH" : "LOW"));
  const riskLevel =
    riskLevelRaw === "LOW" || riskLevelRaw === "MEDIUM" || riskLevelRaw === "HIGH"
      ? (riskLevelRaw as "LOW" | "MEDIUM" | "HIGH")
      : "HIGH";
  const survival = prediction?.survival_analysis;
  const monthlyLoss = Math.max(0, monthlyExpenses - monthlySales);
  const fallbackRunway = monthlyLoss > 0 ? monthlyCash / monthlyLoss : 12;
  // Prefer fresh dashboard metrics over possibly stale prediction cache.
  const hasFreshMetrics = monthlySales > 0 || monthlyExpenses > 0 || monthlyCash > 0;
  const survivalData = hasFreshMetrics
    ? {
        cash_runway_months: Number.isFinite(fallbackRunway) ? fallbackRunway : 12,
        estimated_days_left: (Number.isFinite(fallbackRunway) ? fallbackRunway : 12) * 30,
        monthly_loss: monthlyLoss,
        break_even_sales_required: monthlyExpenses,
      }
    : survival || {
        cash_runway_months: Number.isFinite(fallbackRunway) ? fallbackRunway : 12,
        estimated_days_left: (Number.isFinite(fallbackRunway) ? fallbackRunway : 12) * 30,
        monthly_loss: monthlyLoss,
        break_even_sales_required: monthlyExpenses,
      };

  const indicators = [
    {
      label: "Revenue Trend",
      value: salesGrowth >= 0 ? "Improving" : "Declining",
      icon: TrendingDown,
      status: salesGrowth >= 0 ? "good" : "danger",
      info: "Shows whether your monthly sales are improving or declining over time.",
    },
    {
      label: "Cash Runway",
      value: runwayMonths ? `${runwayMonths.toFixed(1)} months` : "N/A",
      icon: AlertTriangle,
      status: runwayMonths >= 1 ? "warning" : "danger",
      info: "How long your available cash can sustain your current monthly expense level.",
    },
    {
      label: "Expense Ratio",
      value: expenseRatio ? `${expenseRatio.toFixed(0)}%` : "N/A",
      icon: TrendingUp,
      status: expenseRatio <= 85 ? "good" : "danger",
      info: "Monthly expenses divided by monthly sales. Lower percentage is healthier.",
    },
    {
      label: "Debt Service",
      value: monthlyEmi <= monthlySales * 0.3 ? "On Track" : "High Burden",
      icon: CheckCircle,
      status: monthlyEmi <= monthlySales * 0.3 ? "good" : "warning",
      info: "Indicates whether loan payments are manageable relative to monthly sales.",
    },
  ];

  return (
    <AppLayout title={t("dashboard.title")} contentClassName="max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div
          ref={actionsCardRef}
          className={`bg-card rounded-3xl p-5 shadow-elevated border animate-scale-in ${
            tourOpen && tourStep === 0 ? "border-primary ring-2 ring-primary/30" : "border-border"
          }`}
        >
          <RiskGauge percentage={riskPercent} level={riskLevel} />
          <button
            type="button"
            onClick={() => navigate("/input")}
            className="btn-smooth mt-5 w-full rounded-2xl bg-primary text-primary-foreground py-3.5 font-semibold shadow-hero hover:opacity-90"
          >
            {t("dashboard.addToday")}
          </button>
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            disabled={uploading}
            className="btn-smooth mt-3 w-full rounded-2xl bg-card text-foreground py-3 border border-border font-semibold hover:bg-secondary/50 disabled:opacity-60"
          >
            {uploading ? t("dashboard.uploadingCsv") : t("dashboard.uploadCsv")}
          </button>
          <input
            ref={uploadInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleCsvUpload(file);
            }}
          />
          {uploadMessage && (
            <p className="mt-2 text-xs text-muted-foreground">{uploadMessage}</p>
          )}
          <button
            type="button"
            onClick={() => {
              setTourStep(0);
              setTourOpen(true);
            }}
            className="btn-smooth mt-4 w-full rounded-2xl bg-secondary/70 text-foreground py-2.5 text-sm font-medium border border-border hover:bg-secondary flex items-center justify-center gap-2"
          >
            <HelpCircle className="w-4 h-4" />
            {tr("Guide me through dashboard")}
          </button>
        </div>

        <div
          ref={indicatorsRef}
          className={`lg:col-span-2 rounded-2xl ${
            tourOpen && tourStep === 1 ? "ring-2 ring-primary/30" : ""
          }`}
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t("dashboard.keyIndicators")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {indicators.map((ind, i) => {
              const Icon = ind.icon;
              const statusColor =
                ind.status === "good"
                  ? "text-risk-low"
                  : ind.status === "warning"
                  ? "text-risk-medium"
                  : "text-risk-high";
              return (
                <div
                  key={i}
                  className="group bg-card rounded-2xl p-4 md:p-5 shadow-card border border-border animate-fade-in transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated hover:border-primary/25"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <Icon className={`w-5 h-5 ${statusColor} transition-transform duration-300 group-hover:scale-110`} />
                    <span className="text-sm text-muted-foreground flex-1">{tr(ind.label)}</span>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors"
                          aria-label={`More info about ${ind.label}`}
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        align="end"
                        sideOffset={8}
                        className="max-w-[220px] text-xs leading-relaxed text-left whitespace-normal break-words"
                      >
                        {tr(ind.info)}
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  <p className={`text-base md:text-lg font-bold ${statusColor}`}>{tr(ind.value)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {t("dashboard.timeAnalysis")}
      </h2>
      <div
        ref={timeAnalysisRef}
        className={`bg-card rounded-2xl p-4 shadow-card border mb-6 animate-fade-in ${
          tourOpen && tourStep === 2 ? "border-primary ring-2 ring-primary/30" : "border-border"
        }`}
        style={{ animationDelay: "300ms" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-xs text-muted-foreground">
            View:
          </p>
          <div className="inline-flex rounded-xl border border-border bg-secondary/40 p-1">
            {(["daily", "weekly", "monthly"] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setTrendView(view)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  trendView === view
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tr(view === "daily" ? "Daily (30d)" : view === "weekly" ? "Weekly (12w)" : "Monthly (3m)")}
              </button>
            ))}
          </div>
        </div>
        {trendInsights ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
            <div className="rounded-xl border border-border bg-secondary/40 p-3">
              <p className="text-xs text-muted-foreground mb-1">{tr("Best Net Period")}</p>
              <p className="text-base font-bold text-risk-low">{trendInsights.bestNetMonth.month}</p>
              <p className="text-xs text-muted-foreground">{formatINR(trendInsights.bestNetMonth.net)}</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 p-3">
              <p className="text-xs text-muted-foreground mb-1">{tr("Weakest Net Period")}</p>
              <p className="text-base font-bold text-risk-high">{trendInsights.worstNetMonth.month}</p>
              <p className="text-xs text-muted-foreground">{formatINR(trendInsights.worstNetMonth.net)}</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 p-3">
              <p className="text-xs text-muted-foreground mb-1">{tr("Average Net")} ({tr(trendView)})</p>
              <p className={`text-base font-bold ${trendInsights.avgNet >= 0 ? "text-risk-low" : "text-risk-high"}`}>
                {trendInsights.avgNet >= 0 ? "+" : "-"}
                {formatINR(Math.abs(trendInsights.avgNet))}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 p-3">
              <p className="text-xs text-muted-foreground mb-1">{tr("Latest Change")} ({tr(trendView)})</p>
              <p className="text-xs text-muted-foreground">{tr("Sales")}: {trendInsights.salesChange >= 0 ? "+" : "-"}{formatINR(Math.abs(trendInsights.salesChange))}</p>
              <p className="text-xs text-muted-foreground">{tr("Expenses")}: {trendInsights.expenseChange >= 0 ? "+" : "-"}{formatINR(Math.abs(trendInsights.expenseChange))}</p>
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl border border-border bg-secondary/40 p-3">
            <p className="text-xs text-muted-foreground mb-1">{tr("Sales Monthly Growth")}</p>
            <p className={`text-lg font-bold ${salesGrowth >= 0 ? "text-risk-low" : "text-risk-high"}`}>
              {(salesGrowth * 100).toFixed(1)}%
            </p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 p-3">
            <p className="text-xs text-muted-foreground mb-1">{tr("Expense Monthly Growth")}</p>
            <p className={`text-lg font-bold ${expenseGrowth <= 0.15 ? "text-risk-low" : "text-risk-high"}`}>
              {(expenseGrowth * 100).toFixed(1)}%
            </p>
          </div>
        </div>
        {chartData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `₹${Math.round(Number(value) / 1000)}k`}
              />
              <Tooltip content={renderTrendTooltip} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: 12, paddingBottom: "8px" }}
              />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="hsl(var(--risk-low))"
                strokeWidth={4}
                dot={{ r: 4.5, strokeWidth: 1.5, fill: "hsl(var(--card))" }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="hsl(var(--risk-high))"
                strokeWidth={4}
                dot={{ r: 4.5, strokeWidth: 1.5, fill: "hsl(var(--card))" }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="net"
                stroke="hsl(var(--accent))"
                strokeDasharray="6 4"
                strokeWidth={3}
                dot={{ r: 3.5, strokeWidth: 1, fill: "hsl(var(--card))" }}
                name="Net (Sales - Expenses)"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : chartData.length === 1 ? (
          <div className="h-[180px] rounded-xl border border-border bg-secondary/40 grid place-items-center text-sm text-muted-foreground px-4 text-center">
            {tr("Only one data point is available. Add more daily entries to draw trend lines.")}
          </div>
        ) : (
          <div className="h-[180px] rounded-xl border border-border bg-secondary/40 grid place-items-center text-sm text-muted-foreground">
            {tr("No history yet. Add your first daily check-in to build time analysis.")}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          {tr("This trend is auto-estimated from your daily inputs and current financial load.")}
        </p>
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {t("dashboard.survivalAnalysis")}
      </h2>
      <div
        ref={survivalRef}
        className={`bg-card rounded-2xl p-4 shadow-card border mb-6 animate-fade-in ${
          tourOpen && tourStep === 3 ? "border-primary ring-2 ring-primary/30" : "border-border"
        }`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-secondary/40 p-3">
            <p className="text-xs text-muted-foreground">{tr("Cash Runway")}</p>
            <p className="text-lg font-bold text-foreground">{Number(survivalData.cash_runway_months).toFixed(2)} {tr("mo")}</p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 p-3">
            <p className="text-xs text-muted-foreground">{tr("Estimated Days Left")}</p>
            <p className="text-lg font-bold text-foreground">{Number(survivalData.estimated_days_left).toFixed(0)} {tr("days")}</p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 p-3">
            <p className="text-xs text-muted-foreground">{tr("Monthly Loss")}</p>
            <p className="text-lg font-bold text-foreground">₹{Number(survivalData.monthly_loss).toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 p-3">
            <p className="text-xs text-muted-foreground">{tr("Break-Even Sales")}</p>
            <p className="text-lg font-bold text-foreground">₹{Number(survivalData.break_even_sales_required).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Suggested Improvements */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {tr("Suggested Improvements")}
      </h2>
      <div
        ref={suggestionsRef}
        className={`space-y-2 mb-6 rounded-2xl ${
          tourOpen && tourStep === 4 ? "ring-2 ring-primary/30" : ""
        }`}
      >
        {["Reduce receivables cycle to under 30 days", "Build 3-month cash runway", "Lower expense ratio below 80%"].map((item, i) => (
          <div key={i} className="flex items-center gap-3 bg-card rounded-xl p-3 shadow-card border border-border animate-fade-in" style={{ animationDelay: `${(i + 4) * 80}ms` }}>
            <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-accent">{i + 1}</span>
            </div>
            <p className="text-sm text-foreground">{tr(item)}</p>
          </div>
        ))}
      </div>

      {tourOpen ? (
        <div
          className="fixed z-40 rounded-2xl border border-border bg-card/95 backdrop-blur shadow-elevated px-3 py-3 animate-fade-in"
          style={tourCoachStyle}
        >
          <div className="space-y-2.5">
            <div className="min-w-0 text-left">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[11px] text-muted-foreground">
                  {tr("Step")} {tourStep + 1} / {tourSteps.length}
                </p>
                <span className="text-muted-foreground/40">|</span>
                <p className="text-[11px] text-muted-foreground">{tr("Guided Tour")}</p>
              </div>
              <h3 className="text-sm font-semibold text-foreground">{tourSteps[tourStep]?.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{tourSteps[tourStep]?.description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const target = tourSteps[tourStep]?.target?.current;
                  target?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className="btn-smooth rounded-lg border border-border px-2.5 py-1.5 text-xs"
              >
                {tr("Show section")}
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem(TOUR_STORAGE_KEY, "1");
                  setTourOpen(false);
                }}
                className="btn-smooth rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {tr("Skip")}
              </button>
              <button
                type="button"
                onClick={() => setTourStep((prev) => Math.max(0, prev - 1))}
                disabled={tourStep === 0}
                className="btn-smooth rounded-lg border border-border px-2.5 py-1.5 text-xs disabled:opacity-50"
              >
                {tr("Back")}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (tourStep >= tourSteps.length - 1) {
                    finishTour();
                    return;
                  }
                  setTourStep((prev) => prev + 1);
                }}
                className="btn-smooth rounded-lg bg-primary text-primary-foreground px-2.5 py-1.5 text-xs"
              >
                {tourStep >= tourSteps.length - 1 ? tr("Done") : tr("Next")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
};

export default DashboardPage;
