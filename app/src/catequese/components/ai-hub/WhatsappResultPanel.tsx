import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "../../../client/components/ui/button";
import { Card } from "../../../client/components/ui/card";
import { Textarea } from "../../../client/components/ui/textarea";
import {
  AppDisplayTitle,
  AppEyebrow,
  AppGoldRule,
} from "../../../client/components/brand/AppChrome";
import {
  RotateCcw,
  ArrowLeft,
  Copy,
  Check,
  FileText,
  Smartphone,
} from "lucide-react";
import { toast } from "../../../client/hooks/use-toast";

interface WhatsappResultPanelProps {
  message: string;
  contentId: string;
  onRegenerate: () => void;
  onBack: () => void;
}

export function WhatsappResultPanel({
  message,
  contentId,
  onRegenerate,
  onBack,
}: WhatsappResultPanelProps) {
  const { t } = useTranslation("ai");
  const [editedMessage, setEditedMessage] = useState(message);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEditedMessage(message);
    setCopied(false);
  }, [message]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedMessage);
      setCopied(true);
      toast({ title: t("whatsapp.copied") });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = editedMessage;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center justify-center px-3 py-6">
      <div className="w-full max-w-2xl space-y-6">
        <Card className="space-y-4 rounded-sm border-border/70 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-border/70 bg-muted/30 text-[#071A2D]">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-2">
              <AppEyebrow>{t("whatsapp.result_subtitle")}</AppEyebrow>
              <AppDisplayTitle as="h2" className="text-lg sm:text-lg">
                {t("whatsapp.result_title")}
              </AppDisplayTitle>
              <AppGoldRule />
            </div>
          </div>

          <Textarea
            value={editedMessage}
            onChange={(e) => setEditedMessage(e.target.value)}
            className="min-h-[200px] text-sm leading-relaxed"
            placeholder={t("whatsapp.empty_message")}
            aria-label={t("whatsapp.empty_message")}
          />
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("whatsapp.back_config")}
          </Button>
          <Button variant="outline" size="sm" onClick={onRegenerate}>
            <RotateCcw className="mr-1 h-4 w-4" />
            {t("whatsapp.regenerate")}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleCopy}
            className="gap-1"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" /> {t("whatsapp.copied")}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> {t("whatsapp.copy")}
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/app/content-library/${contentId}`}>
              <FileText className="mr-1 h-4 w-4" />
              {t("whatsapp.view_content")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
