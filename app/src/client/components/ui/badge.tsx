import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand-ink text-white",
        secondary:
          "border-border/70 bg-muted/40 font-semibold tracking-tight text-brand-ink",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "border-border/70 font-semibold tracking-tight text-brand-ink",
        brand: "border-transparent bg-brand-ink/8 text-brand-ink",
        success:
          "border-border/70 bg-brand-ink/8 font-semibold tracking-tight text-brand-ink",
        warning:
          "border-brand-gold/30 bg-brand-gold/10 font-semibold tracking-tight text-brand-gold-muted",
        info: "border-border/70 bg-muted/40 font-semibold tracking-tight text-brand-ink",
        dot: "border-transparent gap-1.5",
      },
      size: {
        sm: "px-2 py-0 text-micro leading-none",
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
