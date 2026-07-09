import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { startTwoFactorSetup, verifyTwoFactorSetup, disableTwoFactor, getTwoFactorStatus } from 'wasp/client/operations';
import { Button } from '../../client/components/ui/button';
import { Input } from '../../client/components/ui/input';
import { Shield, ShieldCheck, ShieldAlert, Loader2, QrCode, Key, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function TwoFactorSetup() {
  const { t } = useTranslation(['auth', 'common']);
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
      setError(e.message || t('two_factor_setup_error_init'));
    }
    setActionLoading(false);
  };

  const handleVerifySetup = async () => {
    if (token.length !== 6) { setError(t('two_factor_setup_error_otp_required')); return; }
    setActionLoading(true); setError(''); setSuccess('');
    try {
      await verifyTwoFactorSetup({ token });
      setSuccess(t('two_factor_setup_success_activate'));
      setSetupStep('idle');
      setToken('');
      setSecret('');
      setUri('');
      loadStatus();
    } catch (e: any) {
      setError(e.message || t('two_factor_setup_error_activate'));
    }
    setActionLoading(false);
  };

  const handleDisable = async () => {
    if (disableToken.length !== 6) { setError(t('two_factor_setup_error_deactivate_required')); return; }
    setActionLoading(true); setError(''); setSuccess('');
    try {
      await disableTwoFactor({ token: disableToken });
      setSuccess(t('two_factor_setup_success_deactivate'));
      setDisableToken('');
      loadStatus();
    } catch (e: any) {
      setError(e.message || t('two_factor_setup_error_deactivate'));
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
      <div className="rounded-sm border border-border/70 bg-white p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Shield className="h-4 w-4"/>{t('two_factor_setup_security_title')}</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/>{t('two_factor_setup_loading')}</div>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-border/70 bg-white p-6 space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Shield className="h-4 w-4"/>{t('two_factor_setup_security_title')}
        {status.enabled ? (
          <span className="text-xs text-green-600 flex items-center gap-1"><ShieldCheck className="h-3 w-3"/>{t('two_factor_setup_active')}</span>
        ) : (
          <span className="text-xs text-muted-foreground flex items-center gap-1"><ShieldAlert className="h-3 w-3"/>{t('two_factor_setup_inactive')}</span>
        )}
      </h3>

      {status.required && !status.enabled && (
        <div className="rounded-sm bg-warning/10 border border-warning/30 p-3 text-sm text-warning">
          {t('two_factor_setup_admin_required')}
        </div>
      )}

      {error && (
        <div className="rounded-sm border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      {success && (
        <div className="rounded-sm border border-border/70 bg-muted/30 p-3 text-sm text-foreground">{success}</div>
      )}

      {/* Not enabled — show enable flow */}
      {!status.enabled && setupStep === 'idle' && (
        <div>
          <p className="text-xs text-muted-foreground mb-3">
            {t('two_factor_setup_activate_desc')}
          </p>
          <Button size="sm" onClick={handleStartSetup} disabled={actionLoading}>
            {actionLoading ? <><Loader2 className="mr-1 h-3 w-3 animate-spin"/>{t('two_factor_setup_activating')}</> : <><QrCode className="mr-1 h-3 w-3"/>{t('two_factor_setup_activate_button')}</>}
          </Button>
        </div>
      )}

      {/* QR Code step */}
      {!status.enabled && setupStep === 'qr' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{t('two_factor_setup_scan_instruction')}</p>
          <div className="flex justify-center">
            <QRCodeSVG
              value={uri}
              size={180}
              className="rounded-sm border border-border/70 bg-white p-2"
            />
          </div>
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">{t('two_factor_setup_cannot_scan')}</summary>
            <p className="mt-1 break-all font-mono text-overline bg-muted p-2 rounded">{secret}</p>
          </details>
          <div className="flex gap-2">
            <Input
              value={token}
              onChange={e => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder={t("two_factor_code_placeholder") || "Código de 6 dígitos"}
              maxLength={6}
              className="font-mono text-center tracking-widest"
              disabled={actionLoading}
            />
            <Button size="sm" onClick={handleVerifySetup} disabled={actionLoading || token.length !== 6}>
              {actionLoading ? <Loader2 className="h-3 w-3 animate-spin"/> : t('verify') || 'Verificar'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancelSetup} disabled={actionLoading}>{t('cancel')}</Button>
          </div>
        </div>
      )}

      {/* Already enabled — show disable option */}
      {status.enabled && (
        <div>
          <p className="text-xs text-muted-foreground mb-3">
            {t('two_factor_setup_deactivate_instruction')}
          </p>
          <div className="flex gap-2">
            <Input
              value={disableToken}
              onChange={e => setDisableToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder={t("two_factor_code_placeholder") || "Código de 6 dígitos"}
              maxLength={6}
              className="font-mono text-center tracking-widest max-w-[160px]"
              disabled={actionLoading}
            />
            <Button size="sm" variant="destructive" onClick={handleDisable} disabled={actionLoading || disableToken.length !== 6}>
              {actionLoading ? <Loader2 className="h-3 w-3 animate-spin"/> : <><Trash2 className="mr-1 h-3 w-3"/>{t('two_factor_setup_deactivate_button')}</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
