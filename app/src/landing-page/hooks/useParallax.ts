import { useEffect, useRef } from 'react';
import { useReducedMotion } from './useReducedMotion';

interface UseParallaxOptions {
  factor?: number;
  enabled?: boolean;
}

export function useParallax<T extends HTMLElement = HTMLDivElement>(
  options: UseParallaxOptions = {},
) {
  const { factor = 0.05, enabled = true } = options;
  const ref = useRef<T>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion || !enabled) return;

    const element = ref.current;
    if (!element) return;

    let rafId = 0;

    const update = () => {
      const rect = element.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const elementCenter = rect.top + rect.height / 2;
      const distance = elementCenter - viewportCenter;
      const offset = distance * factor;
      element.style.transform = `translate3d(0, ${offset}px, 0)`;
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (element) element.style.transform = '';
    };
  }, [factor, enabled, reducedMotion]);

  return ref;
}
