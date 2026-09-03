import { useTranslation } from "react-i18next";
import { cn } from "../../client/utils";
import {
  catalogDisplayName,
  describeEffectivePlan,
  workspaceKindAccentClass,
  workspaceKindDotClass,
  workspaceKindFromParishType,
  type EffectivePlanPresentation,
  type WorkspaceKind,
} from "../../shared/workspaceIdentity";

export function WorkspaceKindBadge({
  kind,
  className,
}: {
  kind: WorkspaceKind;
  className?: string;
}) {
  const { t } = useTranslation("topbar");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
        workspaceKindAccentClass(kind),
        className,
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", workspaceKindDotClass(kind))}
        aria-hidden
      />
      {t(`kind.${kind.toLowerCase()}`)}
    </span>
  );
}

export function formatEffectivePlanCopy(
  presentation: EffectivePlanPresentation,
  t: (key: string, opts?: Record<string, string>) => string,
): string {
  const plan = catalogDisplayName(presentation.planKey);
  if (presentation.source === "diocese") {
    if (presentation.dioceseName) {
      return t("plan.covered_by_named", { name: presentation.dioceseName });
    }
    return t("plan.covered_by_diocese");
  }
  if (presentation.source === "parish") {
    return t("plan.parish_license", { plan });
  }
  if (presentation.source === "personal") {
    return t("plan.personal", { plan });
  }
  return t("plan.free");
}

export function WorkspacePlanLabel({
  parishType,
  parishPlan,
  planInherited,
  dioceseName,
  personalPlan,
  className,
}: {
  parishType?: string | null;
  parishPlan?: string | null;
  planInherited?: boolean;
  dioceseName?: string | null;
  personalPlan?: string | null;
  className?: string;
}) {
  const { t } = useTranslation("topbar");
  const presentation = describeEffectivePlan({
    parishType,
    parishPlan,
    planInherited,
    dioceseName,
    personalPlan,
  });
  return (
    <span className={cn("truncate text-xs text-muted-foreground", className)}>
      {formatEffectivePlanCopy(presentation, t)}
    </span>
  );
}

export function workspaceKindOf(type?: string | null): WorkspaceKind {
  return workspaceKindFromParishType(type);
}
