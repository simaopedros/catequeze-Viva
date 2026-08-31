import { Resend } from "resend";
import { logger } from "../logger";

export async function sendLifecycleEmail(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: "Catequese Viva <noreply@catechis.app>",
      to: args.to,
      subject: args.subject,
      html: args.html,
    });
    if (error) {
      logger.warn("[lifecycle] email send failed", {
        to: args.to,
        error: error.message,
      });
      return false;
    }
    return true;
  } catch (e: any) {
    logger.warn("[lifecycle] email send failed", {
      to: args.to,
      error: e?.message,
    });
    return false;
  }
}
