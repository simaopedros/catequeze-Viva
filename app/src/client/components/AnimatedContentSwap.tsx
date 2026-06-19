import { type ReactNode } from 'react';
import { cn } from '../utils';

interface AnimatedContentSwapProps {
  children: ReactNode;
  /** Key that triggers the swap animation when it changes */
  swapKey: string;
  className?: string;
}

/**
 * Wraps content that changes in response to filters, tabs, or query updates.
 * Uses a CSS animation triggered by React key remounting.
 *
 * The swapKey should change whenever the displayed content changes
 * (e.g., the active filter value, tab id, or a serialized query state).
 */
export function AnimatedContentSwap({ children, swapKey, className }: AnimatedContentSwapProps) {
  return (
    <div key={swapKey} className={cn('content-transition', className)}>
      {children}
    </div>
  );
}
