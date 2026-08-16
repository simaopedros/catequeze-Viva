import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils";

/**
 * Pílulas de status. Antes `success`, `info` e `secondary` renderizavam todas
 * em ink — visualmente indistinguíveis, o que anulava o propósito de ter
 * variantes semânticas. Agora cada uma carrega sua própria cor tonal
 * (fundo /10, texto na cor cheia), que lê como status sem gritar como o
 * preenchimento sólido antigo.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full border font-semibold tracking-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand-ink text-white",
        secondary: "border-transparent bg-muted text-brand-ink",
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive",
        outline: "border-border text-brand-ink",
        brand: "border-transparent bg-brand-ink/8 text-brand-ink",
        success: "border-success/20 bg-success/10 text-success",
        warning:
          "border-brand-gold/30 bg-brand-gold/12 text-brand-gold-muted",
        info: "border-info/20 bg-info/10 text-info",
        dot: "border-transparent bg-muted text-brand-ink gap-1.5",
      },
      size: {
        sm: "px-2 py-0.5 text-micro leading-none",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

function dotColor(variant: string | null | undefined): string {
  switch (variant) {
    case "dot":
      return "bg-brand-ink";
    case "success":
      return "bg-success";
    case "warning":
      return "bg-warning";
    case "destructive":
      return "bg-destructive";
    case "info":
      return "bg-info";
    default:
      return "bg-brand-ink";
  }
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {variant?.includes("dot") || variant === "dot" ? (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", dotColor(variant))}
          aria-hidden="true"
        />
      ) : null}
      {props.children}
    </div>
  );
}

export { Badge, badgeVariants };
