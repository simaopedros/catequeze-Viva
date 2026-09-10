import { useState } from "react";
import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Menu,
  MessageSquareText,
  GraduationCap,
  BarChart3,
} from "lucide-react";
import { cn } from "../client/utils";
import { useUserContext } from "../client/hooks/useUserContext";
import { useActiveWorkspace } from "../client/hooks/useActiveWorkspace";
import { useUnreadNotificationCount } from "../client/hooks/useUnreadNotificationCount";
import { getVisibleNavigation } from "../shared/navigation";
import { BottomSheetNav } from "./components/BottomSheetNav";
import { Sheet, SheetTrigger } from "../client/components/ui/sheet";
import { trackMobileEvent } from "../client/analytics/marketingAnalytics";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  classes: Users,
  calendar: Calendar,
  messages: MessageSquareText,
  catechumens: GraduationCap,
  reports: BarChart3,
};

export function BottomNav() {
  const { t } = useTranslation("navigation");
  const { userRole, isAdmin } = useUserContext();
  const { workspaceType } = useActiveWorkspace();
  const [sheetOpen, setSheetOpen] = useState(false);
  const unreadCount = useUnreadNotificationCount();

  const { bottomBar } = getVisibleNavigation({
    role: userRole,
    isAdmin,
    workspaceType,
  });

  const visible = bottomBar
    .map((item) => {
      const Icon = ICON_MAP[item.iconKey];
      return Icon ? { ...item, Icon } : null;
    })
    .filter(Boolean) as Array<
    (typeof bottomBar)[number] & {
      Icon: React.ComponentType<{ className?: string }>;
    }
  >;

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={(open) => {
        setSheetOpen(open);
        if (open) {
          trackMobileEvent("mobile_more_opened", {
            role: userRole,
            workspace_type: workspaceType,
          });
        }
      }}
    >
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-sticky border-t border-brand-ink/10 bg-brand-paper/90 shadow-elevation-sticky backdrop-blur-md supports-[backdrop-filter]:bg-brand-paper/80"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label={t("primarySection", { defaultValue: "Primary" })}
      >
        <div
          className="grid items-center"
          style={{
            // minmax(0, 1fr) e não 1fr: com `1fr` a coluna nunca encolhe abaixo
            // do conteúdo, então um rótulo longo ("Catequizandos") rouba largura
            // dos vizinhos e o truncate nunca dispara. Em 320px os itens ficavam
            // colados, sem folga.
            gridTemplateColumns: `repeat(${
       visible.length + 1
      }, minmax(0, 1fr))`,
            height: "var(--height-bottom-nav, 3.5rem)",
          }}
        >
          {visible.map((item) => {
            const labelKey =
              item.labelKey === "catechumens"
                ? "catechumens_short"
                : item.labelKey;
            const label = t(labelKey, { defaultValue: t(item.labelKey) });
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/app"}
                prefetch="intent"
                title={label}
                aria-label={label}
                className={({ isActive }) =>
                  cn(
                    // text-micro abaixo de 360px: em 320px a coluna tem ~56px
                    // úteis e "Calendário" a 12px não cabe.
                    "flex h-full min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-micro font-medium transition-colors min-[360px]:text-overline",
                    isActive
                      ? "text-brand-ink"
                      : "text-muted-foreground hover:text-brand-ink",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Pílula atrás do ícone: antes o estado ativo era só uma
                        troca de cor, difícil de perceber de relance numa barra
                        de 5 colunas. A pílula é o alvo visual, o rótulo segue
                        como reforço. */}
                    <span
                      className={cn(
                        "flex h-6 w-11 items-center justify-center rounded-full transition-colors duration-150",
                        isActive && "bg-brand-ink/8",
                      )}
                    >
                      <item.Icon className="h-5 w-5 shrink-0" />
                    </span>
                    {/* Abaixo de 400px só ícone; rótulos curtos evitam "Catequiz…" em 360px. */}
                    <span className="hidden max-w-full truncate min-[400px]:block">
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
          <SheetTrigger asChild>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              aria-controls="bottom-sheet-nav"
              // o rótulo visível some abaixo de 360px; sem isto o botão ficaria
              // sem nome acessível nessa faixa
              aria-label={t("more", { ns: "common" })}
              className="relative flex h-full min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-micro font-medium text-muted-foreground transition-colors hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-[360px]:text-overline"
            >
              {/* Mesma caixa h-6 w-11 dos itens de navegação: sem ela o ícone
                  do "Mais" desalinha verticalmente das outras colunas. */}
              <span className="flex h-6 w-11 items-center justify-center">
                <Menu className="h-5 w-5" />
              </span>
              <span className="hidden max-w-full truncate min-[400px]:block">
                {t("more", { ns: "common" })}
              </span>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 right-1/4 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-overline font-semibold tabular-nums text-destructive-foreground ring-2 ring-surface-elevated">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </SheetTrigger>
        </div>
      </nav>
      <BottomSheetNav onNavigate={() => setSheetOpen(false)} />
    </Sheet>
  );
}
