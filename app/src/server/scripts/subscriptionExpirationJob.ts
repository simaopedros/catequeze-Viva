/**
 * Subscription expiration job — NO-OP under Stripe.
 *
 * This job previously expired one-time PIX ("simples") subscriptions after 31
 * days, which was required by the Woovi integration. With Stripe as the active
 * payment processor, subscription lifecycle (renewals, cancellations, failed
 * payments) is driven entirely by Stripe webhooks
 * (`invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`),
 * so this scheduled job must not downgrade users on its own — otherwise it would
 * wrongly cancel active subscribers (e.g. annual plans whose `datePaid` is more
 * than 31 days old).
 *
 * It is kept as a no-op so the Wasp job declaration in `main.wasp` stays valid
 * and the previous behavior can be restored if a non-Stripe processor is used.
 */
export const expireSubscriptionsJob = async (
  _args: unknown,
  _context: {
    entities: {
      User: any;
      TenantBilling: any;
    };
  },
) => {
  console.log(
    "[subscriptionExpirationJob] Skipped — subscription expiration is handled by Stripe webhooks.",
  );
  return { expiredCount: 0 };
};
