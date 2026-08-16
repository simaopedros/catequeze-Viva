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
    default: "border-border/70 bg-white text-brand-ink",
    low: "border-brand-gold/30 bg-brand-gold/10 text-brand-gold-muted",
    zero: "border-border/40 bg-muted/40 text-muted-foreground/60",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-semibold tracking-tight transition-colors",
        variantStyles[resolvedVariant],
        onClick && "cursor-pointer hover:bg-muted/40",
        !onClick && "cursor-default",
        className,
      )}
    >
      <Coins
        className={cn(
          "h-3 w-3",
          resolvedVariant === "low" && "text-brand-gold",
          resolvedVariant === "default" && "text-brand-ink",
        )}
      />
      <span className="font-semibold tracking-tight">
        {creditsLeft} {creditsLeft === 1 ? "crédito" : "créditos"}
      </span>
      {monthlyAllowance && resolvedVariant === "low" && (
        <span className="text-brand-gold/80">/ {monthlyAllowance}</span>
      )}
    </button>
  );
}
