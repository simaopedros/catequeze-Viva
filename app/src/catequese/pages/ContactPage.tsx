import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Textarea } from "../../client/components/ui/textarea";
import { Input } from "../../client/components/ui/input";
import { Label } from "../../client/components/ui/label";
import { Button } from "../../client/components/ui/button";
import { PublicNavbar } from "../PublicNavbar";
import { PublicFooter } from "../PublicFooter";
import {
  AppDisplayTitle,
  AppGoldRule,
} from "../../client/components/brand/AppChrome";
import { submitContactMessage } from "wasp/client/operations";
import { cn } from "../../client/utils";

export default function ContactPage() {
  const { t } = useTranslation("public");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;

    setSending(true);
    setFeedback(null);
    try {
      await submitContactMessage({ name, email, message });
      setFeedback({ type: "success", text: t("contact.success") });
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      setFeedback({ type: "error", text: t("contact.error") });
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-20">
        <div className="mb-10 space-y-2.5">
          <AppDisplayTitle className="text-4xl text-[#071A2D] sm:text-4xl">
            {t("contact.title")}
          </AppDisplayTitle>
          <AppGoldRule />
          <p className="text-lg text-muted-foreground">{t("contact.intro")}</p>
        </div>

        <div className="grid gap-8 md:grid-cols-5">
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Mail className="h-5 w-5 text-[#071A2D]" />
              <span>contato@catechis.app</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Phone className="h-5 w-5 text-[#071A2D]" />
              <span>+55 11 93930-7494</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <MapPin className="h-5 w-5 text-[#071A2D]" />
              <span>{t("contact.location")}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="md:col-span-3 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact-name">{t("contact.name")}</Label>
                <Input
                  id="contact-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">{t("contact.email")}</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-subject">{t("contact.subject")}</Label>
              <Input
                id="contact-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-message">{t("contact.message")}</Label>
              <Textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                className="resize-y"
              />
            </div>

            {feedback && (
              <div
                className={cn(
                  "flex items-center gap-2 text-sm p-3 rounded-sm",
                  feedback.type === "success"
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive",
                )}
              >
                {feedback.type === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {feedback.text}
              </div>
            )}

            <Button
              type="submit"
              disabled={sending || !name || !email || !message}
              className="gap-2 rounded-sm bg-[#071A2D] text-white hover:bg-[#0a2540]"
            >
              <Send className="h-4 w-4" />
              {sending ? t("contact.sending") : t("contact.send")}
            </Button>
          </form>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
