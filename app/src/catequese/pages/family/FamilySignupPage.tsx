import { useTranslation } from 'react-i18next';
import { Link, useSearchParams, useNavigate } from 'react-router';
import { useQuery } from 'wasp/client/operations';
import * as ops from 'wasp/client/operations';
import CustomSignupForm from '../../../auth/CustomSignupForm';
import { useRedirectIfLoggedIn } from '../../../auth/hooks/useRedirectIfLoggedIn';
import { Church, AlertTriangle, Clock, Loader2 } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-[#F7F4EE] p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('portal_badge')}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#071A2D]" style={{ fontFamily: 'var(--font-brand-display)' }}>{t('signup.title')}</h1>
          <div className="mx-auto h-px w-10 bg-[#D39A2B]" aria-hidden />
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
      <div className="min-h-screen flex items-center justify-center bg-[#F7F4EE] p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-sm border border-destructive/20 bg-destructive/10">
            {isExpired ? <Clock className="h-8 w-8 text-destructive" /> : <AlertTriangle className="h-8 w-8 text-destructive" />}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#071A2D]">{isExpired ? t('signup.expired_title') : t('signup.invalid_title')}</h1>
          <p className="text-sm text-muted-foreground">
            {isExpired ? t('signup.expired_desc') : t('signup.invalid_desc')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F4EE] p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('portal_badge')}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#071A2D]" style={{ fontFamily: 'var(--font-brand-display)' }}>{t('signup.title')}</h1>
          <div className="mx-auto h-px w-10 bg-[#D39A2B]" aria-hidden />
          <p className="text-sm text-muted-foreground">
            {t('signup.invited_to', { parish: (invitation as any).parishName, role: (invitation as any).roleLabel })}
          </p>
        </div>

        <div className="rounded-sm border border-border/70 bg-white p-6 ">
          <CustomSignupForm inviteToken={token} defaultEmail={(invitation as any).inviteEmail} />
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
