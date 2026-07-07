import { useEffect, useState } from 'react';
import { login } from 'wasp/client/auth';
import { googleSignInUrl } from 'wasp/client/auth';
import { signOut } from '../client/analytics/himetrica';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '../client/components/ui/button';
import { Input } from '../client/components/ui/input';
import { Label } from '../client/components/ui/label';
import { Checkbox } from '../client/components/ui/checkbox';
import { Cross, Loader2, Eye, EyeOff, ShieldCheck, ArrowLeft, ArrowRight } from 'lucide-react';
import { getTwoFactorStatus, verifyTwoFactorLogin, beginTwoFactorChallenge } from 'wasp/client/operations';
import { isFamilyPortalHost } from '../shared/portal';
import { rememberPendingInviteToken } from './inviteTokenStorage';
import { GoogleLogo } from '../client/icons/GoogleLogo';

type Step = 'login' | 'twofactor';

type CustomLoginFormProps = {
  inviteToken?: string | null;
};

function postLoginPath(inviteToken?: string | null): string {
  if (inviteToken) return `/convite/${encodeURIComponent(inviteToken)}`;
  return '/app';
}

export default function CustomLoginForm({ inviteToken }: CustomLoginFormProps = {}) {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [twoFactorToken, setTwoFactorToken] = useState('');

  useEffect(() => {
    if (inviteToken) {
      rememberPendingInviteToken(inviteToken);
    }
  }, [inviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t('login_error_fill_all'));
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await login({ email, password });
    } catch (err: any) {
      setError(err?.message || t('login_error_invalid'));
      setIsLoading(false);
      return;
    }

    try {
      const status = await getTwoFactorStatus();
      if (status.enabled) {
        await beginTwoFactorChallenge();
        setStep('twofactor');
      } else {
        navigate(postLoginPath(inviteToken));
      }
    } catch (err: any) {
      console.error('2FA status check failed after successful login:', err);
      setError(t('login_error_twofactor_check'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorToken.length !== 6) {
      setError(t('two_factor_error_required'));
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await verifyTwoFactorLogin({ token: twoFactorToken });
      navigate(postLoginPath(inviteToken));
    } catch (err: any) {
      setError(err?.message || t('two_factor_error_invalid'));
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
          <h1 className="text-2xl font-bold tracking-tight">{t('two_factor_title')}</h1>
          <p className="text-sm text-muted-foreground">{t('two_factor_instruction')}</p>
        </div>

        <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="totp">{t('two_factor_otp_label')}</Label>
            <Input variant="filled"
              id="totp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={twoFactorToken}
              onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder={t('two_factor_otp_placeholder')}
              maxLength={6}
              className="font-mono text-center text-2xl tracking-[0.5em]"
              disabled={isLoading}
              autoFocus
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || twoFactorToken.length !== 6}>
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('two_factor_verify_loading')}</>
            ) : (
              t('two_factor_verify_button')
            )}
          </Button>

          <button
            type="button"
            onClick={handleBackToLogin}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" /> {t('two_factor_back_button')}
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
        <h1 className="text-2xl font-bold tracking-tight">{t('login_title')}</h1>
        <p className="text-sm text-muted-foreground">{t('login_subtitle')}</p>
      </div>

      <a
        href={googleSignInUrl}
        onClick={() => inviteToken && rememberPendingInviteToken(inviteToken)}
        className="flex items-center justify-center gap-3 w-full rounded-lg border border-input bg-background h-11 px-4 py-2 text-sm font-medium text-center shadow-elevation-xs hover:bg-muted/30 hover:border-accent-foreground/20 transition-all"
      >
        <GoogleLogo className="h-5 w-5" />
        {t('login_google')}
      </a>

      <button
        type="button"
        onClick={() => setShowEmailForm(true)}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
      >
        {t('login_continue_with_email')} <ArrowRight className="h-3 w-3" />
      </button>

      {showEmailForm && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t('login_email_label')}</Label>
            <Input variant="filled"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login_email_placeholder')}
              autoComplete="email"
              disabled={isLoading}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t('login_password_label')}</Label>
              <a href="/request-password-reset" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {t('login_forgot_password')}
              </a>
            </div>
            <div className="relative">
              <Input variant="filled"
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login_password_placeholder')}
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
                aria-label={showPassword ? t('aria_hide_password') : t('aria_show_password')}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('login_loading')}</>
            ) : (
              t('login_button')
            )}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {t('login_no_account')}{' '}
        <a
          href={
            inviteToken
              ? `${isFamilyPortalHost() ? '/criar-conta' : '/signup'}?token=${encodeURIComponent(inviteToken)}`
              : isFamilyPortalHost() ? '/criar-conta' : '/signup'
          }
          className="font-medium text-primary hover:underline"
        >
          {t('login_create_account')}
        </a>
      </p>
    </div>
  );
}

