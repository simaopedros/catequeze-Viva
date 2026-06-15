import type { ReactNode } from 'react';
import { cn } from '../../client/utils';

interface BrowserFrameProps {
  children: ReactNode;
  className?: string;
  url?: string;
}

export function BrowserFrame({ children, className, url = 'app.catequese.viva' }: BrowserFrameProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border bg-card shadow-xl shadow-primary/5 ring-1 ring-border/50',
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
        </div>
        <div className="mx-auto flex-1 max-w-[200px] rounded-md bg-background/80 px-3 py-1 text-center text-overline text-muted-foreground truncate">
          {url}
        </div>
      </div>
      <div className="aspect-[16/10] overflow-hidden bg-background">{children}</div>
    </div>
  );
}
