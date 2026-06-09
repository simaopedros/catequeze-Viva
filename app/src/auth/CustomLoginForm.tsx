import { useState } from 'react';
import { login } from 'wasp/client/auth';
import { signOut } from '../client/analytics/himetrica';
import { useNavigate } from 'react-router';
import { Button } from '../client/components/ui/button';
import { Input } from '../client/components/ui/input';
import { Label } from '../client/components/ui/label';
import { Checkbox } from '../client/components/ui/checkbox';
import { Cross, Loader2, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react';
import { getTwoFactorStatus, verifyTwoFactorLogin, beginTwoFactorChallenge } from 'wasp/client/operations';
import { isFamilyPortalHost } from '../shared/portal';

type Step = 'login' | 'twofactor';

type CustomLoginFormProps = {
  inviteToken?: string | null;
};

function postLoginPath(inviteToken?: string | null): string {
  if (inviteToken) return `/convite/${encodeURIComponent(inviteToken)}`;
  return isFamilyPortalHost() ? '/app' : '/app';
}

export default function CustomLoginForm({ inviteToken }: CustomLoginFormProps = {}) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [twoFactorToken, setTwoFactorToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Preencha todos os campos.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await login({ email, password });
      const status = await getTwoFactorStatus();
      if (status.enabled) {
        await beginTwoFactorChallenge();
        setStep('twofactor');
      } else {
        navigate(postLoginPath(inviteToken));
      }
    } catch (err: any) {
      setError(err?.message || 'Email ou senha incorretos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorToken.length !== 6) {
      setError('Digite o código de 6 dígitos.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await verifyTwoFactorLogin({ token: twoFactorToken });
      navigate(postLoginPath(inviteToken));
    } catch (err: any) {
      setError(err?.message || 'Código inválido.');
      setIsLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    try {
      await signOut();
    } catch {
      // ignore logout errors while resetting the form
    }
    setStep('login');
    setTwoFactorToken('');
    setError('');
  };

  if (step === 'twofactor') {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex rounded-xl bg-primary/10 p-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Verificação em duas etapas</h1>
          <p className="text-sm text-muted-foreground">Insira o código de 6 dígitos do seu aplicativo autenticador</p>
        </div>

        <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="totp">Código de verificação</Label>
            <Input
              id="totp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={twoFactorToken}
              onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="font-mono text-center text-2xl tracking-[0.5em]"
              disabled={isLoading}
              autoFocus
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || twoFactorToken.length !== 6}>
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</>
            ) : (
              'Verificar'
            )}
          </Button>

          <button
            type="button"
            onClick={handleBackToLogin}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" /> Voltar ao login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex rounded-xl bg-primary/10 p-3">
          <Cross className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Bem-vindo de volta</h1>
        <p className="text-sm text-muted-foreground">Entre na sua conta para continuar</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
            disabled={isLoading}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <a href="/request-password-reset" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Esqueceu a senha?
            </a>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isLoading}
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={rememberMe}
            onCheckedChange={(v) => setRememberMe(!!v)}
            disabled={isLoading}
          />
          <Label htmlFor="remember" className="text-sm cursor-pointer">Lembrar-me</Label>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</>
          ) : (
            'Entrar'
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Ainda não tem uma conta?{' '}
        <a
          href={
            inviteToken
              ? `${isFamilyPortalHost() ? '/criar-conta' : '/signup'}?token=${encodeURIComponent(inviteToken)}`
              : isFamilyPortalHost() ? '/criar-conta' : '/signup'
          }
          className="font-medium text-primary hover:underline"
        >
          Criar conta
        </a>
      </p>
    </div>
  );
}
