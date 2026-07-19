import * as React from "react";

import { cn } from "../../utils";

interface InputProps extends React.ComponentProps<"input"> {
  variant?: "default" | "filled";
  state?: "error" | "success" | "default";
}

function Input({
  className,
  type,
  variant = "default",
  state = "default",
  ...props
}: InputProps) {
  const variantStyles = {
    default: "bg-transparent",
    filled: "bg-muted border-transparent focus-visible:bg-background",
  };
  const stateStyles = {
    default: "",
    error: "border-destructive focus-visible:ring-destructive",
    success: "border-success focus-visible:ring-success",
  };

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input file:text-brand-ink file:font-semibold placeholder:text-muted-foreground focus-visible:ring-brand-ink/25 flex h-12 min-h-12 w-full rounded-sm border border-border/70 bg-white px-3 py-2 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 md:h-11 md:min-h-11 md:text-sm",
        variantStyles[variant],
        stateStyles[state],
        className,
      )}
      {...props}
    />
  );
}

export { Input };
