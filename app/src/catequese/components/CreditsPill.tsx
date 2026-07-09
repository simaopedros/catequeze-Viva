import { Coins } from "lucide-react";
import { cn } from "../../client/utils";

interface CreditsPillProps {
  creditsLeft: number;
  monthlyAllowance?: number;
  variant?: "default" | "low" | "zero";
  onClick?: () => void;
  className?: string;
}

/**
 * Soft credits display pill.
 * - default: neutral tone (sufficient credits)
 * - low: gentle warning (≤3 credits or ≤20% remaining)
 * - zero: muted emphasis (no credits left)
 */
export function CreditsPill({
  creditsLeft,
  monthlyAllowance,
  variant,
  onClick,
  className,
}: CreditsPillProps) {
  const resolvedVariant =
    variant ||
    (creditsLeft <= 0
      ? ("zero" as const)
      : monthlyAllowance && creditsLeft <= Math.max(1, monthlyAllowance * 0.2)
        ? ("low" as const)
        : ("default" as const));

  const variantStyles = {
    default: "bg-muted/60 text-muted-foreground border-border/50",
    low: "bg-[#D39A2B]/10 text-[#8A6418] border-[#D39A2B]/30",
    zero: "bg-muted/40 text-muted-foreground/60 border-border/40",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors",
        variantStyles[resolvedVariant],
        onClick && "cursor-pointer hover:bg-muted/80",
        !onClick && "cursor-default",
        className,
      )}
    >
      <Coins
        className={cn("h-3 w-3", resolvedVariant === "low" && "text-[#D39A2B]")}
      />
      <span>
        {creditsLeft} {creditsLeft === 1 ? "crédito" : "créditos"}
      </span>
      {monthlyAllowance && resolvedVariant === "low" && (
        <span className="text-[#D39A2B]/80">/ {monthlyAllowance}</span>
      )}
    </button>
  );
}
