import type { Request, Response } from "express";
import { EMAIL_TOPIC, type EmailTopicId } from "../../shared/emailCatalog";
import { getEmailsCopy } from "../lifecycle/copy";
import { renderUnsubscribePageHtml } from "../lifecycle/templates";
import {
  getLifecycleEmailSecret,
  verifyUnsubscribeToken,
} from "../lifecycle/unsubscribeToken";
import { resolveUserLocale } from "../i18n/serverLocale";
import { setAllMarketingOptOut, setEmailPreference } from "../email/preferences";

function queryToken(req: Request): string {
  const raw = req.query.token;
  return Array.isArray(raw) ? String(raw[0] ?? "") : String(raw ?? "");
}

function queryTopic(req: Request): EmailTopicId | "all" {
  const raw = req.query.topic;
  const value = Array.isArray(raw) ? String(raw[0] ?? "") : String(raw ?? "");
  if (value === EMAIL_TOPIC.LIFECYCLE) return EMAIL_TOPIC.LIFECYCLE;
  if (value === EMAIL_TOPIC.PRODUCT_UPDATES) return EMAIL_TOPIC.PRODUCT_UPDATES;
  if (value === EMAIL_TOPIC.PASTORAL_ANNOUNCEMENTS) {
    return EMAIL_TOPIC.PASTORAL_ANNOUNCEMENTS;
  }
  return "all";
}

export async function emailUnsubscribeHandler(
  req: Request,
  res: Response,
  context: { entities: { User: any; EmailPreference?: any } },
) {
  res.setHeader("Cache-Control", "no-store");
  const secret = getLifecycleEmailSecret();
  const userId = verifyUnsubscribeToken(queryToken(req), secret);
  const fallback = getEmailsCopy("pt-BR");

  const invalid = () => {
    const html = renderUnsubscribePageHtml({
      title: fallback.unsubscribe_invalid_title,
      body: fallback.unsubscribe_invalid_body,
    });
    if (req.method === "POST") {
      res.status(400).json({ ok: false });
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(400).send(html);
  };

  if (!userId) {
    invalid();
    return;
  }

  const user = await context.entities.User.findUnique({
    where: { id: userId },
    select: { id: true, email: true, locale: true, lifecycleEmailsOptOutAt: true },
  });
  if (!user?.email) {
    invalid();
    return;
  }

  const topic = queryTopic(req);
  if (topic === "all") {
    await setAllMarketingOptOut({
      email: user.email,
      userId: user.id,
      context,
    });
  } else {
    await setEmailPreference({
      email: user.email,
      userId: user.id,
      topic,
      optedIn: false,
      context,
    });
  }

  const copy = getEmailsCopy(resolveUserLocale(user));
  if (req.method === "POST") {
    res.status(200).json({ ok: true });
    return;
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(
    renderUnsubscribePageHtml({
      title: copy.unsubscribed_title,
      body: copy.unsubscribed_body,
    }),
  );
}
