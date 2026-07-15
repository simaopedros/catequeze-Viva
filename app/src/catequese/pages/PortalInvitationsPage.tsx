import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AppPageHeader,
  AppPanel,
} from "../../client/components/brand/AppChrome";
import { Badge } from "../../client/components/ui/badge";
import { Button } from "../../client/components/ui/button";
import {
  useQuery,
  listPortalInvitations,
  resendPortalInvitation,
  revokePortalInvitation,
} from "wasp/client/operations";
import { useActiveWorkspace } from "../../client/hooks/useActiveWorkspace";
import { toast } from "../../client/hooks/use-toast";
import { ConfirmDialog } from "../../client/components/ConfirmDialog";
import {
  Copy,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  Ban,
  Filter,
} from "lucide-react";
import { formatDateOnly } from "../../i18n/format";

const STATUS_FILTERS = [
  "ALL",
  "PENDING",
  "ACCEPTED",
  "EXPIRED",
  "REVOKED",
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];

type InviteRow = {
  id: string;
  role: string;
  status: string;
  emailMasked: string;
  profileDisplayName?: string | null;
  expiresAt?: string | null;
  lastSentAt?: string | null;
  acceptedAt?: string | null;
  resendCount?: number;
  createdAt?: string | null;
};

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "PENDING") return "default";
  if (status === "ACCEPTED") return "secondary";
  if (status === "EXPIRED" || status === "REVOKED") return "outline";
  return "outline";
}

