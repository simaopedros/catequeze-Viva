import { useTranslation } from "react-i18next";
import type { MemberPauseKind } from "../../shared/memberAccessPause";

/** Quiet notice for members. No payment, plan, or subscription wording. */
export function MemberAccessPausedNotice({ kind }: { kind: MemberPauseKind }) {
  const { t } = useTranslation("billing");
  return (
    <div
      role="status"
      data-testid="member-access-paused"
      className="mx-auto max-w-lg px-4 py-16 text-center"
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        {t(`member_access_paused.${kind}`)}
      </p>
    </div>
  );
}
