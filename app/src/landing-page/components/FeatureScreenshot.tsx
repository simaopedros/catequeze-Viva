import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { ShowcaseId } from '../content/landingContent';
import { AiPlannerMock } from './mockups/AiPlannerMock';
import { AttendanceMock } from './mockups/AttendanceMock';
import { DashboardMock } from './mockups/DashboardMock';
import { FamilyPortalMock } from './mockups/FamilyPortalMock';
import { LibraryMock } from './mockups/LibraryMock';
import { SacramentsMock } from './mockups/SacramentsMock';

const MOCK_COMPONENTS: Record<ShowcaseId, () => ReactNode> = {
  dashboard: DashboardMock,
  attendance: AttendanceMock,
  sacraments: SacramentsMock,
  library: LibraryMock,
  'ai-planner': AiPlannerMock,
  'family-portal': FamilyPortalMock,
};

function getScreenshotPath(id: ShowcaseId, theme: 'light' | 'dark'): string {
  return `/landing/${id}-${theme}.webp`;
}

async function checkScreenshotExists(src: string): Promise<boolean> {
  try {
    const response = await fetch(src, { method: 'GET', cache: 'no-store' });
    if (!response.ok) return false;
    const contentType = response.headers.get('content-type') ?? '';
    return contentType.startsWith('image/');
  } catch {
    return false;
  }
}

interface FeatureScreenshotProps {
  id: ShowcaseId;
  alt: string;
  className?: string;
}

export function FeatureScreenshot({ id, alt, className }: FeatureScreenshotProps) {
  const [lightSrc, setLightSrc] = useState<string | null>(null);
  const [darkSrc, setDarkSrc] = useState<string | null>(null);
  const Mock = MOCK_COMPONENTS[id];

  useEffect(() => {
    let cancelled = false;

    async function resolveSources() {
      const light = getScreenshotPath(id, 'light');
      const dark = getScreenshotPath(id, 'dark');
      const [lightExists, darkExists] = await Promise.all([
        checkScreenshotExists(light),
        checkScreenshotExists(dark),
      ]);

      if (cancelled) return;
      setLightSrc(lightExists ? light : null);
      setDarkSrc(darkExists ? dark : null);
    }

    resolveSources();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (lightSrc || darkSrc) {
    const fallbackSrc = lightSrc ?? darkSrc!;
    const darkFallbackSrc = darkSrc ?? lightSrc!;

    return (
      <>
        <img
          src={lightSrc ?? fallbackSrc}
          alt={alt}
          loading="lazy"
          className={`h-full w-full object-cover object-top dark:hidden ${className ?? ''}`}
        />
        <img
          src={darkFallbackSrc}
          alt={alt}
          loading="lazy"
          className={`h-full w-full object-cover object-top hidden dark:block ${className ?? ''}`}
        />
      </>
    );
  }

  return <Mock />;
}
