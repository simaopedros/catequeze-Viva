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
    default: "border-border/70 bg-white text-[#071A2D]",
    low: "border-[#D39A2B]/30 bg-[#D39A2B]/10 text-[#8A6418]",
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
          resolvedVariant === "low" && "text-[#D39A2B]",
          resolvedVariant === "default" && "text-[#071A2D]",
        )}
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
