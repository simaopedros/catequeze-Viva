import * as React from "react";
import { cva, VariantProps } from "class-variance-authority";

import { cn } from "../../utils";

const cardVariants = cva(
  "rounded-xl border",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground shadow-elevation-sm",
        accent:
          "bg-card-accent text-card-accent-foreground",
        bento:
          "bg-card-subtle text-card-subtle-foreground border-none shadow-none",
        interactive:
          "bg-card text-card-foreground shadow-elevation-sm hover:shadow-elevation-md transition-shadow cursor-pointer",
        flat:
          "bg-muted/50 border-0 shadow-none",
      },
    },
  }
);

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

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn("font-semibold leading-none tracking-tight", className)}
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
    <div data-slot="card-content" className={cn("p-5 pt-0", className)} {...props} />
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
      className={cn("-mx-5 -mt-5 mb-4 overflow-hidden rounded-t-xl", className)}
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
