import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import type { ShowcaseId } from '../content/landingContent';
import { AiPlannerMock } from './mockups/AiPlannerMock';
import { AttendanceMock } from './mockups/AttendanceMock';
import { DashboardMock } from './mockups/DashboardMock';
import { FamilyPortalMock } from './mockups/FamilyPortalMock';
import { LibraryMock } from './mockups/LibraryMock';
import { SacramentsMock } from './mockups/SacramentsMock';

const MOCK_COMPONENTS: Record<ShowcaseId, ComponentType<{ ns?: string }>> = {
  dashboard: DashboardMock,
  attendance: AttendanceMock,
  sacraments: SacramentsMock,
  library: LibraryMock,
  'ai-planner': AiPlannerMock,
  'family-portal': FamilyPortalMock,
};

const screenshotCache = new Map<string, string | null>();

function getScreenshotPath(id: ShowcaseId, theme: 'light' | 'dark'): string {
  return `/landing/${id}-${theme}.webp`;
}

function getPreferredTheme(): 'light' | 'dark' {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return 'dark';
  }

  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

function loadScreenshot(src: string): Promise<string | null> {
  if (screenshotCache.has(src)) {
    return Promise.resolve(screenshotCache.get(src) ?? null);
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      screenshotCache.set(src, src);
      resolve(src);
    };
    image.onerror = () => {
      screenshotCache.set(src, null);
      resolve(null);
    };
    image.src = src;
  });
}

interface FeatureScreenshotProps {
  id: ShowcaseId;
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
}

export function FeatureScreenshot({ id, alt, className, loading = 'lazy', fetchPriority = 'auto' }: FeatureScreenshotProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const Mock = MOCK_COMPONENTS[id];

  useEffect(() => {
    let cancelled = false;

    async function resolveSource() {
      const preferredTheme = getPreferredTheme();
      const fallbackTheme = preferredTheme === 'light' ? 'dark' : 'light';
      const preferredSrc = await loadScreenshot(getScreenshotPath(id, preferredTheme));

      if (cancelled) return;
      if (preferredSrc) {
        setResolvedSrc(preferredSrc);
        return;
      }

      const fallbackSrc = await loadScreenshot(getScreenshotPath(id, fallbackTheme));
      if (cancelled) return;
      setResolvedSrc(fallbackSrc);
    }

    void resolveSource();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (resolvedSrc) {
    return (
      <img
        src={resolvedSrc}
        alt={alt}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        className={`h-full w-full object-cover object-top ${className ?? ''}`}
      />
    );
  }

  return <Mock />;
}
