import type {
  EmailProvider,
  NormalizedWebhookEvent,
  ProviderBroadcastInput,
  ProviderContact,
  ProviderEvent,
  ProviderSendInput,
  ProviderSendResult,
} from "../port";

export type FakeSentEmail = ProviderSendInput & {
  id: string;
};

const sent: FakeSentEmail[] = [];
const contacts: ProviderContact[] = [];
const events: ProviderEvent[] = [];
const broadcasts: ProviderBroadcastInput[] = [];

let seq = 0;

export function resetFakeEmailAdapter(): void {
  sent.length = 0;
  contacts.length = 0;
  events.length = 0;
  broadcasts.length = 0;
  seq = 0;
}

export function getFakeSentEmails(): FakeSentEmail[] {
  return [...sent];
}

export function getFakeContacts(): ProviderContact[] {
  return [...contacts];
}

export function getFakeEvents(): ProviderEvent[] {
  return [...events];
}

export function getFakeBroadcasts(): ProviderBroadcastInput[] {
  return [...broadcasts];
}

export const fakeEmailAdapter: EmailProvider = {
  name: "fake",

  async send(input) {
    const id = `fake_${++seq}`;
    sent.push({ ...input, id });
    return { ok: true, providerMessageId: id };
  },

  async sendBatch(inputs) {
    const results: ProviderSendResult[] = [];
    for (const input of inputs) {
      results.push(await this.send(input));
    }
    return results;
  },

  async upsertContact(contact) {
    const index = contacts.findIndex(
      (item) => item.email.toLowerCase() === contact.email.toLowerCase(),
    );
    if (index >= 0) contacts[index] = { ...contacts[index], ...contact };
    else contacts.push(contact);
  },

  async emitEvent(event) {
    events.push(event);
  },

  async verifyWebhook(payload) {
    try {
      const parsed = JSON.parse(payload) as {
        type?: string;
        data?: { email_id?: string; to?: string[] };
      };
      const type = (parsed.type || "unknown") as NormalizedWebhookEvent["type"];
      return [
        {
          type: type.startsWith("email.") ? type : "unknown",
          providerMessageId: parsed.data?.email_id,
          email: parsed.data?.to?.[0],
          rawType: parsed.type || "unknown",
        },
      ];
    } catch {
      return [];
    }
  },

  async sendBroadcast(input) {
    broadcasts.push(input);
    return { ok: true, providerMessageId: `fake_broadcast_${++seq}` };
  },
};
