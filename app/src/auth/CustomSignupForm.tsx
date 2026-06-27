import { useEffect, useState } from 'react';
import { signup } from 'wasp/client/auth';
import { googleSignInUrl } from 'wasp/client/auth';
import { useTranslation } from 'react-i18next';
import { Button } from '../client/components/ui/button';
import { Input } from '../client/components/ui/input';
import { Label } from '../client/components/ui/label';
import { Checkbox } from '../client/components/ui/checkbox';
import { Cross, Loader2, Eye, EyeOff } from 'lucide-react';
import { isFamilyPortalHost } from '../shared/portal';
import { rememberPendingInviteToken } from './inviteTokenStorage';

type CustomSignupFormProps = {
  inviteToken?: string | null;
  defaultEmail?: string;
};

export default function CustomSignupForm({ inviteToken, defaultEmail }: CustomSignupFormProps = {}) {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState(defaultEmail || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (inviteToken) {
      rememberPendingInviteToken(inviteToken);
    }
  }, [inviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !confirmPassword) {
      setError(t('signup_error_fill_all'));
      return;
    }
    if (password.length < 8) {
      setError(t('signup_error_password_length'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('signup_error_password_mismatch'));
      return;
    }
    if (!acceptTerms) {
      setError(t('signup_error_terms'));
      return;
    }

    setIsLoading(true);
    try {
      await signup({ email, password, username: email, isAdmin: false });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || t('signup_error_create'));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    const loginHref = inviteToken
      ? `${isFamilyPortalHost() ? '/entrar' : '/login'}?token=${encodeURIComponent(inviteToken)}`
      : isFamilyPortalHost() ? '/entrar' : '/login';

    return (
      <div className="space-y-6 text-center">
        <div className="inline-flex rounded-xl bg-green-100 p-3">
          <Cross className="h-6 w-6 text-green-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{t('signup_success_title')}</h1>
          <p className="text-sm text-muted-foreground">
            <span>{t('signup_success_sent_to', { email })}</span>
            {' '}{t('signup_success_check_email')}
          </p>
          {inviteToken && (
            <p className="text-sm text-muted-foreground">
              {t('signup_success_invite_hint')}{' '}
              <a href={loginHref} className="text-primary underline underline-offset-2 font-medium">
                {t('signup_success_invite_link')}
              </a>.
            </p>
          )}
        </div>
        <Button variant="outline" onClick={() => setSuccess(false)} className="w-full">
          {t('signup_back_button')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex rounded-xl bg-primary/10 p-3">
          <Cross className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{t('signup_title')}</h1>
          <p className="text-body-sm text-text-secondary">{t('signup_subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-body-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">{t('signup_email_label')}</Label>
          <Input
            id="email"
            variant="filled"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('signup_email_placeholder')}
            autoComplete="email"
            readOnly={!!defaultEmail}
            disabled={isLoading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t('signup_password_label')}</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('signup_password_placeholder')}
              autoComplete="new-password"
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
          <p className="text-caption text-muted-foreground">
            {t('signup_password_help')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t('signup_confirm_label')}</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t('signup_confirm_placeholder')}
            autoComplete="new-password"
            disabled={isLoading}
            required
          />
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="acceptTerms"
            checked={acceptTerms}
            onCheckedChange={(v) => setAcceptTerms(!!v)}
            disabled={isLoading}
            className="mt-1"
          />
          <Label htmlFor="acceptTerms" className="text-xs cursor-pointer leading-relaxed">
            {t('signup_terms_prefix')}{' '}
            <a href="/terms" target="_blank" className="text-primary hover:underline" rel="noreferrer">{t('terms_of_use')}</a>
            {' '}{t('signup_terms_and')}{' '}
            <a href="/privacy" target="_blank" className="text-primary hover:underline" rel="noreferrer">{t('privacy_policy')}</a>
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('signup_loading')}</>
          ) : (
            t('signup_button')
          )}
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">{t('signup_divider')}</span></div>
        </div>

        <a href={googleSignInUrl} onClick={() => inviteToken && rememberPendingInviteToken(inviteToken)} className="block w-full rounded-lg border border-input bg-background h-10 px-4 py-2 text-sm font-medium text-center hover:bg-muted/30 transition-colors">
          {t('signup_google')}
        </a>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t('signup_has_account')}{' '}
        <a
          href={
            inviteToken
              ? `${isFamilyPortalHost() ? '/entrar' : '/login'}?token=${encodeURIComponent(inviteToken)}`
              : isFamilyPortalHost() ? '/entrar' : '/login'
          }
          className="font-medium text-primary hover:underline"
        >
          {t('signup_login_link')}
        </a>
      </p>
    </div>
  );
}


