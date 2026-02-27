import { useEffect, useState } from "react";

interface RiskGaugeProps {
  percentage: number;
  level: "LOW" | "MEDIUM" | "HIGH";
}

const RiskGauge = ({ percentage, level }: RiskGaugeProps) => {
  const [animatedPercent, setAnimatedPercent] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedPercent(percentage), 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  const radius = 80;
  const circumference = Math.PI * radius;
  const offset = circumference - (animatedPercent / 100) * circumference;

  const colorClass =
    level === "LOW" ? "text-risk-low" : level === "MEDIUM" ? "text-risk-medium" : "text-risk-high";
  const strokeColor =
    level === "LOW" ? "hsl(var(--risk-low))" : level === "MEDIUM" ? "hsl(var(--risk-medium))" : "hsl(var(--risk-high))";
  const bgColor =
    level === "LOW"
      ? "hsl(var(--risk-low) / 0.1)"
      : level === "MEDIUM"
      ? "hsl(var(--risk-medium) / 0.1)"
      : "hsl(var(--risk-high) / 0.1)";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-48 h-28">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={bgColor}
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={strokeColor}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className={`text-4xl font-bold ${colorClass}`}>
            {animatedPercent}%
          </span>
        </div>
      </div>
      <span
        className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold ${
          level === "LOW"
            ? "bg-risk-low/10 text-risk-low"
            : level === "MEDIUM"
            ? "bg-risk-medium/10 text-risk-medium"
            : "bg-risk-high/10 text-risk-high"
        }`}
      >
        {level} RISK
      </span>
    </div>
  );
};

export default RiskGauge;
