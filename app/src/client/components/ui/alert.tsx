import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../utils";

const alertVariants = cva(
  "relative w-full rounded-sm border border-border/70 px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-brand-ink [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-brand-ink",
        // Espelha o banner que as páginas já renderizavam à mão
        // (border-destructive/20 bg-destructive/10), para a migração dos
        // avulsos não mudar aparência.
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive [&>svg]:text-destructive",
        warning:
          "border-brand-gold/30 bg-brand-gold/10 text-brand-gold-muted [&>svg]:text-brand-gold-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"h5">) {
  return (
    <h5
      data-slot="alert-title"
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle };
