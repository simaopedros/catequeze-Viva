import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "../../utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
  {
    variants: {
      variant: {
        default: "bg-brand-ink text-white hover:bg-brand-ink-soft shadow-none",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-none",
        outline:
          "border border-input bg-background text-brand-ink shadow-none hover:border-brand-ink/30 hover:bg-muted/30 hover:text-brand-ink-soft",
        secondary:
          "bg-secondary text-secondary-foreground shadow-none hover:bg-secondary/80",
        ghost: "text-brand-ink hover:bg-accent hover:text-brand-ink-soft",
        link: "text-brand-ink underline-offset-4 hover:underline",
        brand: "bg-brand-ink text-white shadow-none hover:bg-brand-ink-soft",
        subtle:
          "border border-border/70 bg-muted/30 font-medium tracking-tight text-brand-ink hover:bg-muted/50",
      },
      size: {
        xs: "h-7 rounded-sm px-2.5 text-xs",
        sm: "h-8 rounded-sm px-3 text-xs",
        default: "h-9 rounded-sm px-4 py-2",
        lg: "h-11 rounded-sm px-8",
        xl: "h-12 rounded-sm px-10 text-base",
        icon: "h-9 w-9 rounded-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <span className="relative inline-flex items-center gap-2">
          {loading && (
            <Loader2 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
          )}
          <span
            className={cn(
              "inline-flex items-center min-w-0",
              loading && "invisible",
            )}
          >
            {children}
          </span>
        </span>
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
