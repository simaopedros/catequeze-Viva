import type { EmailFrom } from "./config";

export type ProviderSendInput = {
  to: string;
  from: EmailFrom;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: Record<string, string>;
  headers?: Record<string, string>;
  idempotencyKey?: string;
};

export type ProviderSendResult = {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
};

export type ProviderContact = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  locale?: string | null;
  properties?: Record<string, string | number | boolean | null>;
  unsubscribed?: boolean;
};

export type ProviderEvent = {
  name: string;
  email: string;
  userId?: string;
  properties?: Record<string, unknown>;
};

export type ProviderBroadcastInput = {
  subject: string;
  html: string;
  from: EmailFrom;
  topic?: string;
  segment?: string;
};

export type NormalizedWebhookEvent = {
  type:
    | "email.sent"
    | "email.delivered"
    | "email.bounced"
    | "email.complained"
    | "email.opened"
    | "email.clicked"
    | "unknown";
  providerMessageId?: string;
  email?: string;
  rawType: string;
};

export interface EmailProvider {
  name: string;
  send(input: ProviderSendInput): Promise<ProviderSendResult>;
  sendBatch(inputs: ProviderSendInput[]): Promise<ProviderSendResult[]>;
  upsertContact(contact: ProviderContact): Promise<void>;
  emitEvent(event: ProviderEvent): Promise<void>;
  verifyWebhook(
    payload: string,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<NormalizedWebhookEvent[]>;
  sendBroadcast?(input: ProviderBroadcastInput): Promise<ProviderSendResult>;
}
