import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useQuery,
  getParishTeam,
  listCommunities,
  listClasses,
  inviteUserToParish,
  resendInvitation,
  cancelInvitation,
  removeMembership,
  updateMembershipRole,
} from "wasp/client/operations";
import {
  Users,
  UserPlus,
  Mail,
  Copy,
  RefreshCw,
  Trash2,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Ban,
} from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import {
  AppDisplayTitle,
  AppPageHeader,
  AppPanel,
} from "../../client/components/brand/AppChrome";
import { ConfirmDialog } from "../../client/components/ConfirmDialog";
import { EmptyState } from "../../client/components/EmptyState";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import { useRoleLabels, useMembershipStatusLabels } from "../../i18n/useLabels";
import { toast } from "../../client/hooks/use-toast";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/useLocale";
function deliveryMessage(
  delivery: string | undefined,
  t: (k: string) => string,
): { text: string; isError: boolean } {
  if (delivery === "sent") return { text: t("team.invite_sent"), isError: false };
  if (delivery === "not_configured")
    return { text: t("team.email_not_configured"), isError: true };
  if (delivery === "failed")
    return { text: t("team.email_failed"), isError: true };
  return { text: t("team.invite_saved"), isError: false };
}

export default function TeamPage() {
  const { t } = useTranslation("common");
  const { t: tn } = useTranslation("navigation");
  const { t: tp } = useTranslation("parishes");
  const roleLabels = useRoleLabels();
  const statusLabels = useMembershipStatusLabels();
  const { currentLocale } = useLocale();
  const { activeParishId } = useActiveParish();

  const {
    data: team,
    isLoading,
    error: teamError,
    refetch,
  } = useQuery(
    getParishTeam,
    { parishId: activeParishId || "" },
    { enabled: Boolean(activeParishId) },
  );

  const { data: communities = [] } = useQuery(
    listCommunities,
    { parishId: activeParishId || "" },
    { enabled: Boolean(activeParishId) },
  );

  const { data: classes = [] } = useQuery(
    listClasses,
    { workspaceId: activeParishId || undefined },
    { enabled: Boolean(activeParishId) },
  );

  const permissions = team?.permissions;
  const assignableRoles: string[] = permissions?.assignableRoles || [];
  const canInvite = Boolean(permissions?.canInvite);
  const canManageRoles = Boolean(permissions?.canManageRoles);

  const inviteRoleOptions = useMemo(
    () =>
      assignableRoles.map((value) => ({
        value,
        label: roleLabels[value as keyof typeof roleLabels] || value,
      })),
    [assignableRoles, roleLabels],
  );

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviteCommunityId, setInviteCommunityId] = useState("");
  const [inviteClassId, setInviteClassId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteMsgIsError, setInviteMsgIsError] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{
    id: string;
    kind: "pending" | "membership";
  } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  // Sync default invite role when permissions load
  const effectiveInviteRole =
    inviteRole && assignableRoles.includes(inviteRole)
      ? inviteRole
      : inviteRoleOptions[0]?.value || "";

  const needsClass =
    effectiveInviteRole === "LEAD_CATECHIST" ||
    effectiveInviteRole === "ASSISTANT_CATECHIST";

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: t("team.link_copied") });
    } catch {
      toast({ title: t("error"), variant: "destructive" });
    }
  };

  const handleInvite = async () => {
    if (!activeParishId || !inviteEmail.trim() || !effectiveInviteRole) return;
    // Only institutional lead catechists must pick a class; personal owners may invite freely.
    if (
      needsClass &&
      !inviteClassId &&
      permissions?.actorRole === "LEAD_CATECHIST"
    ) {
      setInviteMsg(t("team.class_required"));
      setInviteMsgIsError(true);
      return;
    }
    setInviting(true);
    setInviteMsg("");
    setInviteMsgIsError(false);
    setLastInviteUrl(null);
    try {
      const result: any = await inviteUserToParish({
        email: inviteEmail.trim(),
        parishId: activeParishId,
        role: effectiveInviteRole,
        communityId: inviteCommunityId || undefined,
        classId: inviteClassId || undefined,
      });
      const url = result?.inviteUrl as string | undefined;
      if (url) setLastInviteUrl(url);
      const dm = deliveryMessage(result?.emailDelivery, t);
      setInviteMsg(dm.text);
      setInviteMsgIsError(dm.isError);
      trackMarketingEvent("invite_sent", {
        role: effectiveInviteRole,
        placement: "team_page",
        email_delivery: result?.emailDelivery,
      });
      if (!dm.isError) {
        setInviteEmail("");
        setInviteCommunityId("");
        setInviteClassId("");
      }
      refetch();
    } catch (e: any) {
      setInviteMsg(e.message || tp("invite_send_error"));
      setInviteMsgIsError(true);
    }
    setInviting(false);
  };

  const handleResend = async (inv: any) => {
    setResendingId(inv.id);
    try {
      const result: any = await resendInvitation(
        inv.kind === "pending"
          ? { pendingInvitationId: inv.id }
          : { membershipId: inv.id },
      );
      if (result?.inviteUrl) {
        setLastInviteUrl(result.inviteUrl);
      }
      const dm = deliveryMessage(result?.emailDelivery, t);
      toast({
        title: dm.text,
        variant: dm.isError ? "destructive" : "default",
      });
      refetch();
    } catch (e: any) {
      toast({
        title: e.message || t("error"),
        variant: "destructive",
      });
    }
    setResendingId(null);
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelInvitation(
        cancelTarget.kind === "pending"
          ? { pendingInvitationId: cancelTarget.id }
          : { membershipId: cancelTarget.id },
      );
      toast({ title: t("team.invite_cancelled") });
      setCancelTarget(null);
      refetch();
    } catch (e: any) {
      toast({ title: e.message || t("error"), variant: "destructive" });
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    try {
      await removeMembership({ membershipId: removeTarget });
      toast({ title: tp("member_removed") });
      setRemoveTarget(null);
      refetch();
    } catch (e: any) {
      toast({ title: e.message || tp("member_remove_error"), variant: "destructive" });
    }
  };

  if (!activeParishId) {
    return (
      <EmptyState
        icon={Users}
        title={t("team.select_workspace")}
        description={tp("select_parish_hint")}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-ink" />
      </div>
    );
  }

  if (teamError) {
    return (
      <div className="rounded-sm border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        {(teamError as any)?.message || tp("error_loading_members")}
      </div>
    );
  }

  const members = team?.members || [];
  const invitations = team?.invitations || [];

  return (
    <>
      <div className="space-y-8">
        <AppPageHeader
          eyebrow={tn("team")}
          title={t("team.title")}
          subtitle={t("team.subtitle", {
            members: members.length,
            pending: invitations.length,
          })}
          primaryAction={
            canInvite
              ? {
                  label: tp("invite"),
                  onClick: () => setShowInvite(!showInvite),
                }
              : undefined
          }
        />

        {showInvite && canInvite && (
          <AppPanel className="space-y-3 p-4">
            <div className="space-y-1.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t("team.invite_member")}
              </h3>
              <div className="h-px w-8 bg-brand-gold" aria-hidden />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="h-11 min-h-11 min-w-0 flex-1 rounded-sm border border-input bg-background px-3 text-sm sm:min-w-[200px]"
                placeholder={t("families.email_placeholder")}
                type="email"
              />
              <select
                value={effectiveInviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="h-11 min-h-11 rounded-sm border border-input bg-background px-3 text-sm"
              >
                {inviteRoleOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <select
                value={inviteCommunityId}
                onChange={(e) => setInviteCommunityId(e.target.value)}
                className="h-11 min-h-11 rounded-sm border border-input bg-background px-3 text-sm"
              >
                <option value="">{tp("all_parish")}</option>
                {(communities as any[]).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {needsClass &&
                (permissions?.actorRole === "LEAD_CATECHIST" ||
                  (classes as any[]).length > 0) && (
                <select
                  value={inviteClassId}
                  onChange={(e) => setInviteClassId(e.target.value)}
                  className="h-11 min-h-11 min-w-[160px] rounded-sm border border-input bg-background px-3 text-sm"
                  required={permissions?.actorRole === "LEAD_CATECHIST"}
                >
                  <option value="">
                    {permissions?.actorRole === "LEAD_CATECHIST"
                      ? t("team.select_class")
                      : t("team.select_class_optional")}
                  </option>
                  {(classes as any[]).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              <Button
                className="h-11 min-h-11 w-full rounded-sm sm:w-auto"
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
              >
                <Mail className="mr-1 h-3 w-3" />
                {inviting ? "..." : tp("send")}
              </Button>
            </div>
            {inviteMsg && (
              <p
                className={
                  "text-xs " +
                  (inviteMsgIsError ? "text-destructive" : "text-brand-ink")
                }
              >
                {inviteMsg}
              </p>
            )}
            {lastInviteUrl && (
              <div className="flex flex-wrap items-center gap-2 rounded-sm border border-border/70 bg-muted/30 p-2 text-xs">
                <span className="text-muted-foreground truncate flex-1 min-w-0">
                  {lastInviteUrl}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => copyText(lastInviteUrl)}
                >
                  <Copy className="mr-1 h-3 w-3" />
                  {t("team.copy_link")}
                </Button>
              </div>
            )}
          </AppPanel>
        )}

        {/* Pending invitations */}
        <section className="space-y-3">
          <AppDisplayTitle as="h2" className="text-base sm:text-base">
            {t("team.pending_invites")}
          </AppDisplayTitle>
          {invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("team.no_pending")}
            </p>
          ) : (
            <>
            <div className="space-y-3 md:hidden">
              {invitations.map((inv: any) => (
                <div
                  key={`${inv.kind}-${inv.id}`}
                  className="space-y-2 rounded-sm border border-border/70 bg-surface-elevated p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-brand-ink">
                      {inv.displayName || inv.email}
                    </p>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {roleLabels[inv.role as keyof typeof roleLabels] ||
                        inv.role}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {inv.class?.name || inv.community?.name || "—"}
                    {inv.expiresAt
                      ? ` · ${formatDate(inv.expiresAt, currentLocale)}`
                      : ""}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {inv.inviteUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-11 min-h-11"
                        onClick={() => copyText(inv.inviteUrl)}
                      >
                        <Copy className="mr-1 h-3.5 w-3.5" />
                        {t("team.copy_link")}
                      </Button>
                    )}
                    {canInvite && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-11 min-h-11"
                        disabled={resendingId === inv.id}
                        onClick={() => handleResend(inv)}
                      >
                        <RefreshCw className="mr-1 h-3.5 w-3.5" />
                        {t("team.resend")}
                      </Button>
                    )}
                    {canInvite && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-11 min-h-11 text-destructive"
                        onClick={() =>
                          setCancelTarget({ id: inv.id, kind: inv.kind })
                        }
                      >
                        <Ban className="mr-1 h-3.5 w-3.5" />
                        {t("team.cancel_invite")}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-hidden rounded-sm border border-border/70 bg-surface-elevated md:block">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-medium tracking-wide text-muted-foreground">
                      {tp("email")}
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium tracking-wide text-muted-foreground">
                      {tp("role")}
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium tracking-wide text-muted-foreground">
                      {t("team.class_community")}
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium tracking-wide text-muted-foreground">
                      {t("team.expires")}
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium tracking-wide text-muted-foreground">
                      {tp("status")}
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-medium tracking-wide text-muted-foreground">
                      {tp("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv: any) => (
                    <tr
                      key={`${inv.kind}-${inv.id}`}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-medium text-brand-ink">
                        {inv.displayName || inv.email}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {roleLabels[inv.role as keyof typeof roleLabels] ||
                            inv.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {inv.class?.name || inv.community?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {inv.expiresAt
                          ? formatDate(inv.expiresAt, currentLocale)
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {inv.status === "EXPIRED" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                            <AlertTriangle className="h-3 w-3" />
                            {t("team.status_expired")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-brand-ink">
                            <Clock className="h-3 w-3" />
                            {t("team.status_pending")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {inv.inviteUrl && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-11 w-11"
                              title={t("team.copy_link")}
                              onClick={() => copyText(inv.inviteUrl)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canInvite && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-11 w-11"
                              title={t("team.resend")}
                              disabled={resendingId === inv.id}
                              onClick={() => handleResend(inv)}
                            >
                              <RefreshCw
                                className={
                                  "h-3.5 w-3.5 " +
                                  (resendingId === inv.id ? "animate-spin" : "")
                                }
                              />
                            </Button>
                          )}
                          {canInvite && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-11 w-11 text-destructive"
                              title={t("team.cancel_invite")}
                              onClick={() =>
                                setCancelTarget({
                                  id: inv.id,
                                  kind: inv.kind,
                                })
                              }
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>

        {/* Active members */}
        <section className="space-y-3">
          <AppDisplayTitle as="h2" className="text-base sm:text-base">
            {t("team.active_members")}
          </AppDisplayTitle>
          {members.length === 0 ? (
            <EmptyState
              compact
              icon={Users}
              title={tp("no_members")}
              description={tp("no_members_desc")}
            />
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {members.map((m: any) => {
                  const status =
                    statusLabels[m.status as keyof typeof statusLabels] ||
                    statusLabels.ACTIVE;
                  const classNames = (m.classes || [])
                    .map((c: any) => c.name)
                    .join(", ");
                  const displayName =
                    [m.user?.firstName, m.user?.lastName]
                      .filter(Boolean)
                      .join(" ") ||
                    m.user?.email?.split("@")[0] ||
                    "—";
                  return (
                    <div
                      key={m.id}
                      className="space-y-3 rounded-sm border border-border/70 bg-surface-elevated p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p
                            className="truncate font-semibold tracking-tight text-brand-ink"
                            style={{
                              fontFamily: "var(--font-brand-display)",
                            }}
                          >
                            {displayName}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {m.user?.email || "—"}
                          </p>
                        </div>
                        <span
                          className={
                            "inline-flex shrink-0 items-center rounded-sm px-2 py-0.5 text-xs font-medium " +
                            status.color
                          }
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {classNames || m.community?.name || "—"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {canManageRoles ? (
                          <select
                            value={m.role}
                            onChange={async (e) => {
                              try {
                                await updateMembershipRole({
                                  membershipId: m.id,
                                  role: e.target.value,
                                });
                                refetch();
                              } catch (err: any) {
                                toast({
                                  title: err.message || tp("error_update"),
                                  variant: "destructive",
                                });
                              }
                            }}
                            className="h-11 min-h-11 flex-1 rounded-sm border border-input bg-background px-2 text-sm"
                          >
                            {Object.entries(roleLabels)
                              .filter(
                                ([key]) =>
                                  assignableRoles.includes(key) ||
                                  key === m.role,
                              )
                              .map(([key, label]) => (
                                <option key={key} value={key}>
                                  {label}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {roleLabels[m.role as keyof typeof roleLabels] ||
                              m.role}
                          </Badge>
                        )}
                        {canManageRoles && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-11 w-11 min-h-11 min-w-11 text-destructive"
                            onClick={() => setRemoveTarget(m.id)}
                            aria-label={tp("member_remove_title")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-sm border border-border/70 bg-surface-elevated md:block">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-medium tracking-wide text-muted-foreground">
                        {tp("name")}
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium tracking-wide text-muted-foreground">
                        {tp("email")}
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium tracking-wide text-muted-foreground">
                        {t("team.class_community")}
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium tracking-wide text-muted-foreground">
                        {tp("role")}
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium tracking-wide text-muted-foreground">
                        {tp("status")}
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-medium tracking-wide text-muted-foreground">
                        {tp("actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m: any) => {
                      const status =
                        statusLabels[m.status as keyof typeof statusLabels] ||
                        statusLabels.ACTIVE;
                      const classNames = (m.classes || [])
                        .map((c: any) => c.name)
                        .join(", ");
                      return (
                        <tr
                          key={m.id}
                          className="border-b last:border-0 hover:bg-muted/30"
                        >
                          <td
                            className="px-4 py-3 font-semibold tracking-tight text-brand-ink"
                            style={{
                              fontFamily: "var(--font-brand-display)",
                            }}
                          >
                            {[m.user?.firstName, m.user?.lastName]
                              .filter(Boolean)
                              .join(" ") ||
                              m.user?.email?.split("@")[0] ||
                              "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {m.user?.email || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {classNames || m.community?.name || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {canManageRoles ? (
                              <select
                                value={m.role}
                                onChange={async (e) => {
                                  try {
                                    await updateMembershipRole({
                                      membershipId: m.id,
                                      role: e.target.value,
                                    });
                                    refetch();
                                  } catch (err: any) {
                                    toast({
                                      title: err.message || tp("error_update"),
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                className="h-9 rounded-sm border border-input bg-background px-2 text-xs"
                              >
                                {Object.entries(roleLabels)
                                  .filter(
                                    ([key]) =>
                                      assignableRoles.includes(key) ||
                                      key === m.role,
                                  )
                                  .map(([key, label]) => (
                                    <option key={key} value={key}>
                                      {label}
                                    </option>
                                  ))}
                              </select>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {roleLabels[
                                  m.role as keyof typeof roleLabels
                                ] || m.role}
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium " +
                                status.color
                              }
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {canManageRoles && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-11 w-11 text-destructive"
                                onClick={() => setRemoveTarget(m.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title={t("team.cancel_invite")}
        description={t("team.cancel_invite_confirm")}
        onConfirm={handleCancel}
        confirmLabel={t("team.cancel_invite")}
        variant="destructive"
      />
      <ConfirmDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title={tp("member_remove_title")}
        description={tp("remove_member_confirm")}
        onConfirm={handleRemove}
        confirmLabel={tp("member_remove_title")}
        variant="destructive"
      />
    </>
  );
}
