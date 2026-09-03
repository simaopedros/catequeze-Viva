import {
  EMAIL_TOPIC,
  OPT_OUT_TOPICS,
  type EmailTopicId,
} from "../../shared/emailCatalog";
import { resolveEmailDb } from "./db";
import { normalizeEmail } from "./hash";
import { getEmailProvider } from "./factory";

export type PreferenceMap = Record<EmailTopicId, boolean>;

export async function getEmailPreferences(args: {
  email: string;
  userId?: string;
  context?: { entities?: any };
}): Promise<PreferenceMap> {
  const db = resolveEmailDb(args.context);
  const email = normalizeEmail(args.email);
  const rows = db.emailPreference
    ? await db.emailPreference.findMany({
        where: { email },
      })
    : [];
  const result = {} as PreferenceMap;
  for (const topic of OPT_OUT_TOPICS) {
    const row = rows.find((item: { topic: string }) => item.topic === topic);
    result[topic] = !row?.optedOutAt;
  }
  return result;
}

export async function setEmailPreference(args: {
  email: string;
  userId?: string;
  topic: EmailTopicId;
  optedIn: boolean;
  context?: { entities?: any };
}): Promise<void> {
  const db = resolveEmailDb(args.context);
  const email = normalizeEmail(args.email);
  const existing = await db.emailPreference.findFirst({
    where: { email, topic: args.topic },
  });
  const optedOutAt = args.optedIn ? null : new Date();
  if (existing) {
    await db.emailPreference.update({
      where: { id: existing.id },
      data: { optedOutAt, userId: args.userId ?? existing.userId },
    });
  } else {
    await db.emailPreference.create({
      data: {
        email,
        topic: args.topic,
        userId: args.userId ?? null,
        optedOutAt,
      },
    });
  }

  if (args.userId && args.context?.entities?.User && args.topic === EMAIL_TOPIC.LIFECYCLE) {
    await args.context.entities.User.update({
      where: { id: args.userId },
      data: { lifecycleEmailsOptOutAt: optedOutAt },
    });
  }

  await getEmailProvider().upsertContact({
    email,
    unsubscribed: !args.optedIn && args.topic === EMAIL_TOPIC.PRODUCT_UPDATES,
    properties: { [args.topic]: args.optedIn },
  });
}

export async function setAllMarketingOptOut(args: {
  email: string;
  userId?: string;
  context?: { entities?: any };
}): Promise<void> {
  for (const topic of OPT_OUT_TOPICS) {
    await setEmailPreference({
      ...args,
      topic,
      optedIn: false,
    });
  }
}
