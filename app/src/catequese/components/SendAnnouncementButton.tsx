import { useState } from "react";
import { useTranslation } from "react-i18next";
import { sendClassAnnouncementByEmail } from "wasp/client/operations";
import { Button } from "../../client/components/ui/button";
import { Input } from "../../client/components/ui/input";
import { Label } from "../../client/components/ui/label";
import { Mail, Loader2, CheckCircle, X } from "lucide-react";

interface Props {
  classId: string;
  className: string;
}

export default function SendAnnouncementButton({ classId, className }: Props) {
  const { t } = useTranslation("activities");
  const { t: tc } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(
    null,
  );
  const [error, setError] = useState("");

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setError("");
    setResult(null);
    try {
      const r = await sendClassAnnouncementByEmail({
        classId,
        subject: subject.trim(),
        body: body.trim(),
      });
      setResult(r);
      setSubject("");
      setBody("");
    } catch (e: any) {
      setError(e.message || t("announcement.error"));
    }
    setSending(false);
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Mail className="mr-1 h-3 w-3" />
        {t("announcement.button")}
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-sm border border-border/70 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            {t("announcement.title", { className })}
          </p>
          <div className="h-px w-8 bg-brand-gold" aria-hidden />
          <p className="text-xs text-muted-foreground">
            {t("announcement.hint")}
          </p>
        </div>
        <button
          onClick={() => {
            setOpen(false);
            setError("");
            setResult(null);
          }}
          className="text-muted-foreground hover:text-brand-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div>
        <Label className="text-xs font-medium">
          {t("announcement.subject")}
        </Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t("announcement.subject_placeholder")}
          aria-label={t("announcement.subject")}
          disabled={sending}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs font-medium">
          {t("announcement.message")}
        </Label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("announcement.message_placeholder")}
          aria-label={t("announcement.message")}
          rows={4}
          disabled={sending}
          className="flex w-full rounded-sm border border-input bg-background px-3 py-2 text-sm mt-1 resize-y min-h-[80px]"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {result && (
        <div className="flex items-center gap-2 rounded-sm border border-border/70 bg-muted/30 p-3 text-sm font-medium tracking-tight text-brand-ink">
          <CheckCircle className="h-4 w-4" />
          {result.failed > 0
            ? t("announcement.success_with_failures", {
                sent: result.sent,
                failed: result.failed,
              })
            : t("announcement.success", { sent: result.sent })}
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setOpen(false);
            setError("");
            setResult(null);
          }}
          disabled={sending}
        >
          {tc("cancel")}
        </Button>
        <Button
          size="sm"
          onClick={handleSend}
          disabled={sending || !subject.trim() || !body.trim()}
        >
          {sending ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              {t("announcement.sending")}
            </>
          ) : (
            t("announcement.send")
          )}
        </Button>
      </div>
    </div>
  );
}
