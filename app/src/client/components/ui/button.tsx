import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "../../utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium tracking-tight transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
  {
    variants: {
      variant: {
        default:
          "bg-brand-ink text-white shadow-elevation-xs hover:bg-brand-midnight hover:shadow-elevation-sm active:shadow-none",
        destructive:
          "bg-destructive text-destructive-foreground shadow-elevation-xs hover:bg-destructive/90 hover:shadow-elevation-sm active:shadow-none",
        outline:
          "border border-brand-ink/15 bg-card text-brand-ink hover:border-brand-ink/30 hover:bg-brand-paper/70 hover:text-brand-ink active:shadow-none",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-muted",
        ghost: "text-brand-ink hover:bg-brand-paper hover:text-brand-ink",
        link: "text-brand-ink underline-offset-4 hover:underline",
        brand:
          "bg-brand-ink text-white shadow-elevation-xs hover:bg-brand-midnight hover:shadow-elevation-sm active:shadow-none",
        subtle:
          "bg-brand-paper font-medium text-brand-ink hover:bg-brand-light-gold/25",
      },
      size: {
        xs: "h-7 rounded-sm px-2.5 text-xs",
        sm: "h-9 rounded-md px-3.5 text-xs",
        default: "h-10 rounded-md px-4 py-2",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10 rounded-md",
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

  // Icon-only buttons often carry only a `title` (tooltip); expose the same
  // text to assistive tech so they never render as an unnamed button.
  const accessibleName =
    size === "icon" && !props["aria-label"] && !props["aria-labelledby"]
      ? props.title
      : undefined;

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-label={accessibleName}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        // min-w-0/max-w-full: sem isto o wrapper não encolhe, filhos com
        // `truncate` nunca truncam e — como a base é `justify-center` — o
        // conteúdo transborda dos DOIS lados da caixa. Era o que fazia o ícone
        // do seletor de paróquia escapar pela esquerda da borda no topo.
        <span className="relative inline-flex min-w-0 max-w-full items-center gap-2">
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
