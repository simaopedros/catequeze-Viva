import type { Request, Response } from "express";
import { resolveUserLocale } from "../i18n/serverLocale";
import { getEmailsCopy } from "../lifecycle/copy";
import { renderUnsubscribePageHtml } from "../lifecycle/templates";
import {
  getLifecycleEmailSecret,
  verifyUnsubscribeToken,
} from "../lifecycle/unsubscribeToken";
import { setEmailPreference } from "../email/preferences";
import { EMAIL_TOPIC } from "../../shared/emailCatalog";

function queryToken(req: Request): string {
  const raw = req.query.token;
  return Array.isArray(raw) ? String(raw[0] ?? "") : String(raw ?? "");
}

export async function lifecycleUnsubscribeHandler(
  req: Request,
  res: Response,
  context: { entities: { User: any } },
) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  const secret = getLifecycleEmailSecret();
  const userId = verifyUnsubscribeToken(queryToken(req), secret);
  const fallback = getEmailsCopy("pt-BR");

  if (!userId) {
    res.status(400).send(
      renderUnsubscribePageHtml({
        title: fallback.unsubscribe_invalid_title,
        body: fallback.unsubscribe_invalid_body,
      }),
    );
    return;
  }

  const user = await context.entities.User.findUnique({
    where: { id: userId },
    select: { id: true, locale: true, lifecycleEmailsOptOutAt: true },
  });

  if (!user) {
    res.status(400).send(
      renderUnsubscribePageHtml({
        title: fallback.unsubscribe_invalid_title,
        body: fallback.unsubscribe_invalid_body,
      }),
    );
    return;
  }

  if (!user.lifecycleEmailsOptOutAt) {
    await context.entities.User.update({
      where: { id: user.id },
      data: { lifecycleEmailsOptOutAt: new Date() },
    });
  }

  const userWithEmail = await context.entities.User.findUnique({
    where: { id: user.id },
    select: { email: true },
  });
  if (userWithEmail?.email) {
    await setEmailPreference({
      email: userWithEmail.email,
      userId: user.id,
      topic: EMAIL_TOPIC.LIFECYCLE,
      optedIn: false,
      context,
    });
  }

  const copy = getEmailsCopy(resolveUserLocale(user));
  res.status(200).send(
    renderUnsubscribePageHtml({
      title: copy.unsubscribed_title,
      body: copy.unsubscribed_body,
    }),
  );
}
