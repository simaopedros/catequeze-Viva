import { useTranslation } from 'react-i18next';
import { useAuth } from 'wasp/client/auth';
import { Link as WaspRouterLink, routes } from 'wasp/client/router';
import type { User } from 'wasp/entities';
import { getCustomerPortalUrl, useQuery } from 'wasp/client/operations';
import { PageHeader } from '../client/components/PageHeader';
import { useUserContext } from '../client/hooks/useUserContext';
import { Button } from '../client/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../client/components/ui/card';
import { Separator } from '../client/components/ui/separator';
import { Church, User as UserIcon, CreditCard, Coins } from 'lucide-react';
import {
  PaymentPlanId,
  SubscriptionStatus,
  parsePaymentPlanId,
  prettyPaymentPlanName,
} from '../payment/plans';
import {
  isOnProductTrial,
  getProductTrialDaysLeft,
  getProductTrialEndsAt,
} from '../shared/pricing';

export default function AccountPage() {
  const { t } = useTranslation('account');
  const { data: user } = useAuth();
  const { parishName: ctxParishName } = useUserContext();

  if (!user) return null;

  return (
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader
          title={t('title')}
          subtitle={user.email || ''}
        />

        {/* Parish info */}
        {ctxParishName && (
          <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Church className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">{t('linked_parish')}</p>
              <p className="font-medium">{ctxParishName}</p>
            </div>
          </div>
        )}

        {/* Account info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              {t('account_info')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0">
              {user.email && (
                <div className="px-6 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 sm:gap-4">
                    <div className="text-muted-foreground text-sm font-medium">
                      {t('email')}
                    </div>
                    <div className="text-foreground mt-1 text-sm sm:col-span-2 sm:mt-0">
                      {user.email}
                    </div>
                  </div>
                </div>
              )}
              {user.username && (
                <>
                  <Separator />
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 sm:gap-4">
                      <div className="text-muted-foreground text-sm font-medium">
                        {t('username')}
                      </div>
                      <div className="text-foreground mt-1 text-sm sm:col-span-2 sm:mt-0">
                        {user.username}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {t('plan')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UserCurrentSubscriptionPlan
              subscriptionPlan={user.subscriptionPlan}
              subscriptionStatus={user.subscriptionStatus}
              datePaid={user.datePaid}
              createdAt={user.createdAt}
            />
          </CardContent>
        </Card>

        {/* Credits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Coins className="h-4 w-4" />
              {t('credits')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm">
                {t('credits_value', { count: user.credits })}
              </span>
              <BuyMoreButton subscriptionStatus={user.subscriptionStatus} />
            </div>
          </CardContent>
        </Card>
      </div>
  );
}

function UserCurrentSubscriptionPlan({
  subscriptionPlan,
  subscriptionStatus,
  datePaid,
  createdAt,
}: Pick<User, 'subscriptionPlan' | 'subscriptionStatus' | 'datePaid' | 'createdAt'>) {
  const { t, i18n } = useTranslation('account');
  const { t: tb } = useTranslation('billing');

  const trialUser = { subscriptionStatus, subscriptionPlan, createdAt };
  const onTrial = isOnProductTrial(trialUser);

  let message = t('free_plan');
  if (onTrial) {
    const ends = getProductTrialEndsAt(createdAt);
    const daysLeft = getProductTrialDaysLeft(trialUser) ?? 0;
    const endsLabel = ends
      ? ends.toLocaleDateString(i18n.language || 'pt-BR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '';
    message =
      daysLeft === 1
        ? t('plan_trial_one', { date: endsLabel })
        : t('plan_trial_other', { count: daysLeft, date: endsLabel });
  } else if (
    subscriptionPlan !== null &&
    subscriptionStatus !== null &&
    datePaid !== null
  ) {
    message = formatSubscriptionStatusMessage(
      t,
      parsePaymentPlanId(subscriptionPlan),
      datePaid,
      subscriptionStatus as SubscriptionStatus,
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{message}</span>
      {onTrial ? (
        <a href="/app/billing" className="text-sm font-medium text-primary hover:underline">
          {tb('trial_banner_cta')}
        </a>
      ) : (
        <CustomerPortalButton />
      )}
    </div>
  );
}

function formatSubscriptionStatusMessage(
  t: ReturnType<typeof useTranslation>['t'],
  subscriptionPlan: PaymentPlanId,
  datePaid: Date,
  subscriptionStatus: SubscriptionStatus,
): string {
  const planName = prettyPaymentPlanName(subscriptionPlan);
  const statusToMessage: Record<SubscriptionStatus, string> = {
    [SubscriptionStatus.Active]: planName,
    [SubscriptionStatus.PastDue]: t('plan_past_due', { plan: planName }),
    [SubscriptionStatus.CancelAtPeriodEnd]: t('plan_cancel_at_period_end', {
      plan: planName,
      date: prettyPrintEndOfBillingPeriod(datePaid),
    }),
    [SubscriptionStatus.Deleted]: t('plan_deleted'),
  };

  return statusToMessage[subscriptionStatus];
}

function prettyPrintEndOfBillingPeriod(date: Date) {
  const oneMonthFromNow = new Date(date);
  oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
  return oneMonthFromNow.toLocaleDateString('pt-BR');
}

function CustomerPortalButton() {
  const { t } = useTranslation('account');
  const { data: customerPortalUrl, isLoading: isCustomerPortalUrlLoading } =
    useQuery(getCustomerPortalUrl);

  if (!customerPortalUrl) {
    return null;
  }

  return (
    <a href={customerPortalUrl} target="_blank" rel="noopener noreferrer">
      <Button disabled={isCustomerPortalUrlLoading} variant="link">
        {t('manage_payment')}
      </Button>
    </a>
  );
}

function BuyMoreButton({
  subscriptionStatus,
}: Pick<User, 'subscriptionStatus'>) {
  const { t } = useTranslation('account');

  if (
    subscriptionStatus === SubscriptionStatus.Active ||
    subscriptionStatus === SubscriptionStatus.CancelAtPeriodEnd
  ) {
    return null;
  }

  return (
    <WaspRouterLink
      to={routes.PricingPageRoute.to}
      className="text-primary hover:text-primary/80 text-sm font-medium transition-colors duration-200"
    >
      <Button variant="link">{t('buy_credits')}</Button>
    </WaspRouterLink>
  );
}
