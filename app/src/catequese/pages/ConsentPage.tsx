import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../client/components/ui/button";
import {
  AppPageHeader,
  AppPanel,
} from "../../client/components/brand/AppChrome";
import { Shield, CheckCircle, XCircle, UserRound } from "lucide-react";
import {
  listConsents,
  saveConsent,
  listMinorPortalConsents,
  grantMinorPortalConsent,
  revokeMinorPortalConsent,
} from "wasp/client/operations";
import { toast } from "../../client/hooks/use-toast";

const CONSENT_TYPE_KEYS = [
  "IMAGE_USAGE",
  "COMMUNICATION",
  "DOCUMENTS",
  "SENSITIVE_DATA",
] as const;

type MinorRow = {
  catechumenProfileId: string;
  displayName: string;
  firstName: string;
  lastName: string;
  isMinor: boolean;
  requiresConsent: boolean;
  hasActiveConsent: boolean;
  consent: { id: string; source: string; grantedAt: string | null } | null;
};

export default function ConsentPage() {
  const { t } = useTranslation("common");
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [minors, setMinors] = useState<MinorRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const consentTypes = useMemo(
    () =>
      CONSENT_TYPE_KEYS.map((key) => ({
        key,
        label: t(`consent_page.types.${key}.label`),
        desc: t(`consent_page.types.${key}.desc`),
      })),
    [t],
  );

  const loadConsents = useCallback(async () => {
    try {
      const data = await listConsents();
      const map: Record<string, boolean> = {};
      data?.forEach((c: any) => {
        map[c.type] = c.granted;
      });
      setConsents(map);
    } catch (e: any) {
      toast({
        title: t("error_loading"),
        description: e.message,
        variant: "destructive",
      });
    }
  }, [t]);

  const loadMinors = useCallback(async () => {
    try {
      const data = (await listMinorPortalConsents({})) as MinorRow[];
      setMinors(Array.isArray(data) ? data : []);
    } catch {
      // Guardians without household / staff-only users: leave empty
      setMinors([]);
    }
  }, []);

  useEffect(() => {
    loadConsents();
    loadMinors();
  }, [loadConsents, loadMinors]);

  const toggle = async (type: string, granted: boolean) => {
    try {
      await saveConsent({ type, granted });
      loadConsents();
    } catch (e: any) {
      toast({
        title: t("error_saving"),
        description: e.message,
        variant: "destructive",
      });
    }
  };

  const grantMinor = async (catechumenProfileId: string) => {
    setBusyId(catechumenProfileId);
    try {
      await grantMinorPortalConsent({
        catechumenProfileId,
        source: "GUARDIAN_PORTAL",
      });
      toast({
        title: t("consent_page.minor.grant_success", {
          defaultValue: "Acesso do menor autorizado",
        }),
      });
      await loadMinors();
    } catch (e: any) {
      toast({
        title: t("error_saving"),
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const revokeMinor = async (catechumenProfileId: string) => {
    setBusyId(catechumenProfileId);
    try {
      await revokeMinorPortalConsent({ catechumenProfileId });
      toast({
        title: t("consent_page.minor.revoke_success", {
          defaultValue: "Acesso do menor revogado",
        }),
      });
      await loadMinors();
    } catch (e: any) {
      toast({
        title: t("error_saving"),
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const minorRows = minors.filter((m) => m.isMinor);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <AppPageHeader
        eyebrow={t("consent_page.title")}
        title={t("consent_page.title")}
        subtitle={t("consent_page.subtitle")}
      />

      {/* Minor portal access (PR6) */}
      {minorRows.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-[#071A2D]" />
            <h2
              className="text-base font-semibold tracking-tight text-[#071A2D]"
              style={{ fontFamily: "var(--font-brand-display)" }}
            >
              {t("consent_page.minor.section_title", {
                defaultValue: "Acesso ao portal dos dependentes",
              })}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("consent_page.minor.section_desc", {
              defaultValue:
                "Autorize ou revogue o acesso do menor ao portal da família. A revogação suspende o login do catequizando, sem apagar o histórico.",
            })}
          </p>
          {minorRows.map((m) => (
            <AppPanel
              key={m.catechumenProfileId}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h3
                  className="font-semibold tracking-tight text-[#071A2D]"
                  style={{ fontFamily: "var(--font-brand-display)" }}
                >
                  {m.displayName ||
                    [m.firstName, m.lastName].filter(Boolean).join(" ")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {m.hasActiveConsent
                    ? t("consent_page.minor.status_active", {
                        defaultValue: "Acesso autorizado",
                      })
                    : t("consent_page.minor.status_pending", {
                        defaultValue: "Aguardando autorização",
                      })}
                  {m.consent?.source
                    ? ` · ${m.consent.source === "STAFF_OFFLINE" ? t("consent_page.minor.source_staff", { defaultValue: "Offline (paróquia)" }) : t("consent_page.minor.source_guardian", { defaultValue: "Responsável" })}`
                    : null}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  className="min-h-11 rounded-sm"
                  variant={m.hasActiveConsent ? "default" : "outline"}
                  disabled={busyId === m.catechumenProfileId || m.hasActiveConsent}
                  onClick={() => grantMinor(m.catechumenProfileId)}
                >
                  <CheckCircle className="mr-1 h-3 w-3" />
                  {t("consent_page.minor.authorize", {
                    defaultValue: "Autorizar acesso",
                  })}
                </Button>
                <Button
                  size="sm"
                  className="min-h-11 rounded-sm"
                  variant={!m.hasActiveConsent ? "destructive" : "outline"}
                  disabled={busyId === m.catechumenProfileId || !m.hasActiveConsent}
                  onClick={() => revokeMinor(m.catechumenProfileId)}
                >
                  <XCircle className="mr-1 h-3 w-3" />
                  {t("consent_page.minor.revoke", {
                    defaultValue: "Revogar",
                  })}
                </Button>
              </div>
            </AppPanel>
          ))}
        </section>
      )}

      {/* LGPD household consents */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#071A2D]" />
          <h2
            className="text-base font-semibold tracking-tight text-[#071A2D]"
            style={{ fontFamily: "var(--font-brand-display)" }}
          >
            {t("consent_page.lgpd_section", {
              defaultValue: "Consentimentos (LGPD)",
            })}
          </h2>
        </div>
        {consentTypes.map((ct) => (
          <AppPanel
            key={ct.key}
            className="flex items-center justify-between gap-4"
          >
            <div>
              <h3
                className="font-semibold tracking-tight text-[#071A2D]"
                style={{ fontFamily: "var(--font-brand-display)" }}
              >
                {ct.label}
              </h3>
              <p className="text-sm text-muted-foreground">{ct.desc}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                className="min-h-11 rounded-sm"
                variant={consents[ct.key] ? "default" : "outline"}
                onClick={() => toggle(ct.key, true)}
              >
                <CheckCircle className="mr-1 h-3 w-3" />
                {t("consent_page.authorize")}
              </Button>
              <Button
                size="sm"
                className="min-h-11 rounded-sm"
                variant={!consents[ct.key] ? "destructive" : "outline"}
                onClick={() => toggle(ct.key, false)}
              >
                <XCircle className="mr-1 h-3 w-3" />
                {t("consent_page.deny")}
              </Button>
            </div>
          </AppPanel>
        ))}
      </section>
    </div>
  );
}
