import { useState, useEffect } from 'react';
import { startTwoFactorSetup, verifyTwoFactorSetup, disableTwoFactor, getTwoFactorStatus } from 'wasp/client/operations';
import { Button } from '../../client/components/ui/button';
import { Input } from '../../client/components/ui/input';
import { Shield, ShieldCheck, ShieldAlert, Loader2, QrCode, Key, Trash2 } from 'lucide-react';

export default function TwoFactorSetup() {
  const [status, setStatus] = useState<{ enabled: boolean; required: boolean }>({ enabled: false, required: false });
  const [loading, setLoading] = useState(true);
  const [setupStep, setSetupStep] = useState<'idle' | 'qr' | 'verify'>('idle');
  const [secret, setSecret] = useState('');
  const [uri, setUri] = useState('');
  const [token, setToken] = useState('');
  const [disableToken, setDisableToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const s = await getTwoFactorStatus();
      setStatus(s);
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  const handleStartSetup = async () => {
    setActionLoading(true); setError(''); setSuccess('');
    try {
      const result = await startTwoFactorSetup();
      setSecret(result.secret);
      setUri(result.uri);
      setSetupStep('qr');
    } catch (e: any) {
      setError(e.message || 'Erro ao iniciar configuração.');
    }
    setActionLoading(false);
  };

  const handleVerifySetup = async () => {
    if (token.length !== 6) { setError('Digite o código de 6 dígitos.'); return; }
    setActionLoading(true); setError(''); setSuccess('');
    try {
      await verifyTwoFactorSetup({ token });
      setSuccess('Autenticação de dois fatores ativada com sucesso!');
      setSetupStep('idle');
      setToken('');
      setSecret('');
      setUri('');
      loadStatus();
    } catch (e: any) {
      setError(e.message || 'Código inválido.');
    }
    setActionLoading(false);
  };

  const handleDisable = async () => {
    if (disableToken.length !== 6) { setError('Digite o código de 6 dígitos para desativar.'); return; }
    setActionLoading(true); setError(''); setSuccess('');
    try {
      await disableTwoFactor({ token: disableToken });
      setSuccess('2FA desativado com sucesso.');
      setDisableToken('');
      loadStatus();
    } catch (e: any) {
      setError(e.message || 'Código inválido.');
    }
    setActionLoading(false);
  };

  const handleCancelSetup = () => {
    setSetupStep('idle');
    setToken('');
    setSecret('');
    setUri('');
    setError('');
  };

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Shield className="h-4 w-4"/>Segurança</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/>Carregando...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Shield className="h-4 w-4"/>Segurança
        {status.enabled ? (
          <span className="text-xs text-green-600 flex items-center gap-1"><ShieldCheck className="h-3 w-3"/>Ativado</span>
        ) : (
          <span className="text-xs text-muted-foreground flex items-center gap-1"><ShieldAlert className="h-3 w-3"/>Desativado</span>
        )}
      </h3>

      {status.required && !status.enabled && (
        <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 text-sm text-warning">
          Como administrador, a autenticação de dois fatores é <strong>obrigatória</strong> para sua conta.
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-success/10 border border-success/30 p-3 text-sm text-success">{success}</div>
      )}

      {/* Not enabled — show enable flow */}
      {!status.enabled && setupStep === 'idle' && (
        <div>
          <p className="text-xs text-muted-foreground mb-3">
            Adicione uma camada extra de segurança à sua conta. Use um aplicativo autenticador (Google Authenticator, Authy, etc.) para gerar códigos de verificação.
          </p>
          <Button size="sm" onClick={handleStartSetup} disabled={actionLoading}>
            {actionLoading ? <><Loader2 className="mr-1 h-3 w-3 animate-spin"/>Iniciando...</> : <><QrCode className="mr-1 h-3 w-3"/>Ativar 2FA</>}
          </Button>
        </div>
      )}

      {/* QR Code step */}
      {!status.enabled && setupStep === 'qr' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Escaneie o QR Code com seu aplicativo autenticador e insira o código gerado:</p>
          <div className="flex justify-center">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=${encodeURIComponent('180x180')}&data=${encodeURIComponent(uri)}`}
              alt="QR Code 2FA"
              className="rounded-lg border"
              width={180}
              height={180}
            />
          </div>
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Não consegue escanear?</summary>
            <p className="mt-1 break-all font-mono text-[10px] bg-muted p-2 rounded">{secret}</p>
          </details>
          <div className="flex gap-2">
            <Input
              value={token}
              onChange={e => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Código de 6 dígitos"
              maxLength={6}
              className="font-mono text-center tracking-widest"
              disabled={actionLoading}
            />
            <Button size="sm" onClick={handleVerifySetup} disabled={actionLoading || token.length !== 6}>
              {actionLoading ? <Loader2 className="h-3 w-3 animate-spin"/> : 'Verificar'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancelSetup} disabled={actionLoading}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Already enabled — show disable option */}
      {status.enabled && (
        <div>
          <p className="text-xs text-muted-foreground mb-3">
            A autenticação de dois fatores está ativa. Para desativar, insira um código do seu aplicativo autenticador:
          </p>
          <div className="flex gap-2">
            <Input
              value={disableToken}
              onChange={e => setDisableToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Código de 6 dígitos"
              maxLength={6}
              className="font-mono text-center tracking-widest max-w-[160px]"
              disabled={actionLoading}
            />
            <Button size="sm" variant="destructive" onClick={handleDisable} disabled={actionLoading || disableToken.length !== 6}>
              {actionLoading ? <Loader2 className="h-3 w-3 animate-spin"/> : <><Trash2 className="mr-1 h-3 w-3"/>Desativar</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
