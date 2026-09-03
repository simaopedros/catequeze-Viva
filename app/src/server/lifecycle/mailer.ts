import { EMAIL_MESSAGE } from "../../shared/emailCatalog";
import { enqueueEmail } from "../email/service";

/** @deprecated Use enqueueEmail with a catalog messageId. Kept as a thin wrapper. */
export async function sendLifecycleEmail(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const result = await enqueueEmail({
    messageId: EMAIL_MESSAGE.LIFECYCLE_WELCOME,
    to: args.to,
    payload: {
      subject: args.subject,
      heading: args.subject,
      body: args.html,
      name: "",
      ctaUrl: "",
    },
    idempotencyKey: `legacy.lifecycle:${args.to}:${args.subject}:${Date.now()}`,
  });
  return !result.skipped;
}
