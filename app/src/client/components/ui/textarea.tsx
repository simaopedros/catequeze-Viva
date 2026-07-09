import * as React from "react";

import { cn } from "../../utils";

interface TextareaProps extends React.ComponentProps<"textarea"> {
  variant?: 'default' | 'filled';
  state?: 'error' | 'success' | 'default';
}

function Textarea({
  className,
  variant = 'default',
  state = 'default',
  ...props
}: TextareaProps) {
  const variantStyles = {
    default: 'bg-transparent',
    filled: 'bg-muted border-transparent focus-visible:bg-background',
  };
  const stateStyles = {
    default: '',
    error: 'border-destructive focus-visible:ring-destructive',
    success: 'border-success focus-visible:ring-success',
  };

  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:ring-[#071A2D]/25 flex min-h-[60px] w-full rounded-sm border border-border/70 bg-white px-3 py-2 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        variantStyles[variant],
        stateStyles[state],
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
