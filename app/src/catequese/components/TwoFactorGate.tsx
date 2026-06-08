import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { signOut } from '../../client/analytics/himetrica';
import { getTwoFactorStatus, verifyTwoFactorLogin } from 'wasp/client/operations';
import { Button } from '../../client/components/ui/button';
import { Input } from '../../client/components/ui/input';
import { Label } from '../../client/components/ui/label';
import { Loader2, ShieldCheck } from 'lucide-react';

/**
 * Blocks app access until 2FA is verified for the current login session.
 */
export function TwoFactorGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getTwoFactorStatus()
      .then((status) => {
        setNeedsVerification(status.enabled && !status.sessionVerified);
      })
      .catch(() => setNeedsVerification(false))
      .finally(() => setChecking(false));
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (token.length !== 6) return;
    setSubmitting(true);
    setError('');
    try {
      await verifyTwoFactorLogin({ token });
      setNeedsVerification(false);
    } catch (err: any) {
      setError(err?.message || 'Código inválido.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    try {
      await signOut();
    } catch {
      // ignore
    }
    navigate('/login');
  };

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (needsVerification) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6 rounded-xl border bg-card p-6 shadow-sm">
          <div className="text-center space-y-2">
            <div className="inline-flex rounded-xl bg-primary/10 p-3">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Verificação em duas etapas</h1>
            <p className="text-sm text-muted-foreground">
              Confirme o código do autenticador para continuar.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="app-totp">Código de verificação</Label>
              <Input
                id="app-totp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="font-mono text-center text-2xl tracking-[0.5em]"
                autoFocus
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting || token.length !== 6}>
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</>
              ) : (
                'Continuar'
              )}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={handleCancel}>
              Sair
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
