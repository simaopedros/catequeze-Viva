import { useMemo } from "react";
import { isFamilyPortalHost } from "../../shared/portal";

/**
 * Client-side: true when the app is running on the family portal host.
 * Always pass surface: 'PORTAL' to operations when this is true so the
 * server can enforce family DTOs (Wasp ops do not receive Host headers).
 */
export function useFamilyPortalSurface(): {
  isFamilyPortal: boolean;
  surfaceArg: { surface: "PORTAL" } | Record<string, never>;
} {
  const isFamilyPortal = useMemo(() => isFamilyPortalHost(), []);
  return {
    isFamilyPortal,
    surfaceArg: isFamilyPortal ? { surface: "PORTAL" } : {},
  };
}
