import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../client/components/ui/button';
import { Shield, CheckCircle, XCircle } from 'lucide-react';
import { AppShell } from '../AppShell';
import { listConsents, saveConsent } from 'wasp/client/operations';

const CONSENT_TYPE_KEYS = ['IMAGE_USAGE', 'COMMUNICATION', 'DOCUMENTS', 'SENSITIVE_DATA'] as const;

export default function ConsentPage() {
  const { t } = useTranslation('common');
  const [consents, setConsents] = useState<Record<string, boolean>>({});

  const consentTypes = useMemo(
    () => CONSENT_TYPE_KEYS.map(key => ({
      key,
      label: t(`consent_page.types.${key}.label`),
      desc: t(`consent_page.types.${key}.desc`),
    })),
    [t],
  );

  useEffect(() => { loadConsents(); }, []);

  const loadConsents = async () => {
    try {
      const data = await listConsents();
      const map: Record<string, boolean> = {};
      data?.forEach((c: any) => { map[c.type] = c.granted; });
      setConsents(map);
    } catch (e) { console.error('Erro ao carregar consentimentos:', e); }
  };

  const toggle = async (type: string, granted: boolean) => {
    try {
      await saveConsent({ type, granted });
      loadConsents();
    } catch (e) { console.error('Erro ao salvar consentimento:', e); }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span>{t('consent_page.title')}</span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />{t('consent_page.title')}
          </h1>
          <p className="text-muted-foreground">{t('consent_page.subtitle')}</p>
        </div>
        <div className="space-y-3">
          {consentTypes.map(ct => (
            <div key={ct.key} className="rounded-xl border bg-card p-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{ct.label}</h3>
                <p className="text-sm text-muted-foreground">{ct.desc}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant={consents[ct.key] ? 'default' : 'outline'} onClick={() => toggle(ct.key, true)}>
                  <CheckCircle className="mr-1 h-3 w-3" />{t('consent_page.authorize')}
                </Button>
                <Button size="sm" variant={!consents[ct.key] ? 'destructive' : 'outline'} onClick={() => toggle(ct.key, false)}>
                  <XCircle className="mr-1 h-3 w-3" />{t('consent_page.deny')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
