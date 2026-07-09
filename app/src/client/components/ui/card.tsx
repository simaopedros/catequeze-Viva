import * as React from "react";
import { cva, VariantProps } from "class-variance-authority";

import { cn } from "../../utils";

const cardVariants = cva("rounded-sm border", {
  variants: {
    variant: {
      default: "border-border/70 bg-white text-[#071A2D]",
      accent: "bg-card-accent text-card-accent-foreground",
      bento:
        "border-none bg-card-subtle text-card-subtle-foreground shadow-none",
      interactive:
        "cursor-pointer border-border/70 bg-white text-[#071A2D] transition-colors hover:border-[#071A2D]/30",
      flat: "border-0 bg-muted/50 shadow-none",
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
      className={cn("flex flex-col space-y-1.5 p-5", className)}
      {...props}
    />
  );
}

function CardTitle({
  className,
  style,
  ...props
}: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn(
        "font-semibold leading-none tracking-tight text-[#071A2D]",
        className,
      )}
      style={{ fontFamily: "var(--font-brand-display)", ...style }}
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
      className={cn("p-5 pt-0", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center p-5 pt-0", className)}
      {...props}
    />
  );
}

function CardMedia({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-media"
      className={cn("-mx-5 -mt-5 mb-4 overflow-hidden rounded-t-sm", className)}
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
