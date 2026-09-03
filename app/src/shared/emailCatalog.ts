/** Stable email catalog — product contract, not provider IDs. */

export const EMAIL_MESSAGE = {
  AUTH_VERIFY: "auth.verify",
  AUTH_PASSWORD_RESET: "auth.password_reset",
  INVITE_STAFF: "invite.staff",
  INVITE_FAMILY: "invite.family",
  SUPPORT_REPLY: "support.reply",
  BILLING_CANCELED: "billing.canceled",
  BILLING_PAYMENT_FAILED: "billing.payment_failed",
  BILLING_INSTITUTIONAL_TRIAL_D3: "billing.institutional_trial_d3",
  BILLING_INSTITUTIONAL_TRIAL_D1: "billing.institutional_trial_d1",
  LIFECYCLE_WELCOME: "lifecycle.welcome",
  LIFECYCLE_ACTIVATE_CREATE_CLASS: "lifecycle.activate_create_class",
  LIFECYCLE_ACTIVATE_ADD_PEOPLE: "lifecycle.activate_add_people",
  LIFECYCLE_ACTIVATE_FIRST_ACTION: "lifecycle.activate_first_action",
  LIFECYCLE_CONVERT_AFTER_VALUE: "lifecycle.convert_after_value",
  LIFECYCLE_TRIAL_D3: "lifecycle.trial_d3",
  LIFECYCLE_TRIAL_D1: "lifecycle.trial_d1",
  LIFECYCLE_WINBACK_D1: "lifecycle.winback_d1",
  LIFECYCLE_WINBACK_D3: "lifecycle.winback_d3",
  LIFECYCLE_WINBACK_D7: "lifecycle.winback_d7",
  PASTORAL_ANNOUNCEMENT: "pastoral.announcement",
  PASTORAL_MESSAGE: "pastoral.message",
  PRODUCT_BROADCAST: "product.broadcast",
} as const;

export type EmailMessageId = (typeof EMAIL_MESSAGE)[keyof typeof EMAIL_MESSAGE];

export const EMAIL_TOPIC = {
  LIFECYCLE: "LIFECYCLE",
  PRODUCT_UPDATES: "PRODUCT_UPDATES",
  PASTORAL_ANNOUNCEMENTS: "PASTORAL_ANNOUNCEMENTS",
} as const;

export type EmailTopicId = (typeof EMAIL_TOPIC)[keyof typeof EMAIL_TOPIC];

export const EMAIL_STREAM = {
  TRANSACTIONAL: "transactional",
  LIFECYCLE: "lifecycle",
  PASTORAL: "pastoral",
  MARKETING: "marketing",
} as const;

export type EmailStream = (typeof EMAIL_STREAM)[keyof typeof EMAIL_STREAM];

export const PRODUCT_EVENT = {
  USER_SIGNED_UP: "user.signed_up",
  USER_EMAIL_VERIFIED: "user.email_verified",
  CLASS_CREATED: "class.created",
  PEOPLE_ADDED: "people.added",
  FIRST_VALUE_REACHED: "first_value.reached",
  TRIAL_STARTED: "trial.started",
  TRIAL_EXPIRED: "trial.expired",
  SUBSCRIPTION_STARTED: "subscription.started",
  SUBSCRIPTION_CANCELED: "subscription.canceled",
  PAYMENT_FAILED: "payment.failed",
} as const;

export type ProductEventName =
  (typeof PRODUCT_EVENT)[keyof typeof PRODUCT_EVENT];

export const LIFECYCLE_CAMPAIGN_TO_MESSAGE = {
  activate_create_class: EMAIL_MESSAGE.LIFECYCLE_ACTIVATE_CREATE_CLASS,
  activate_add_people: EMAIL_MESSAGE.LIFECYCLE_ACTIVATE_ADD_PEOPLE,
  activate_first_action: EMAIL_MESSAGE.LIFECYCLE_ACTIVATE_FIRST_ACTION,
  convert_after_value: EMAIL_MESSAGE.LIFECYCLE_CONVERT_AFTER_VALUE,
  trial_d3: EMAIL_MESSAGE.LIFECYCLE_TRIAL_D3,
  trial_d1: EMAIL_MESSAGE.LIFECYCLE_TRIAL_D1,
  winback_d1: EMAIL_MESSAGE.LIFECYCLE_WINBACK_D1,
  winback_d3: EMAIL_MESSAGE.LIFECYCLE_WINBACK_D3,
  winback_d7: EMAIL_MESSAGE.LIFECYCLE_WINBACK_D7,
} as const;

export function streamForMessage(messageId: EmailMessageId): EmailStream {
  if (messageId.startsWith("lifecycle.")) return EMAIL_STREAM.LIFECYCLE;
  if (messageId.startsWith("pastoral.")) return EMAIL_STREAM.PASTORAL;
  if (messageId.startsWith("product.")) return EMAIL_STREAM.MARKETING;
  return EMAIL_STREAM.TRANSACTIONAL;
}

export function topicForMessage(messageId: EmailMessageId): EmailTopicId | null {
  const stream = streamForMessage(messageId);
  if (stream === EMAIL_STREAM.LIFECYCLE) return EMAIL_TOPIC.LIFECYCLE;
  if (stream === EMAIL_STREAM.PASTORAL) return EMAIL_TOPIC.PASTORAL_ANNOUNCEMENTS;
  if (stream === EMAIL_STREAM.MARKETING) return EMAIL_TOPIC.PRODUCT_UPDATES;
  return null;
}

export function isTransactionalMessage(messageId: EmailMessageId): boolean {
  return streamForMessage(messageId) === EMAIL_STREAM.TRANSACTIONAL;
}

export const OPT_OUT_TOPICS: EmailTopicId[] = [
  EMAIL_TOPIC.LIFECYCLE,
  EMAIL_TOPIC.PRODUCT_UPDATES,
  EMAIL_TOPIC.PASTORAL_ANNOUNCEMENTS,
];
