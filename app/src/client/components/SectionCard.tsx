import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../utils";

interface SectionCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
}: SectionCardProps) {
  return (
    <section
      className={cn("rounded-sm border border-border/70 bg-white", className)}
    >
      <div className="flex items-center justify-between p-5 pb-0">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="shrink-0 rounded-sm border border-border/70 bg-muted/30 p-2">
              <Icon className="h-5 w-5 text-[#071A2D]/80" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-body font-semibold">{title}</h3>
            {description && (
              <p className="text-body-xs text-text-secondary mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
