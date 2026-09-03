import { useTranslation } from "react-i18next";
import { ACCESS_MATRIX_ROLES } from "../../shared/workspaceIdentity";
import { AppPanel } from "../../client/components/brand/AppChrome";
import { useRoleLabels } from "../../i18n/useLabels";

export function RoleAccessMatrix({
  personal,
}: {
  personal?: boolean;
}) {
  const { t } = useTranslation("common");
  const roleLabels = useRoleLabels();
  const roles = personal
    ? ACCESS_MATRIX_ROLES.filter(
        (role) => role === "LEAD_CATECHIST" || role === "ASSISTANT_CATECHIST" || role === "GUARDIAN",
      )
    : ACCESS_MATRIX_ROLES;

  return (
    <AppPanel className="space-y-3 p-4" data-testid="role-access-matrix">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {t("team.matrix_title")}
      </h3>
      <div className="h-px w-8 bg-brand-gold" aria-hidden />
      <ul className="space-y-3">
        {roles.map((role) => (
          <li key={role} className="space-y-0.5">
            <p className="text-sm font-semibold tracking-tight text-brand-ink">
              {roleLabels[role as keyof typeof roleLabels] || role}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t(`roles_desc.${role}`)}
            </p>
          </li>
        ))}
      </ul>
    </AppPanel>
  );
}
