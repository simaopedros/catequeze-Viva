import { HttpError } from "wasp/server";
import {
  EMAIL_TOPIC,
  OPT_OUT_TOPICS,
  type EmailTopicId,
} from "../../shared/emailCatalog";
import { requireAuth } from "../auth/helpers";
import {
  getEmailPreferences,
  setEmailPreference,
} from "../email/preferences";

function isTopic(value: string): value is EmailTopicId {
  return (OPT_OUT_TOPICS as string[]).includes(value);
}

export const getMyEmailPreferences = async (_args: void, context: any) => {
  requireAuth(context.user);
  if (!context.user.email) {
    return {
      [EMAIL_TOPIC.LIFECYCLE]: true,
      [EMAIL_TOPIC.PRODUCT_UPDATES]: true,
      [EMAIL_TOPIC.PASTORAL_ANNOUNCEMENTS]: true,
    };
  }
  return getEmailPreferences({
    email: context.user.email,
    userId: context.user.id,
    context,
  });
};

export const updateMyEmailPreferences = async (
  args: { topic: string; optedIn: boolean },
  context: any,
) => {
  requireAuth(context.user);
  if (!context.user.email) throw new HttpError(400, "Email da conta não encontrado.");
  if (!isTopic(args.topic)) throw new HttpError(400, "Tópico de email inválido.");
  await setEmailPreference({
    email: context.user.email,
    userId: context.user.id,
    topic: args.topic,
    optedIn: Boolean(args.optedIn),
    context,
  });
  return getEmailPreferences({
    email: context.user.email,
    userId: context.user.id,
    context,
  });
};
