import * as React from "react";

import { cn } from "../../utils";

interface TextareaProps extends React.ComponentProps<"textarea"> {
  variant?: "default" | "filled";
  state?: "error" | "success" | "default";
}

function Textarea({
  className,
  variant = "default",
  state = "default",
  ...props
}: TextareaProps) {
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
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground focus-visible:ring-ring/35 flex min-h-[5rem] w-full rounded-md border border-input bg-card px-3.5 py-2.5 text-base shadow-elevation-xs transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-brand-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:border-dashed disabled:text-muted-foreground disabled:opacity-70 disabled:shadow-none md:text-sm",
        variantStyles[variant],
        stateStyles[state],
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
