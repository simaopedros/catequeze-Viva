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
    default: "bg-card",
    filled: "border-transparent bg-muted shadow-none focus-visible:bg-card",
  };
  const stateStyles = {
    default: "",
    error: "border-destructive focus-visible:ring-destructive/35",
    success: "border-success focus-visible:ring-success/35",
  };

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-brand-ink file:font-semibold placeholder:text-muted-foreground focus-visible:ring-ring/35 flex h-12 min-h-12 w-full rounded-md border border-input px-3.5 py-2 text-base shadow-elevation-xs transition-[border-color,box-shadow,background-color] duration-150 ease-out file:border-0 file:bg-transparent file:text-sm file:font-medium hover:border-input focus-visible:border-brand-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:border-dashed disabled:text-muted-foreground disabled:opacity-70 disabled:shadow-none md:h-11 md:min-h-11 md:text-sm",
        variantStyles[variant],
        stateStyles[state],
        className,
      )}
      {...props}
    />
  );
}

export { Input };
