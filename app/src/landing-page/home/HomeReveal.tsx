import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../client/utils";
import { useInViewOnce } from "./homeMotionEnv";

/**
 * CSS-only entrance. Hidden state applies only under
 * `.home-root[data-motion-ready]`, so content stays visible without JS
 * or with reduced motion.
 */
export function HomeReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  return (
    <div
      ref={ref}
      data-inview={inView ? "" : undefined}
      className={cn("home-reveal", className)}
      style={
        delay
          ? ({ "--home-reveal-delay": `${delay}ms` } as CSSProperties)
          : undefined
      }
    >
      {children}
    </div>
  );
}
