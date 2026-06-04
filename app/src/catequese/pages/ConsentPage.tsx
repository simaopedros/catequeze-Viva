import { useState, useEffect } from 'react';
import { Button } from '../../client/components/ui/button';
import { Shield, CheckCircle, XCircle } from 'lucide-react';
import { AppShell } from '../AppShell';
import { listConsents, saveConsent } from 'wasp/client/operations';

const consentTypes = [
  { key: 'IMAGE_USAGE', label: 'Uso de imagem', desc: 'Autorizo o uso de fotos e vídeos em atividades da catequese.' },
  { key: 'COMMUNICATION', label: 'Comunicação', desc: 'Autorizo receber comunicados por email e notificações.' },
  { key: 'DOCUMENTS', label: 'Documentos', desc: 'Autorizo o armazenamento de documentos e certidões.' },
  { key: 'SENSITIVE_DATA', label: 'Dados sensíveis', desc: 'Autorizo o tratamento de dados sensíveis conforme LGPD.' },
];

export default function ConsentPage() {
  const [consents, setConsents] = useState<Record<string, boolean>>({});

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
              <span>Consentimentos</span>
            </div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-primary" />Consentimentos</h1>
          <p className="text-muted-foreground">Gerencie as autorizações e consentimentos conforme a LGPD.</p>
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
                  <CheckCircle className="mr-1 h-3 w-3" />Autorizo
                </Button>
                <Button size="sm" variant={!consents[ct.key] ? 'destructive' : 'outline'} onClick={() => toggle(ct.key, false)}>
                  <XCircle className="mr-1 h-3 w-3" />Nego
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
