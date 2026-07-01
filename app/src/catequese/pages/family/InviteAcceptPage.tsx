import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router';
import { useQuery, useAction } from 'wasp/client/operations';
import * as ops from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { Button } from '../../../client/components/ui/button';
import { clearPendingInviteToken } from '../../../auth/inviteTokenStorage';
import { trackMarketingEvent } from '../../../client/analytics/marketingAnalytics';
import { Church, Mail, Clock, AlertTriangle, Check, ArrowRight, Loader2 } from 'lucide-react';

const getInvitationByToken = (ops as any).getInvitationByToken;
const acceptInvitationByTokenAction = (ops as any).acceptInvitationByToken;

interface InvitationData {
  token: string;
  role: string;
  roleLabel: string;
  parishName: string;
  parishId: string;
  parishType: string;
  emailMasked: string;
  expiresAt: string | null;
  hasAccount: boolean;
}

export default function InviteAcceptPage() {
  const { t, i18n } = useTranslation('family');
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { data: authUser } = useAuth();
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');

  const { data: rawInvitation, isLoading, error: queryError } = useQuery(
    getInvitationByToken,
    { token: token || '' },
    { enabled: !!token }
  );
  const invitation = rawInvitation as InvitationData | null | undefined;

  const acceptAction = useAction(acceptInvitationByTokenAction);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setError('');
    try {
      await acceptAction({ token });
      clearPendingInviteToken();
      trackMarketingEvent('invite_accepted', {
        role: invitation?.role,
        parish_type: invitation?.parishType,
        has_account: Boolean(authUser),
      });
      setAccepted(true);
      setTimeout(() => navigate('/app'), 1500);
    } catch (e: any) {
      setError(e.message || t('invite.accept_error'));
    } finally {
      setAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (queryError || !invitation) {
    const isExpired = (queryError as any)?.statusCode === 410;
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
            {isExpired ? <Clock className="h-8 w-8 text-destructive" /> : <AlertTriangle className="h-8 w-8 text-destructive" />}
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">
              {isExpired ? t('invite.expired_title') : t('invite.not_found_title')}
            </h1>
            <p className="text-muted-foreground">
              {isExpired ? t('invite.expired_desc_accept') : t('invite.not_found_desc')}
            </p>
          </div>
          <Link to="/" className="text-primary underline underline-offset-2 text-sm">
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10">
            <Check className="h-8 w-8 text-success" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{t('invite.accepted_title')}</h1>
            <p className="text-muted-foreground">
              {t('invite.accepted_desc', { parish: invitation.parishName, role: invitation.roleLabel })}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{t('invite.redirecting')}</p>
        </div>
      </div>
    );
  }

  const locale = i18n.language.startsWith('en') ? 'en-US' : i18n.language.startsWith('es') ? 'es-ES' : 'pt-BR';

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-primary text-sm font-medium">
            <Mail className="h-4 w-4" />
            {t('invite.badge')}
          </div>
          <h1 className="text-2xl font-bold">{t('invite.title')}</h1>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-elevation-xs space-y-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-primary/10 p-3">
              <Church className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">{invitation.parishName}</h2>
              <p className="text-sm text-muted-foreground">{t('invite.as_role', { role: invitation.roleLabel })}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {t('invite.sent_to', { email: invitation.emailMasked })}
              {invitation.expiresAt && <> {t('invite.expires', { date: new Date(invitation.expiresAt).toLocaleDateString(locale) })}</>}
            </span>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
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
              to={`/entrar?token=${token}`}
              className="block w-full rounded-lg bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium text-center hover:bg-primary/90 transition-colors"
            >
              {t('invite.login')}
            </Link>
            <Link
              to={`/criar-conta?token=${token}`}
              className="block w-full rounded-lg border border-input bg-background h-10 px-4 py-2 text-sm font-medium text-center hover:bg-muted/30 transition-colors"
            >
              {t('invite.signup')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}


