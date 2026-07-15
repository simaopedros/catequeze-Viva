import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  useQuery,
  listFamilyPortalInvitations,
  listHouseholds,
  inviteUserToParish,
  resendInvitation,
} from "wasp/client/operations";
import {
  Mail,
  UserPlus,
  Copy,
  RefreshCw,
  ExternalLink,
  Heart,
  GraduationCap,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageCircle,
} from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import {
  AppPageHeader,
  AppPanel,
  AppEyebrow,
} from "../../client/components/brand/AppChrome";
import { EmptyState } from "../../client/components/EmptyState";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import { useRoleLabels } from "../../i18n/useLabels";
import { toast } from "../../client/hooks/use-toast";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/useLocale";

/**
 * Central place for pastoral staff to invite families to the family portal
 * and track pending invites (GUARDIAN / CATECHUMEN).
 */
export default function FamilyPortalInvitesPage() {
  const { t } = useTranslation("common");
  const { t: tn } = useTranslation("navigation");
  const { t: tf } = useTranslation("family");
  const roleLabels = useRoleLabels();
  const { currentLocale } = useLocale();
  const { activeParishId } = useActiveParish();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"GUARDIAN" | "CATECHUMEN">("GUARDIAN");
  const [householdId, setHouseholdId] = useState("");
  const [sending, setSending] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    const qEmail = searchParams.get("email");
    const qRole = searchParams.get("role");
    const qHousehold = searchParams.get("householdId");
    if (qEmail) setEmail(qEmail);
    if (qRole === "GUARDIAN" || qRole === "CATECHUMEN") setRole(qRole);
    if (qHousehold) setHouseholdId(qHousehold);
  }, [searchParams]);

  const {
    data: invites = [],
    isLoading,
    refetch,
  } = useQuery(
    listFamilyPortalInvitations,
    { parishId: activeParishId || "" },
    { enabled: Boolean(activeParishId) },
  );

  const { data: households = [] } = useQuery(
    listHouseholds,
    { take: 200 },
    { enabled: Boolean(activeParishId) },
  );

  const parishHouseholds = useMemo(() => {
    if (!activeParishId) return households || [];
    return (households || []).filter(
      (h: any) => !h.parishId || h.parishId === activeParishId,
    );
  }, [households, activeParishId]);

  const pendingCount = (invites as any[]).filter(
    (i) => i.status === "PENDING",
  ).length;

  const copyText = async (text: string, okMsg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: okMsg });
    } catch {
      toast({ title: t("error"), variant: "destructive" });
    }
  };

  const handleInvite = async () => {
    if (!activeParishId || !email.trim()) return;
    setSending(true);
    setLastInviteUrl(null);
    try {
      const result: any = await inviteUserToParish({
        email: email.trim().toLowerCase(),
        parishId: activeParishId,
        role,
        householdId: householdId || undefined,
      });
      const url = result?.inviteUrl as string | undefined;
      if (url) setLastInviteUrl(url);
      trackMarketingEvent("invite_sent", {
        role,
        parish_id: activeParishId,
        source: "family_portal_invites_page",
      });
      toast({ title: t("invite_sent") });
      setEmail("");
      await refetch();
    } catch (e: any) {
      // resend path throws 400 with message when already invited
      toast({
        title: e.message || t("error_invite"),
        variant: "destructive",
      });
      await refetch();
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (inv: any) => {
    setResendingId(inv.id);
    try {
      const result: any = await resendInvitation(
        inv.kind === "pending"
          ? { pendingInvitationId: inv.id }
          : { membershipId: inv.id },
      );
      if (result?.inviteUrl) setLastInviteUrl(result.inviteUrl);
      toast({ title: tf("portal_invites.resent") });
      await refetch();
    } catch (e: any) {
      toast({
        title: e.message || t("error"),
        variant: "destructive",
      });
    } finally {
      setResendingId(null);
    }
  };

  const whatsappHref = (url: string) => {
    const text = encodeURIComponent(
      tf("portal_invites.whatsapp_text", { url }),
    );
    return `https://wa.me/?text=${text}`;
  };

  if (!activeParishId) {
    return (
      <EmptyState
        icon={Mail}
        title={tf("portal_invites.need_parish")}
        description={tf("portal_invites.need_parish_desc")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow={tn("family_portal_invites")}
        title={tf("portal_invites.title")}
        subtitle={tf("portal_invites.subtitle")}
        actions={
          <Button asChild variant="outline" className="h-11 min-h-11 rounded-sm">
            <Link to="/app/families">
              <Heart className="mr-2 h-4 w-4" />
              {tn("families")}
            </Link>
          </Button>
        }
      />

      {/* How it works */}
      <AppPanel className="space-y-3">
        <div className="space-y-1.5">
          <AppEyebrow>{tf("portal_invites.how_title")}</AppEyebrow>
          <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
        </div>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>{tf("portal_invites.how_1")}</li>
          <li>{tf("portal_invites.how_2")}</li>
          <li>{tf("portal_invites.how_3")}</li>
          <li>{tf("portal_invites.how_4")}</li>
        </ol>
        <p className="text-xs text-muted-foreground border-t border-border/70 pt-3">
          {tf("portal_invites.how_note")}
        </p>
      </AppPanel>

      {/* Create invite */}
      <AppPanel className="space-y-4">
        <div className="space-y-1.5">
          <AppEyebrow className="flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5" />
            {tf("portal_invites.create_title")}
          </AppEyebrow>
          <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {tf("portal_invites.email_label")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-sm border border-input bg-background px-3 text-sm"
              placeholder={tf("portal_invites.email_placeholder")}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {tf("portal_invites.role_label")}
            </label>
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "GUARDIAN" | "CATECHUMEN")
              }
              className="h-11 w-full rounded-sm border border-input bg-background px-3 text-sm"
            >
              <option value="GUARDIAN">
                {roleLabels.GUARDIAN || tf("portal_invites.role_guardian")}
              </option>
              <option value="CATECHUMEN">
                {roleLabels.CATECHUMEN || tf("portal_invites.role_catechumen")}
              </option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {tf("portal_invites.family_label")}
            </label>
            <select
              value={householdId}
              onChange={(e) => setHouseholdId(e.target.value)}
              className="h-11 w-full rounded-sm border border-input bg-background px-3 text-sm"
            >
              <option value="">{tf("portal_invites.family_optional")}</option>
              {parishHouseholds.map((h: any) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            className="h-11 min-h-11 rounded-sm"
            disabled={sending || !email.trim()}
            onClick={handleInvite}
          >
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            {tf("portal_invites.send")}
          </Button>
        </div>

        {lastInviteUrl && (
          <div className="rounded-sm border border-[#D39A2B]/40 bg-[#D39A2B]/10 p-3 space-y-2">
            <p className="text-sm font-medium text-[#071A2D]">
              {tf("portal_invites.link_ready")}
            </p>
            <p className="break-all text-xs text-muted-foreground font-mono">
              {lastInviteUrl}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-10 rounded-sm"
                onClick={() =>
                  copyText(lastInviteUrl, tf("portal_invites.copied"))
                }
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                {tf("portal_invites.copy_link")}
              </Button>
              <Button size="sm" variant="outline" className="h-10 rounded-sm" asChild>
                <a
                  href={whatsappHref(lastInviteUrl)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                  WhatsApp
                </a>
              </Button>
            </div>
          </div>
        )}
      </AppPanel>

      {/* Pending list */}
      <AppPanel className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1.5">
            <AppEyebrow className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {tf("portal_invites.pending_title")}
            </AppEyebrow>
            <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
          </div>
          <Badge variant="secondary">
            {tf("portal_invites.pending_count", { count: pendingCount })}
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (invites as any[]).length === 0 ? (
          <EmptyState
            icon={Mail}
            title={tf("portal_invites.empty_title")}
            description={tf("portal_invites.empty_desc")}
            compact
          />
        ) : (
          <div className="overflow-x-auto rounded-sm border border-border/70">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border/70">
                <tr>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {tf("portal_invites.col_person")}
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {tf("portal_invites.col_role")}
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {tf("portal_invites.col_status")}
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {tf("portal_invites.col_expires")}
                  </th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {tf("portal_invites.col_actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {(invites as any[]).map((inv) => (
                  <tr key={`${inv.kind}-${inv.id}`} className="bg-white">
                    <td className="px-3 py-3">
                      <div className="font-medium text-[#071A2D]">
                        {inv.displayName || inv.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {inv.email}
                        {inv.hasAccount
                          ? ` · ${tf("portal_invites.has_account")}`
                          : ` · ${tf("portal_invites.no_account")}`}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1">
                        {inv.role === "CATECHUMEN" ? (
                          <GraduationCap className="h-3.5 w-3.5" />
                        ) : (
                          <Heart className="h-3.5 w-3.5" />
                        )}
                        {roleLabels[inv.role] || inv.role}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {inv.status === "EXPIRED" ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {tf("portal_invites.status_expired")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {tf("portal_invites.status_pending")}
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {inv.expiresAt
                        ? formatDate(inv.expiresAt, currentLocale, {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap justify-end gap-1">
                        {inv.inviteUrl && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 rounded-sm"
                            onClick={() =>
                              copyText(
                                inv.inviteUrl,
                                tf("portal_invites.copied"),
                              )
                            }
                            title={tf("portal_invites.copy_link")}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {inv.inviteUrl && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 rounded-sm"
                            asChild
                            title="WhatsApp"
                          >
                            <a
                              href={whatsappHref(inv.inviteUrl)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 rounded-sm"
                          disabled={resendingId === inv.id}
                          onClick={() => handleResend(inv)}
                        >
                          {resendingId === inv.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-1 h-3.5 w-3.5" />
                          )}
                          {tf("portal_invites.resend")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AppPanel>

      <AppPanel className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#071A2D]" />
          <p>{tf("portal_invites.tip_context")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-10 rounded-sm">
            <Link to="/app/families">
              <Heart className="mr-1.5 h-4 w-4" />
              {tn("families")}
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-10 rounded-sm">
            <Link to="/app/catechumens">
              <GraduationCap className="mr-1.5 h-4 w-4" />
              {tn("catechumens")}
            </Link>
          </Button>
          <Button asChild variant="ghost" className="h-10 rounded-sm" size="sm">
            <a
              href="https://familia.catechis.app"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              {tf("portal_invites.open_portal")}
            </a>
          </Button>
        </div>
      </AppPanel>
    </div>
  );
}
