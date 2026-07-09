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
        default:
          "bg-[#071A2D] text-white hover:bg-[#0a2540] shadow-none",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-none",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/20 shadow-none",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-none",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-[#071A2D] underline-offset-4 hover:underline",
        brand:
          "bg-[#071A2D] text-white hover:bg-[#0a2540] shadow-none",
        subtle:
          "border border-border/70 bg-muted/30 text-foreground hover:bg-muted/50",
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
  }
);

interface ButtonProps extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
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
      {asChild ? children : (
        <span className="relative inline-flex items-center gap-2">
          {loading && (
            <Loader2 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
          )}
          <span className={cn('inline-flex items-center min-w-0', loading && 'invisible')}>{children}</span>
        </span>
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
