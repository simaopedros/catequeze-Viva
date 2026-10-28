import { useEffect, useState } from "react";
import { useReducedMotion } from "../landing-page/hooks/useReducedMotion";

export const AUTH_SCENES = [
  "dashboard",
  "classes",
  "attendance",
  "records",
  "families",
  "calendar",
] as const;
export type AuthScene = (typeof AUTH_SCENES)[number];
export const SCENE_DURATION = 3600;

export function useAuthSceneCycle() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [hidden, setHidden] = useState(() => document.hidden);
  const paused = reduced || hovered || focused || stopped || hidden;

  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(
      () => setIndex((i) => (i + 1) % AUTH_SCENES.length),
      SCENE_DURATION,
    );
    return () => window.clearTimeout(timer);
  }, [index, paused]);

  return {
    index,
    reduced,
    paused,
    stopped,
    setHovered,
    setFocused,
    toggleStopped: () => setStopped((value) => !value),
    select: (next: number) =>
      setIndex((next + AUTH_SCENES.length) % AUTH_SCENES.length),
  };
}
