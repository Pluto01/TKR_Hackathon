import { LucideIcon, ChevronRight } from "lucide-react";

interface ActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  impact: string;
  index: number;
}

const ActionCard = ({ icon: Icon, title, description, impact, index }: ActionCardProps) => {
  return (
    <div
      className="bg-card rounded-2xl p-4 shadow-card border border-border animate-fade-in cursor-pointer hover:shadow-elevated transition-shadow"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-accent/10 flex-shrink-0">
          <Icon className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">{description}</p>
          <span className="text-xs font-medium text-accent">{impact}</span>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
      </div>
    </div>
  );
};

export default ActionCard;
