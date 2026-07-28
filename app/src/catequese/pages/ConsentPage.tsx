import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../client/components/ui/button";
import {
  AppPageHeader,
  AppPanel,
} from "../../client/components/brand/AppChrome";
import { Shield, CheckCircle, XCircle } from "lucide-react";
import { listConsents, saveConsent } from "wasp/client/operations";
import { toast } from "../../client/hooks/use-toast";

const CONSENT_TYPE_KEYS = [
  "IMAGE_USAGE",
  "COMMUNICATION",
  "DOCUMENTS",
  "SENSITIVE_DATA",
] as const;

export default function ConsentPage() {
  const { t } = useTranslation("common");
  const [consents, setConsents] = useState<Record<string, boolean>>({});

  const consentTypes = useMemo(
    () =>
      CONSENT_TYPE_KEYS.map((key) => ({
        key,
        label: t(`consent_page.types.${key}.label`),
        desc: t(`consent_page.types.${key}.desc`),
      })),
    [t],
  );

  useEffect(() => {
    loadConsents();
  }, []);

  const loadConsents = async () => {
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
  };

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

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <AppPageHeader
        eyebrow={t("consent_page.title")}
        title={t("consent_page.title")}
        subtitle={t("consent_page.subtitle")}
      />
      <div className="space-y-3">
        {consentTypes.map((ct) => (
          <AppPanel
            key={ct.key}
            className="flex items-center justify-between gap-4"
          >
            <div>
              <h3 className="font-brand-display font-semibold tracking-tight text-brand-ink">
                {ct.label}
              </h3>
              <p className="text-sm text-muted-foreground">{ct.desc}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                className="rounded-sm"
                variant={consents[ct.key] ? "default" : "outline"}
                onClick={() => toggle(ct.key, true)}
              >
                <CheckCircle className="mr-1 h-3 w-3" />
                {t("consent_page.authorize")}
              </Button>
              <Button
                size="sm"
                className="rounded-sm"
                variant={!consents[ct.key] ? "destructive" : "outline"}
                onClick={() => toggle(ct.key, false)}
              >
                <XCircle className="mr-1 h-3 w-3" />
                {t("consent_page.deny")}
              </Button>
            </div>
          </AppPanel>
        ))}
      </div>
    </div>
  );
}
