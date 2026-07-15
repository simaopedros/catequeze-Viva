/**
 * /convite/continuar?cid=&sig=&exp=
 * Rehydrates portal invite accept UI from AuthContinuation — never auto-accepts.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { useQuery, useAction } from 'wasp/client/operations';
import * as ops from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { Button } from '../../../client/components/ui/button';
import {
  clearStoredContinuation,
  rememberContinuation,
} from '../../../auth/portalContinuation';
import { clearPendingInviteToken } from '../../../auth/inviteTokenStorage';
import { trackMarketingEvent } from '../../../client/analytics/marketingAnalytics';
import {
  Church,
  Clock,
  AlertTriangle,
  Check,
  ArrowRight,
  Loader2,
  Mail,
} from 'lucide-react';
import {
  AppDisplayTitle,
  AppGoldRule,
  AppEyebrow,
} from '../../../client/components/brand/AppChrome';

const getAuthContinuation = (ops as any).getAuthContinuation;
const acceptPortalInvitationAction = (ops as any).acceptPortalInvitation;

export default function InviteContinuePage() {
  const { t, i18n } = useTranslation('family');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: authUser } = useAuth();
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');

  const cid = searchParams.get('cid') || '';
  const sig = searchParams.get('sig') || '';
  const exp = searchParams.get('exp') || '';

  const enabled = Boolean(cid && sig && exp && getAuthContinuation);

  const {
    data: cont,
    isLoading,
    error: queryError,
  } = useQuery(
    getAuthContinuation,
    { cid, sig, exp },
    { enabled },
  );

  useEffect(() => {
    if (cont?.continuationId && cont.sig && cont.exp) {
      rememberContinuation({
        continuationId: cont.continuationId,
        sig: cont.sig,
        exp: cont.exp,
        signedUrl: cont.signedUrl,
        path: cont.path,
        invitationId: cont.invitation?.invitationId,
      });
    }
  }, [cont]);

  const acceptAction = useAction(acceptPortalInvitationAction);
  const invitation = cont?.invitation;

  const handleAccept = async () => {
    if (!invitation?.invitationId) return;
    setAccepting(true);
    setError('');
    try {
      await acceptAction({ invitationId: invitation.invitationId });
      clearPendingInviteToken();
      clearStoredContinuation();
      trackMarketingEvent('invite_accepted', {
        role: invitation.role,
        parish_type: invitation.parishType,
        has_account: Boolean(authUser),
        source: 'auth_continuation',
      });
      setAccepted(true);
      setTimeout(() => navigate('/app'), 1500);
    } catch (e: any) {
      const msg = e?.message || t('invite.accept_error');
      setError(msg);
    } finally {
      setAccepting(false);
    }
  };

  if (!enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
          <AppDisplayTitle className="text-center">{t('invite.not_found_title')}</AppDisplayTitle>
          <Link to="/convite" className="text-sm text-[#071A2D] underline">
            {t('invite.back_portal')}
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#071A2D]" />
      </div>
    );
  }

  if (queryError || !invitation) {
    const code = (queryError as any)?.message || '';
    const isExpired =
      (queryError as any)?.statusCode === 410 ||
      /EXPIRED|CONSUMED/i.test(code);
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-sm border border-destructive/20 bg-destructive/10">
            {isExpired ? (
              <Clock className="h-8 w-8 text-destructive" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-destructive" />
            )}
          </div>
          <div className="space-y-2.5">
            <AppDisplayTitle className="text-center">
              {isExpired ? t('invite.expired_title') : t('invite.not_found_title')}
            </AppDisplayTitle>
            <AppGoldRule className="mx-auto" />
            <p className="text-muted-foreground">
              {isExpired ? t('invite.expired_desc_accept') : t('invite.not_found_desc')}
            </p>
          </div>
          <Link to="/convite" className="text-[#071A2D] underline text-sm">
            {t('invite.back_portal')}
          </Link>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-sm border border-border/70 bg-muted/30">
            <Check className="h-8 w-8 text-success" />
          </div>
          <div className="space-y-2.5">
            <AppDisplayTitle className="text-center">{t('invite.accepted_title')}</AppDisplayTitle>
            <AppGoldRule className="mx-auto" />
            <p className="text-muted-foreground">
              {t('invite.accepted_desc', {
                parish: invitation.parishName,
                role: invitation.roleLabel,
              })}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{t('invite.redirecting')}</p>
        </div>
      </div>
    );
  }

  const locale = i18n.language.startsWith('en')
    ? 'en-US'
    : i18n.language.startsWith('es')
      ? 'es-ES'
      : 'pt-BR';

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center justify-center gap-1">
            <Mail className="h-4 w-4" />
            {t('invite.badge')}
          </div>
          <AppEyebrow className="text-center">{t('portal_badge')}</AppEyebrow>
          <AppDisplayTitle className="text-center">{t('invite.title')}</AppDisplayTitle>
          <AppGoldRule className="mx-auto" />
        </div>

        <div className="space-y-4 rounded-sm border border-border/70 bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-sm border border-border/70 bg-muted/30 p-3">
              <Church className="h-6 w-6 text-[#071A2D]" />
            </div>
            <div>
              <AppDisplayTitle as="h2" className="text-lg sm:text-lg">
                {invitation.parishName}
              </AppDisplayTitle>
              <p className="text-sm text-muted-foreground">
                {t('invite.as_role', { role: invitation.roleLabel })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {t('invite.sent_to', { email: invitation.emailMasked })}
              {invitation.expiresAt && (
                <>
                  {' '}
                  {t('invite.expires', {
                    date: new Date(invitation.expiresAt).toLocaleDateString(locale),
                  })}
                </>
              )}
            </span>
          </div>

          {error && (
            <div className="rounded-sm border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {authUser ? (
            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full gap-2"
              size="lg"
            >
              {accepting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('invite.accepting')}
                </>
              ) : (
                <>
                  {t('invite.accept')}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                {t('invite.login_to_accept')}
              </p>
              <Link
                to={`/entrar?cid=${encodeURIComponent(cid)}`}
                className="block h-10 w-full rounded-sm bg-[#071A2D] px-4 py-2 text-center text-sm font-medium text-white"
              >
                {t('invite.login')}
              </Link>
              <Link
                to={`/criar-conta?cid=${encodeURIComponent(cid)}`}
                className="block h-10 w-full rounded-sm border border-input bg-background px-4 py-2 text-center text-sm font-medium text-[#071A2D]"
              >
                {t('invite.signup')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
