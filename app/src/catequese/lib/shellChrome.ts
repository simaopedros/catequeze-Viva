/** Match Tailwind `md` — same breakpoint as AttendancePage mobile sheet. */
export const MOBILE_MAX_WIDTH_PX = 767;

/** Mobile operational routes: hide trial banner + desktop breadcrumbs. */
export function isMobileOperationalRoute(pathname: string): boolean {
  if (/^\/app\/classes\/[^/]+\/attendance$/.test(pathname)) return true;
  if (/^\/app\/meetings\/[^/]+$/.test(pathname)) return true;
  return false;
}
