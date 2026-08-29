import { useState } from "react";
import { useTranslation } from "react-i18next";
import { reportSocialContent } from "wasp/client/operations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../client/components/ui/dialog";
import { Button } from "../../../client/components/ui/button";
import { Textarea } from "../../../client/components/ui/textarea";
import { Label } from "../../../client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../client/components/ui/select";
import { toast } from "../../../client/hooks/use-toast";

const REASONS = [
  "DOCTRINE",
  "HATE",
  "SEXUAL",
  "VIOLENCE",
  "SPAM",
  "MINOR_PRIVACY",
  "OTHER",
] as const;

/** Reporting is open to everyone — anonymous visitors included. */
export function SocialReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: "POST" | "COMMENT";
  targetId: string;
}) {
  const { t } = useTranslation("social");
  const [reason, setReason] = useState<(typeof REASONS)[number]>("OTHER");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    try {
      await reportSocialContent({ targetType, targetId, reason, details });
      toast({ title: t("report.sent") });
      onOpenChange(false);
      setDetails("");
      setReason("OTHER");
    } catch (error: any) {
      toast({ title: error?.message || t("report.failed"), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("report.title")}</DialogTitle>
          <DialogDescription>{t("report.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="social-report-reason">{t("report.title")}</Label>
            <Select value={reason} onValueChange={(value) => setReason(value as any)}>
              <SelectTrigger id="social-report-reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`report.reason.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="social-report-details">{t("report.details")}</Label>
            <Textarea
              id="social-report-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
              maxLength={1000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            {t("post.backToFeed")}
          </Button>
          <Button onClick={submit} disabled={sending}>
            {t("report.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
