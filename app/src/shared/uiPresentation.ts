/**
 * Shared presentation types for responsive chrome (headers, panels, tables, nav).
 * Pure types + helpers — no React runtime. Keeps desktop/mobile contracts explicit.
 */

/** Control / panel density */
export type UiDensity = "comfortable" | "compact";

/** Primary CTA for a page or section */
export type PagePrimaryAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  /** Accessible name override */
  ariaLabel?: string;
  disabled?: boolean;
  /** data-tour / analytics hooks */
  testId?: string;
  /** Where the action originated for mobile activation analytics */
  analyticsSource?: string;
};

/** Secondary action (desktop row or mobile overflow menu) */
export type PageSecondaryAction = PagePrimaryAction & {
  /** Destructive actions should sit last / isolated */
  destructive?: boolean;
  iconKey?: string;
  /** Keep presentation-only controls out of the mobile action hierarchy */
  desktopOnly?: boolean;
};

/**
 * Explicit desktop vs mobile table presentation.
 * `Node` is intentionally generic so shared stays free of React imports.
 */
export type ResponsiveTablePresentation<T, Node = unknown> = {
  columns: {
    key: string;
    header: string;
    className?: string;
    headerClassName?: string;
    render: (item: T) => Node;
  }[];
  /**
   * Mobile: full card render. When omitted, falls back to labeled field list
   * from `mobileFields` or column cardLabels.
   */
  renderMobileCard?: (item: T) => Node;
  /** Mobile essential fields when renderMobileCard is not provided */
  mobileFields?: MobileCardField<T, Node>[];
};

/** Field shown on a mobile list card */
export type MobileCardField<T, Node = unknown> = {
  key: string;
  label?: string;
  render: (item: T) => Node;
  /** Primary line (name) vs meta */
  prominence?: "title" | "status" | "meta" | "action";
};

/** Persistence feedback used by forms, attendance and offline workflows. */
export type PersistenceState =
  | "idle"
  | "saving"
  | "saved"
  | "queued"
  | "syncing"
  | "error";

/** Navigation group for discovery hierarchy (not AuthZ) */
export type NavGroupId =
  | "operation"
  | "people"
  | "content"
  | "management"
  | "settings";

export const NAV_GROUP_ORDER: NavGroupId[] = [
  "operation",
  "people",
  "content",
  "management",
  "settings",
];

/** i18n keys under navigation namespace */
export const NAV_GROUP_LABEL_KEYS: Record<NavGroupId, string> = {
  operation: "operationSection",
  people: "peopleSection",
  content: "contentSection",
  management: "managementSection",
  settings: "settingsSection",
};

/** Mobile chrome measurements (CSS px) — mirror Main.css tokens */
export const mobileChrome = {
  touchTargetMin: 44,
  bottomNavHeight: 56,
  topBarHeight: 56,
  actionBarHeight: 68,
  safeAreaBottom: "env(safe-area-inset-bottom, 0px)",
  safeAreaTop: "env(safe-area-inset-top, 0px)",
} as const;

/** Control heights */
export const controlHeights = {
  comfortable: 44,
  compact: 36,
  input: 48,
} as const;

/** Content max widths */
export const contentWidths = {
  narrow: 640,
  reading: 768,
  page: 1120,
  wide: 1280,
  full: 1440,
} as const;
