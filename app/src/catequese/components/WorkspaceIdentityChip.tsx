import { useTranslation } from "react-i18next";
import { cn } from "../../client/utils";
import {
  describeEffectivePlan,
  formatEffectivePlanCopy,
  workspaceKindAccentClass,
  workspaceKindDotClass,
  workspaceKindFromParishType,
  type WorkspaceKind,
} from "../../shared/workspaceIdentity";

export { formatEffectivePlanCopy };

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

export function WorkspacePlanLabel({
  parishType,
  parishPlan,
  planInherited,
  dioceseName,
  personalPlan,
  billingStatus,
  hidePlanDetails,
  className,
}: {
  parishType?: string | null;
  parishPlan?: string | null;
  planInherited?: boolean;
  dioceseName?: string | null;
  personalPlan?: string | null;
  billingStatus?: string | null;
  /** Auxiliary / guest: who manages, never plan name or subscribe copy. */
  hidePlanDetails?: boolean;
  className?: string;
}) {
  const { t } = useTranslation("topbar");
  const presentation = describeEffectivePlan({
    parishType,
    parishPlan,
    planInherited,
    dioceseName,
    personalPlan,
    billingStatus,
  });
  return (
    <span className={cn("truncate text-xs text-muted-foreground", className)}>
      {formatEffectivePlanCopy(presentation, t, {
        hidePlanDetails,
        kind: workspaceKindFromParishType(parishType),
      })}
    </span>
  );
}

export function workspaceKindOf(type?: string | null): WorkspaceKind {
  return workspaceKindFromParishType(type);
}
