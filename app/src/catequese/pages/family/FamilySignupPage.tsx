import { useTranslation } from 'react-i18next';
import { Link, useSearchParams, useNavigate } from 'react-router';
import { useQuery } from 'wasp/client/operations';
import * as ops from 'wasp/client/operations';
import CustomSignupForm from '../../../auth/CustomSignupForm';
import { useRedirectIfLoggedIn } from '../../../auth/hooks/useRedirectIfLoggedIn';
import { Church, Sparkles, AlertTriangle, Clock, Loader2 } from 'lucide-react';

const getInvitationByToken = (ops as any).getInvitationByToken;

/**
 * Signup page for the family portal.
 * Requires a valid invitation token — no open self-registration.
 */
export default function FamilySignupPage() {
  const { t } = useTranslation('family');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  useRedirectIfLoggedIn();

  const { data: invitation, isLoading, error } = useQuery(
    getInvitationByToken,
    { token: token || '' },
    { enabled: !!token }
  );

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-primary text-sm font-medium">
            <Sparkles className="h-4 w-4" /> {t('portal_badge')}
          </div>
          <h1 className="text-2xl font-bold">{t('signup.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('signup.requires_invite')}</p>
          <Link to="/convite" className="inline-block text-primary underline underline-offset-2 text-sm font-medium">
            {t('signup.have_code')}
          </Link>
          <p className="text-sm text-muted-foreground pt-4">
            {t('signup.already_have')}{' '}
            <Link to="/entrar" className="text-primary underline underline-offset-2 font-medium">{t('signup.login')}</Link>
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !invitation) {
    const isExpired = (error as any)?.statusCode === 410;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
            {isExpired ? <Clock className="h-8 w-8 text-destructive" /> : <AlertTriangle className="h-8 w-8 text-destructive" />}
          </div>
          <h1 className="text-2xl font-bold">{isExpired ? t('signup.expired_title') : t('signup.invalid_title')}</h1>
          <p className="text-sm text-muted-foreground">
            {isExpired ? t('signup.expired_desc') : t('signup.invalid_desc')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-primary text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            {t('portal_badge')}
          </div>
          <h1 className="text-2xl font-bold">{t('signup.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('signup.invited_to', { parish: (invitation as any).parishName, role: (invitation as any).roleLabel })}
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <CustomSignupForm />
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {t('signup.already_have')}{' '}
            <Link to={`/entrar?token=${token}`} className="text-primary underline underline-offset-2 font-medium">{t('signup.login')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
