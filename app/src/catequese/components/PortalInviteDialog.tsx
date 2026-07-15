import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../client/components/ui/button";
import { Checkbox } from "../../client/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../client/components/ui/dialog";
import {
  createPortalInvitation,
  grantMinorPortalConsent,
  listMinorPortalConsents,
} from "wasp/client/operations";
import { toast } from "../../client/hooks/use-toast";
import { getAgeFromDate } from "../../i18n/format";
import { Copy, Loader2, Mail, MessageCircle } from "lucide-react";

export type PortalInviteRole = "GUARDIAN" | "CATECHUMEN";

export type PortalInviteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: PortalInviteRole;
  parishId: string;
  /** Display name of the target profile */
  profileName?: string | null;
  defaultEmail?: string | null;
  guardianProfileId?: string;
  catechumenProfileId?: string;
  householdId?: string | null;
  communityId?: string | null;
  birthDate?: string | Date | null;
  /** Optional known consent state; if unknown for minors, dialog will query */
  hasActiveConsent?: boolean | null;
  onCreated?: (result: PortalInviteSuccess) => void;
};

export type PortalInviteSuccess = {
  id: string;
  inviteUrl?: string;
  whatsappUrl?: string;
  emailMasked?: string;
};

function isMinorBirthDate(birthDate: string | Date | null | undefined): boolean {
  if (birthDate == null || birthDate === "") return true;
  const age = getAgeFromDate(
    typeof birthDate === "string" ? birthDate : birthDate.toISOString(),
  );
  if (age == null) return true;
  return age < 18;
}

