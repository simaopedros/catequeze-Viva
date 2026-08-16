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

  const segments = location.pathname.split("/").filter(Boolean);

  // Só rotas profundas (/app/classes/:id em diante). Em /app e /app/classes o
  // AppPageHeader já diz onde o usuário está — a trilha seria ruído duplicado.
  if (segments.length < 3) return null;

  const items: BreadcrumbItem[] = segments.map((seg, i) => {
    const to = "/" + segments.slice(0, i + 1).join("/");

    // Detecta o segmento de id pela POSIÇÃO, não pelo formato: é id quando o
    // pai é uma coleção com singular conhecido e o próprio segmento não é uma
    // sub-rota nomeada. Casar formato falhava fora de uuid — cuid começa com
    // letras não-hexadecimais, e ids legíveis (fixtures, slugs) nunca casavam,
    // vazando o id cru na trilha.
    const parentSeg = segmentToNavKey(segments[i - 1] || "");
    const parentSingular = t(`breadcrumbSingular.${parentSeg}`, {
      defaultValue: "",
    });
    const isNamedSubRoute = BREADCRUMB_ROUTE_KEYS.has(seg);
    const isId = Boolean(parentSingular) && !isNamedSubRoute;

    if (isId) {
      return {
        label: parentSingular || t("breadcrumb.detail"),
        // Em /app/classes/:id/attendance o id deixa de ser folha: vira o
        // caminho de volta para o detalhe, que antes não existia.
        to: i < segments.length - 1 ? to : undefined,
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

  return (
    <nav
      className="flex items-center gap-1 text-sm text-muted-foreground px-1 py-2 overflow-x-auto"
      aria-label={t("breadcrumb.ariaLabel")}
    >
      {/* min-h/min-w-8 nos links: como texto puro eles ficavam com 14–20px de
          altura, difíceis de acertar no toque. O -my-1 impede que a trilha
          engorde a régua vertical da página. */}
      <Link
        to="/app"
        aria-label={t("dashboard")}
        className="-my-1 flex min-h-8 min-w-8 flex-shrink-0 items-center justify-center transition-colors hover:text-brand-ink"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          {item.to ? (
            <Link
              to={item.to}
              className="-my-1 flex min-h-8 max-w-[160px] items-center truncate transition-colors hover:text-brand-ink"
            >
              {item.label}
            </Link>
          ) : (
            <span className="max-w-[160px] truncate font-semibold tracking-tight text-brand-ink">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