export default function PortalInvitationsPage() {
  const { t } = useTranslation("common");
  const { t: tn } = useTranslation("navigation");
  const { workspaceId } = useActiveWorkspace();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<InviteRow | null>(null);
  const [lastShare, setLastShare] = useState<{
    inviteUrl?: string;
    whatsappUrl?: string;
  } | null>(null);

  // Never keep a tokenized invite URL after switching parish/workspace
  useEffect(() => {
    setLastShare(null);
  }, [workspaceId]);

  const queryArgs = useMemo(() => {
    if (!workspaceId) return undefined;
    return {
      parishId: workspaceId,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      take: 100,
    };
  }, [workspaceId, statusFilter]);

  const {
    data: invites = [],
    isLoading,
    error,
    refetch,
  } = useQuery(listPortalInvitations, queryArgs as any, {
    enabled: !!workspaceId,
  });

  const rows = (Array.isArray(invites) ? invites : []) as InviteRow[];

  const labelStatus = useCallback(
    (status: string) =>
      t(`portal_invites.status.${status}`, {
        defaultValue: status,
      }),
    [t],
  );

  const labelRole = useCallback(
    (role: string) =>
      t(`portal_invites.role.${role}`, {
        defaultValue: role,
      }),
    [t],
  );

  const handleResend = async (row: InviteRow) => {
    setBusyId(row.id);
    try {
      const result = await resendPortalInvitation({ invitationId: row.id });
      setLastShare({
        inviteUrl: result.inviteUrl,
        whatsappUrl: result.whatsappUrl,
      });
      toast({
        title: t("portal_invites.resend_success", {
          defaultValue: "Convite reenviado",
        }),
      });
      await refetch();
    } catch (e: any) {
      toast({
        title: t("portal_invites.resend_error", {
          defaultValue: "Falha ao reenviar",
        }),
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setBusyId(revokeTarget.id);
    try {
      await revokePortalInvitation({ invitationId: revokeTarget.id });
      toast({
        title: t("portal_invites.revoke_success", {
          defaultValue: "Convite revogado",
        }),
      });
      setRevokeTarget(null);
      await refetch();
    } catch (e: any) {
      toast({
        title: t("portal_invites.revoke_error", {
          defaultValue: "Falha ao revogar",
        }),
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const copyLink = async (url?: string) => {
    if (!url) {
      toast({
        title: t("portal_invites.no_link_available", {
          defaultValue:
            "Link completo só está disponível após criar ou reenviar o convite.",
        }),
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: t("portal_invites.link_copied", {
          defaultValue: "Link copiado",
        }),
      });
    } catch {
      toast({
        title: t("error"),
        variant: "destructive",
      });
    }
  };

  if (!workspaceId) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-sm text-muted-foreground">
        {t("portal_invites.select_workspace", {
          defaultValue: "Selecione uma paróquia/espaço de trabalho.",
        })}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AppPageHeader
        eyebrow={tn("portal_invitations", {
          defaultValue: "Convites do portal",
        })}
        title={t("portal_invites.center_title", {
          defaultValue: "Central de convites do portal",
        })}
        subtitle={t("portal_invites.center_subtitle", {
          defaultValue:
            "Acompanhe convites PENDING, ACCEPTED, EXPIRED e REVOKED. Reenvie, revogue ou partilhe no WhatsApp após reenvio.",
        })}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-1 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            {t("portal_invites.refresh", { defaultValue: "Atualizar" })}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {STATUS_FILTERS.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? "default" : "outline"}
            className="h-8 rounded-sm"
            onClick={() => setStatusFilter(s)}
          >
            {s === "ALL"
              ? t("portal_invites.filter_all", { defaultValue: "Todos" })
              : labelStatus(s)}
          </Button>
        ))}
      </div>

      {lastShare?.inviteUrl && (
        <AppPanel className="space-y-2 border-[#D39A2B]/40 bg-[#D39A2B]/5">
          <p className="text-sm font-medium text-[#071A2D]">
            {t("portal_invites.last_share_title", {
              defaultValue: "Link do último reenvio",
            })}
          </p>
          <p className="break-all text-xs text-muted-foreground">
            {lastShare.inviteUrl}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyLink(lastShare.inviteUrl)}
            >
              <Copy className="mr-1 h-3.5 w-3.5" />
              {t("portal_invites.copy_link", { defaultValue: "Copiar link" })}
            </Button>
            {lastShare.whatsappUrl && (
              <Button size="sm" variant="outline" asChild>
                <a
                  href={lastShare.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="mr-1 h-3.5 w-3.5" />
                  {t("portal_invites.share_whatsapp", {
                    defaultValue: "WhatsApp",
                  })}
                </a>
              </Button>
            )}
          </div>
        </AppPanel>
      )}

      {error && (
        <p className="text-sm text-destructive">
          {(error as any)?.message ||
            t("portal_invites.load_error", {
              defaultValue: "Erro ao carregar convites.",
            })}
        </p>
      )}

      {isLoading && rows.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("loading", { defaultValue: "A carregar…" })}
        </div>
      ) : rows.length === 0 ? (
        <AppPanel>
          <p className="text-sm text-muted-foreground">
            {t("portal_invites.empty", {
              defaultValue: "Nenhum convite neste filtro.",
            })}
          </p>
        </AppPanel>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <AppPanel
              key={row.id}
              className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className="font-semibold tracking-tight text-[#071A2D]"
                    style={{ fontFamily: "var(--font-brand-display)" }}
                  >
                    {row.profileDisplayName ||
                      t("portal_invites.unnamed_profile", {
                        defaultValue: "Perfil sem nome",
                      })}
                  </p>
                  <Badge variant={statusVariant(row.status)}>
                    {labelStatus(row.status)}
                  </Badge>
                  <Badge variant="outline">{labelRole(row.role)}</Badge>
                </div>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{row.emailMasked}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.expiresAt &&
                    `${t("portal_invites.expires", {
                      defaultValue: "Expira",
                    })}: ${formatDateOnly(row.expiresAt, "pt-BR")}`}
                  {typeof row.resendCount === "number" && row.resendCount > 0
                    ? ` · ${t("portal_invites.resends", {
                        count: row.resendCount,
                        defaultValue: "{{count}} reenvio(s)",
                      })}`
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {row.status === "PENDING" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === row.id}
                      onClick={() => handleResend(row)}
                      title={t("portal_invites.resend", {
                        defaultValue: "Reenviar",
                      })}
                    >
                      {busyId === row.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-1 h-3.5 w-3.5" />
                      )}
                      {t("portal_invites.resend", {
                        defaultValue: "Reenviar",
                      })}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      disabled={busyId === row.id}
                      onClick={() => setRevokeTarget(row)}
                    >
                      <Ban className="mr-1 h-3.5 w-3.5" />
                      {t("portal_invites.revoke", {
                        defaultValue: "Revogar",
                      })}
                    </Button>
                  </>
                )}
              </div>
            </AppPanel>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
        title={t("portal_invites.revoke_confirm_title", {
          defaultValue: "Revogar convite?",
        })}
        description={t("portal_invites.revoke_confirm_desc", {
          defaultValue:
            "O link deixa de ser válido. Pode criar um novo convite depois.",
        })}
        confirmLabel={t("portal_invites.revoke", { defaultValue: "Revogar" })}
        onConfirm={handleRevoke}
        loading={busyId === revokeTarget?.id}
        variant="destructive"
      />
    </div>
  );
}
