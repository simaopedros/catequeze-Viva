import { Resend } from "resend";
import { logger } from "../../logger";
import { formatFrom } from "../config";
import type {
  EmailProvider,
  NormalizedWebhookEvent,
  ProviderBroadcastInput,
  ProviderContact,
  ProviderEvent,
  ProviderSendInput,
  ProviderSendResult,
} from "../port";

const BATCH_SIZE = 100;

function client(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function toHeaders(input: ProviderSendInput): Record<string, string> | undefined {
  const headers = { ...(input.headers || {}) };
  if (input.idempotencyKey && !headers["Idempotency-Key"]) {
    headers["Idempotency-Key"] = input.idempotencyKey;
  }
  return Object.keys(headers).length ? headers : undefined;
}

function toTags(tags?: Record<string, string>) {
  if (!tags) return undefined;
  return Object.entries(tags).map(([name, value]) => ({ name, value }));
}

async function sendOne(
  resend: Resend,
  input: ProviderSendInput,
): Promise<ProviderSendResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: formatFrom(input.from),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      headers: toHeaders(input),
      tags: toTags(input.tags),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, providerMessageId: data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

function mapWebhookType(type: string): NormalizedWebhookEvent["type"] {
  if (type === "email.sent" || type === "email.delivered") return type;
  if (type === "email.bounced" || type === "email.complained") return type;
  if (type === "email.opened" || type === "email.clicked") return type;
  return "unknown";
}

export const resendEmailAdapter: EmailProvider = {
  name: "resend",

  async send(input) {
    const resend = client();
    if (!resend) return { ok: false, error: "RESEND_API_KEY missing" };
    return sendOne(resend, input);
  },

  async sendBatch(inputs) {
    const resend = client();
    if (!resend) {
      return inputs.map(() => ({ ok: false, error: "RESEND_API_KEY missing" }));
    }
    const results: ProviderSendResult[] = [];
    for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
      const chunk = inputs.slice(i, i + BATCH_SIZE);
      try {
        const { data, error } = await resend.batch.send(
          chunk.map((item) => ({
            from: formatFrom(item.from),
            to: item.to,
            subject: item.subject,
            html: item.html,
            text: item.text,
            replyTo: item.replyTo,
            headers: toHeaders(item),
            tags: toTags(item.tags),
          })),
        );
        if (error) {
          for (const item of chunk) {
            results.push({ ok: false, error: error.message });
            void item;
          }
        } else {
          const accepted = data?.data ?? [];
          for (let j = 0; j < chunk.length; j++) {
            const id = accepted[j]?.id;
            results.push(id ? { ok: true, providerMessageId: id } : { ok: false, error: "batch item rejected" });
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        for (const _item of chunk) results.push({ ok: false, error: message });
      }
    }
    return results;
  },

  async upsertContact(contact) {
    const resend = client();
    if (!resend) return;
    try {
      await resend.contacts.create({
        email: contact.email,
        firstName: contact.firstName ?? undefined,
        lastName: contact.lastName ?? undefined,
        unsubscribed: contact.unsubscribed ?? false,
      });
    } catch (error) {
      logger.warn("[email] resend contact upsert failed", {
        email: contact.email,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  async emitEvent(event) {
    const resend = client();
    if (!resend) return;
    const anyClient = resend as unknown as {
      events?: { send?: (payload: unknown) => Promise<unknown> };
    };
    if (!anyClient.events?.send) return;
    try {
      await anyClient.events.send({
        event: event.name,
        email: event.email,
        data: {
          userId: event.userId,
          ...(event.properties || {}),
        },
      });
    } catch (error) {
      logger.warn("[email] resend event emit failed", {
        event: event.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  async verifyWebhook(payload, headers) {
    const resend = client();
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (resend && secret) {
      const anyClient = resend as unknown as {
        webhooks?: {
          verify?: (args: {
            payload: string;
            headers: Record<string, string>;
            webhookSecret: string;
          }) => unknown;
        };
      };
      if (anyClient.webhooks?.verify) {
        const normalized: Record<string, string> = {};
        for (const [key, value] of Object.entries(headers)) {
          normalized[key] = Array.isArray(value) ? value[0] ?? "" : value ?? "";
        }
        anyClient.webhooks.verify({
          payload,
          headers: normalized,
          webhookSecret: secret,
        });
      }
    }
    const parsed = JSON.parse(payload) as {
      type?: string;
      data?: { email_id?: string; to?: string[] | string };
    };
    const to = parsed.data?.to;
    const email = Array.isArray(to) ? to[0] : to;
    return [
      {
        type: mapWebhookType(parsed.type || ""),
        providerMessageId: parsed.data?.email_id,
        email,
        rawType: parsed.type || "unknown",
      },
    ];
  },

  async sendBroadcast(input: ProviderBroadcastInput) {
    const resend = client();
    if (!resend) return { ok: false, error: "RESEND_API_KEY missing" };
    const anyClient = resend as unknown as {
      broadcasts?: {
        create?: (payload: unknown) => Promise<{ data?: { id?: string }; error?: { message: string } }>;
        send?: (id: string) => Promise<{ error?: { message: string } }>;
      };
    };
    if (!anyClient.broadcasts?.create) {
      return { ok: false, error: "Resend Broadcasts API unavailable" };
    }
    try {
      const created = await anyClient.broadcasts.create({
        from: formatFrom(input.from),
        subject: input.subject,
        html: input.html,
        name: input.subject,
      });
      if (created.error || !created.data?.id) {
        return { ok: false, error: created.error?.message || "broadcast create failed" };
      }
      if (anyClient.broadcasts.send) {
        const sent = await anyClient.broadcasts.send(created.data.id);
        if (sent.error) return { ok: false, error: sent.error.message };
      }
      return { ok: true, providerMessageId: created.data.id };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