export function PortalInviteDialog({
  open,
  onOpenChange,
  role,
  parishId,
  profileName,
  defaultEmail,
  guardianProfileId,
  catechumenProfileId,
  householdId,
  communityId,
  birthDate,
  hasActiveConsent: hasActiveConsentProp,
  onCreated,
}: PortalInviteDialogProps) {
  const { t } = useTranslation("common");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [offlineGrant, setOfflineGrant] = useState(false);
  const [consentKnown, setConsentKnown] = useState<boolean | null>(
    hasActiveConsentProp ?? null,
  );
  const [checkingConsent, setCheckingConsent] = useState(false);
  const [success, setSuccess] = useState<PortalInviteSuccess | null>(null);

  const minor = role === "CATECHUMEN" && isMinorBirthDate(birthDate);
  /** Explicit false requires offline grant; null (unknown) warns but still allows send */
  const needsConsent = minor && consentKnown === false;

  useEffect(() => {
    if (!open) return;
    setEmail((defaultEmail || "").trim());
    setOfflineGrant(false);
    setSuccess(null);
    setConsentKnown(hasActiveConsentProp ?? null);
  }, [open, defaultEmail, hasActiveConsentProp]);

  useEffect(() => {
    if (!open || role !== "CATECHUMEN" || !minor || !catechumenProfileId) return;
    if (hasActiveConsentProp != null) {
      setConsentKnown(hasActiveConsentProp);
      return;
    }
    let cancelled = false;
    setCheckingConsent(true);
    (async () => {
      try {
        const rows = (await listMinorPortalConsents({
          parishId,
        })) as Array<{ catechumenProfileId: string; hasActiveConsent: boolean }>;
        if (cancelled) return;
        const row = rows?.find((r) => r.catechumenProfileId === catechumenProfileId);
        setConsentKnown(!!row?.hasActiveConsent);
      } catch {
        // Staff without coord list permission: leave unknown (warn, do not hard-block)
        if (!cancelled) setConsentKnown(null);
      } finally {
        if (!cancelled) setCheckingConsent(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    role,
    minor,
    catechumenProfileId,
    parishId,
    hasActiveConsentProp,
  ]);

  const title = useMemo(() => {
    if (role === "GUARDIAN") {
      return t("portal_invites.invite_guardian_title", {
        defaultValue: "Convidar responsável",
      });
    }
    return t("portal_invites.invite_catechumen_title", {
      defaultValue: "Convidar para o portal",
    });
  }, [role, t]);

  const description = useMemo(() => {
    if (profileName) {
      return t("portal_invites.invite_for_profile", {
        name: profileName,
        defaultValue: "Enviar convite do portal para {{name}}.",
      });
    }
    return t("portal_invites.invite_desc", {
      defaultValue:
        "O convidado receberá um e-mail com o link. Você também poderá copiar o link ou partilhar no WhatsApp.",
    });
  }, [profileName, t]);

  const handleSubmit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      toast({
        title: t("portal_invites.invalid_email", {
          defaultValue: "Informe um e-mail válido.",
        }),
        variant: "destructive",
      });
      return;
    }
    if (!parishId) {
      toast({
        title: t("error"),
        description: t("portal_invites.missing_parish", {
          defaultValue: "Paróquia ativa não encontrada.",
        }),
        variant: "destructive",
      });
      return;
    }
    if (needsConsent && !offlineGrant) {
      toast({
        title: t("portal_invites.consent_required_title", {
          defaultValue: "Consentimento necessário",
        }),
        description: t("portal_invites.consent_required_desc", {
          defaultValue:
            "Menores precisam de autorização do responsável ou registro offline da paróquia antes do convite.",
        }),
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Honor offline checkbox whenever checked (including consentKnown === null).
      // Needs-consent path still hard-blocks when unchecked; unknown path is soft.
      if (offlineGrant && catechumenProfileId && role === "CATECHUMEN") {
        try {
          await grantMinorPortalConsent({
            catechumenProfileId,
            source: "STAFF_OFFLINE",
          });
          setConsentKnown(true);
        } catch (grantErr: any) {
          // When consent is required (known false), do not create invite without grant.
          if (needsConsent) {
            toast({
              title: t("portal_invites.consent_required_title", {
                defaultValue: "Consentimento necessário",
              }),
              description:
                grantErr?.message ||
                t("portal_invites.offline_grant_failed", {
                  defaultValue:
                    "Não foi possível registrar a autorização offline. Verifique permissões de coordenação.",
                }),
              variant: "destructive",
            });
            return;
          }
          // Consent unknown: warn but still allow invite (accept path enforces consent).
          toast({
            title: t("portal_invites.offline_grant_failed", {
              defaultValue:
                "Não foi possível registrar a autorização offline. Verifique permissões de coordenação.",
            }),
            description: t("portal_invites.invite_without_grant_hint", {
              defaultValue:
                "O convite será enviado, mas o menor ainda precisará de autorização para ativar a conta.",
            }),
            variant: "destructive",
          });
        }
      }

      const result = await createPortalInvitation({
        parishId,
        role,
        email: trimmed,
        guardianProfileId:
          role === "GUARDIAN" ? guardianProfileId : undefined,
        catechumenProfileId:
          role === "CATECHUMEN" ? catechumenProfileId : undefined,
        householdId: householdId || undefined,
        communityId: communityId || undefined,
      });

      const payload: PortalInviteSuccess = {
        id: result.id,
        inviteUrl: result.inviteUrl,
        whatsappUrl: result.whatsappUrl,
        emailMasked: result.emailMasked,
      };
      setSuccess(payload);
      onCreated?.(payload);
      toast({
        title: t("portal_invites.created_success", {
          defaultValue: "Convite criado",
        }),
        description: t("portal_invites.created_success_desc", {
          defaultValue: "E-mail enviado quando possível. Copie o link ou partilhe no WhatsApp.",
        }),
      });
    } catch (e: any) {
      const code = e?.data?.data?.code || e?.message;
      let message = e?.message || t("try_again");
      if (code === "EMAIL_ROLE_CONFLICT" || String(e?.message).includes("EMAIL_ROLE_CONFLICT")) {
        message = t("portal_invites.email_role_conflict", {
          defaultValue:
            "Este e-mail já está vinculado a outro papel no portal desta paróquia.",
        });
      }
      toast({
        title: t("portal_invites.create_error", {
          defaultValue: "Não foi possível criar o convite",
        }),
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyInviteUrl = async () => {
    if (!success?.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(success.inviteUrl);
      toast({
        title: t("portal_invites.link_copied", {
          defaultValue: "Link copiado",
        }),
      });
    } catch {
      toast({
        title: t("error"),
        description: t("portal_invites.copy_failed", {
          defaultValue: "Não foi possível copiar o link.",
        }),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("portal_invites.success_hint", {
                defaultValue:
                  "O link completo só é mostrado uma vez. Guarde-o ou partilhe agora.",
              })}
            </p>
            {success.inviteUrl && (
              <div className="rounded-sm border border-border/70 bg-muted/30 p-3">
                <p className="break-all text-xs text-[#071A2D]">
                  {success.inviteUrl}
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={copyInviteUrl}
                disabled={!success.inviteUrl}
              >
                <Copy className="mr-1 h-3.5 w-3.5" />
                {t("portal_invites.copy_link", {
                  defaultValue: "Copiar link",
                })}
              </Button>
              {success.whatsappUrl && (
                <Button type="button" size="sm" variant="outline" asChild>
                  <a
                    href={success.whatsappUrl}
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
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                {t("close", { defaultValue: "Fechar" })}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {t("email", { defaultValue: "E-mail" })}
              </label>
              <div className="relative mt-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-10 w-full rounded-sm border border-input bg-background py-2 pl-9 pr-3 text-sm"
                  placeholder={t("families.email_placeholder", {
                    defaultValue: "email@exemplo.com",
                  })}
                  autoComplete="email"
                />
              </div>
            </div>

            {role === "CATECHUMEN" && minor && (
              <div className="space-y-2 rounded-sm border border-amber-200 bg-amber-50/80 p-3">
                <p className="text-sm font-medium text-[#071A2D]">
                  {t("portal_invites.minor_notice_title", {
                    defaultValue: "Catequizando menor de idade",
                  })}
                </p>
                {checkingConsent ? (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t("portal_invites.checking_consent", {
                      defaultValue: "A verificar consentimento…",
                    })}
                  </p>
                ) : consentKnown === true ? (
                  <p className="text-xs text-muted-foreground">
                    {t("portal_invites.consent_ok", {
                      defaultValue:
                        "Já existe autorização ativa para acesso ao portal.",
                    })}
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {t("portal_invites.minor_notice_desc", {
                        defaultValue:
                          "Sem consentimento do responsável, o menor não consegue ativar a conta. Registre autorização offline da paróquia ou peça ao responsável para autorizar em Consentimentos.",
                      })}
                    </p>
                    {consentKnown === null && (
                      <p className="text-xs text-muted-foreground">
                        {t("portal_invites.consent_unknown", {
                          defaultValue:
                            "Não foi possível confirmar o consentimento. O convite pode ser enviado; a ativação do menor continua a exigir autorização.",
                        })}
                      </p>
                    )}
                    <label className="flex cursor-pointer items-start gap-2 text-sm">
                      <Checkbox
                        checked={offlineGrant}
                        onCheckedChange={(v) => setOfflineGrant(v === true)}
                        className="mt-0.5"
                      />
                      <span>
                        {t("portal_invites.staff_offline_checkbox", {
                          defaultValue:
                            "Registrar autorização offline da paróquia e enviar o convite",
                        })}
                      </span>
                    </label>
                  </>
                )}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                {t("cancel", { defaultValue: "Cancelar" })}
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  checkingConsent ||
                  (needsConsent && !offlineGrant)
                }
              >
                {submitting && (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                )}
                {t("portal_invites.send", {
                  defaultValue: "Enviar convite",
                })}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
