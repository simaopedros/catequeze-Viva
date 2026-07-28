import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../client/components/ui/button";
import { Badge } from "../../../client/components/ui/badge";
import { ConfirmDialog } from "../../../client/components/ConfirmDialog";
import { AppDisplayTitle } from "../../../client/components/brand/AppChrome";
import { Users, UserPlus, Mail, Trash2, Heart } from "lucide-react";
import { Link } from "react-router";
import {
  useRoleLabels,
  useMembershipStatusLabels,
} from "../../../i18n/useLabels";

interface ParishMembersTabProps {
  members: any[];
  onRemove: (membershipId: string) => Promise<void>;
}

/**
 * Summary tab on parish detail. Invite/manage team is canonical on /app/team;
 * family portal invites stay on /app/family-invites.
 */
export function ParishMembersTab({ members, onRemove }: ParishMembersTabProps) {
  const { t } = useTranslation("common");
  const { t: tp } = useTranslation("parishes");
  const { t: tf } = useTranslation("family");
  const roleLabels = useRoleLabels();
  const statusLabels = useMembershipStatusLabels();
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const handleRemove = async () => {
    if (!removeTarget) return;
    try {
      await onRemove(removeTarget);
    } catch {
      // parent surfaces error
    }
    setRemoveTarget(null);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-brand-gold/35 bg-brand-gold/[0.08] p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-sm">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink" />
          <p className="text-muted-foreground">
            {t("team.subtitle", { members: members.length, pending: 0 })}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-9 rounded-sm shrink-0"
          asChild
        >
          <Link to="/app/team">
            <UserPlus className="mr-1 h-3.5 w-3.5" />
            {t("team.title")}
          </Link>
        </Button>
      </div>

      <div className="rounded-sm border border-border/70 bg-muted/20 p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-sm">
          <Heart className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink" />
          <p className="text-muted-foreground">
            {tf("portal_invites.banner_desc")}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-9 rounded-sm shrink-0"
          asChild
        >
          <Link to="/app/family-invites">
            <Mail className="mr-1 h-3.5 w-3.5" />
            {tf("portal_invites.banner_cta")}
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {tp("members_count_short", { count: members.length })}
        </p>
        <Button size="sm" asChild>
          <Link to="/app/team">
            <UserPlus className="mr-1 h-4 w-4" />
            {tp("invite")}
          </Link>
        </Button>
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-sm border border-border/70 bg-white p-12 text-center">
          <div className="mb-4 rounded-sm border border-border/70 bg-muted/30 p-3">
            <Users className="h-8 w-8 text-brand-ink" />
          </div>
          <AppDisplayTitle as="h3" className="text-lg sm:text-lg">
            {tp("no_members")}
          </AppDisplayTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            {tp("no_members_desc")}
          </p>
        </div>
      ) : (
        // overflow-x-auto, não overflow-hidden: em telas estreitas a tabela
        // precisa rolar, senão as últimas colunas ficam inalcançáveis.
        <div className="rounded-sm border border-border/70 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {tp("name")}
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {tp("email")}
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {tp("communities")}
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {tp("role")}
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {tp("status")}
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {tp("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((m: any) => {
                const status =
                  statusLabels[m.status as keyof typeof statusLabels] ||
                  statusLabels.INACTIVE;
                return (
                  <tr
                    key={m.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="font-brand-display px-4 py-3 font-semibold tracking-tight text-brand-ink">
                      {m.user?.firstName ||
                        m.user?.email?.split("@")[0] ||
                        "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {m.user?.email || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {m.community?.name || "\u2014"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {roleLabels[m.role as keyof typeof roleLabels] ||
                          m.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "inline-flex items-center rounded-sm border border-border/70 px-2 py-0.5 text-xs font-medium " +
                          status.color
                        }
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setRemoveTarget(m.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title={tp("member_remove_title")}
        description={t("remove_confirm")}
        confirmLabel={t("remove")}
        variant="destructive"
        onConfirm={handleRemove}
      />
    </div>
  );
}
