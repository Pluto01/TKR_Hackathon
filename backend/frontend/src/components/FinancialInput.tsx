import { LucideIcon } from "lucide-react";
import { KeyboardEventHandler, RefObject } from "react";

interface FinancialInputProps {
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  prefix?: string;
  inputRef?: RefObject<HTMLInputElement>;
  onEnter?: () => void;
}

const FinancialInput = ({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder = "0",
  prefix = "₹",
  inputRef,
  onEnter,
}: FinancialInputProps) => {
  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    onEnter?.();
  };

  return (
    <div className="bg-card rounded-2xl p-4 shadow-card border border-border transition-all focus-within:shadow-elevated focus-within:border-primary/30">
      <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
        <Icon className="w-4 h-4" />
        {label}
      </label>
      <div className="flex items-center gap-1">
        <span className="text-lg font-semibold text-muted-foreground/60">{prefix}</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={value}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9]/g, "");
            onChange(v);
          }}
          placeholder={placeholder}
          className="flex-1 text-xl font-semibold text-foreground bg-transparent outline-none placeholder:text-muted-foreground/30"
        />
      </div>
    </div>
  );
};

export default FinancialInput;
