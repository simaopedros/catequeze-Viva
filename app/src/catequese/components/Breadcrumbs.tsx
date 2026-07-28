import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  to?: string;
}

const BREADCRUMB_ROUTE_KEYS = new Set([
  "new",
  "edit",
  "import",
  "print",
  "meetings",
  "attendance",
  "members",
  "users",
]);

function segmentToNavKey(seg: string): string {
  return seg.replace(/-/g, "_");
}

export function Breadcrumbs() {
  const location = useLocation();
  const { t } = useTranslation("navigation");

  if (location.pathname === "/app" || location.pathname === "/app/") {
    return null;
  }

  const segments = location.pathname.split("/").filter(Boolean);
  const items: BreadcrumbItem[] = segments.map((seg, i) => {
    const to = "/" + segments.slice(0, i + 1).join("/");
    const isId = /^[0-9a-f]{8,}|^\d+$/i.test(seg);
    if (isId) {
      const parentSeg = segmentToNavKey(segments[i - 1] || "");
      const singular =
        t(`breadcrumbSingular.${parentSeg}`, { defaultValue: "" }) ||
        t("breadcrumb.detail");
      return {
        label: singular,
        to: undefined,
      };
    }

    const navKey = segmentToNavKey(seg);
    let label: string;
    if (seg === "app") {
      label = t("dashboard");
    } else if (BREADCRUMB_ROUTE_KEYS.has(seg)) {
      label = t(`breadcrumb.${seg}`);
    } else {
      label = t(navKey, { defaultValue: seg });
    }

    return {
      label,
      to: i < segments.length - 1 ? to : undefined,
    };
  });

  if (items.length <= 1) return null;

  return (
    <nav
      className="flex items-center gap-1 text-sm text-muted-foreground px-1 py-2 overflow-x-auto"
      aria-label={t("breadcrumb.ariaLabel")}
    >
      <Link
        to="/app"
        className="hover:text-brand-ink transition-colors flex-shrink-0"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          {item.to ? (
            <Link
              to={item.to}
              className="hover:text-brand-ink transition-colors truncate max-w-[160px]"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-brand-display max-w-[160px] truncate font-semibold tracking-tight text-brand-ink">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
