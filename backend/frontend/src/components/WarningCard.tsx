import { AlertTriangle, AlertCircle, Info } from "lucide-react";

interface WarningCardProps {
  severity: "low" | "medium" | "high";
  message: string;
}

const WarningCard = ({ severity, message }: WarningCardProps) => {
  const config = {
    low: {
      icon: Info,
      bg: "bg-risk-low/8",
      border: "border-risk-low/20",
      iconColor: "text-risk-low",
    },
    medium: {
      icon: AlertCircle,
      bg: "bg-risk-medium/8",
      border: "border-risk-medium/20",
      iconColor: "text-risk-medium",
    },
    high: {
      icon: AlertTriangle,
      bg: "bg-risk-high/8",
      border: "border-risk-high/20",
      iconColor: "text-risk-high",
    },
  };

  const { icon: Icon, bg, border, iconColor } = config[severity];

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${bg} ${border} animate-fade-in`}>
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
      <p className="text-sm text-foreground/80 leading-relaxed">{message}</p>
    </div>
  );
};

export default WarningCard;
