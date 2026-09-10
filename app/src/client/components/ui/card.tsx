import * as React from "react";
import { cva, VariantProps } from "class-variance-authority";

import { cn } from "../../utils";

const cardVariants = cva("rounded-lg border", {
  variants: {
    variant: {
      default:
        "border-brand-ink/10 bg-surface-elevated text-brand-ink shadow-elevation-xs",
      accent:
        "border-brand-gold/20 bg-brand-paper text-brand-ink shadow-none",
      bento:
        "border-none bg-card-subtle text-card-subtle-foreground shadow-none",
      interactive:
        "cursor-pointer border-brand-ink/10 bg-surface-elevated text-brand-ink shadow-elevation-xs transition-[box-shadow,transform,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-brand-gold/35 hover:shadow-elevation-sm motion-reduce:hover:translate-y-0",
      flat: "border-0 bg-brand-paper/70 shadow-none",
    },
  },
});

function Card({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ variant, className }))}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col space-y-1.5 p-5 sm:p-6", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn(
        "font-sans text-title-xsm font-semibold leading-tight tracking-tight text-brand-ink",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("p-5 pt-0 sm:p-6 sm:pt-0", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center p-5 pt-0 sm:p-6 sm:pt-0", className)}
      {...props}
    />
  );
}

function CardMedia({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-media"
      className={cn(
        "-mx-5 -mt-5 mb-4 overflow-hidden rounded-t-lg sm:-mx-6 sm:-mt-6",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardMedia,
  CardTitle,
  cardVariants,
};
