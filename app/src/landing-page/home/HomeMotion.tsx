import type { ReactNode } from "react";
import { LazyMotion, MotionConfig } from "motion/react";

const loadFeatures = () => import("./motionFeatures").then((m) => m.default);

/**
 * Wraps each lazy home section. Animation features load asynchronously in
 * their own chunk; `strict` forbids the heavy `motion.*` components.
 */
export function HomeMotion({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
