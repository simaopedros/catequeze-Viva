import { useParams } from "react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../client/components/ui/button";
import {
  AppDisplayTitle,
  AppEyebrow,
  AppGoldRule,
} from "../../client/components/brand/AppChrome";
import { FileText, Upload, CheckCircle, Clock, Loader2 } from "lucide-react";
import { useQuery, getCatechumenByUploadToken } from "wasp/client/operations";
import { toast } from "../../client/hooks/use-toast";
import { uploadPublicDocumentMultipart } from "../../client/utils/documentUpload";

export default function PublicUploadDocsPage() {
  const { t } = useTranslation("public");
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = useQuery(
    getCatechumenByUploadToken,
    token ? { token } : { token: "" },
  );

  const [docType, setDocType] = useState<string>("BAPTISM_CERTIFICATE");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleUpload = async () => {
    if (!docFile || !token) return;
    setSending(true);
    try {
      await uploadPublicDocumentMultipart({
        file: docFile,
        token,
        type: docType,
      });
      setSent(true);
      setDocFile(null);
      toast({ title: t("upload_docs.toast_success") });
    } catch (e: any) {
      toast({
        title: t("upload_docs.toast_error", {
          message: e.message || t("upload_docs.upload_error"),
        }),
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand-ink" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-background p-6">
        <div className="w-full max-w-md space-y-4 rounded-sm border border-border/70 bg-white p-8 text-center">
          <div className="mx-auto w-fit rounded-sm border border-destructive/20 bg-destructive/10 p-4">
            <Clock className="h-8 w-8 text-destructive" />
          </div>
          <AppDisplayTitle className="text-xl sm:text-xl">
            {t("upload_docs.invalid_title")}
          </AppDisplayTitle>
          <AppGoldRule className="mx-auto" />
          <p className="text-sm text-muted-foreground">
            {error?.message || t("upload_docs.invalid_desc")}
          </p>
        </div>
      </div>
    );
  }

  const catechumen = data as any;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        <div className="space-y-2.5 text-center">
          <AppEyebrow className="inline-flex items-center justify-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {t("workspace.app_name")}
          </AppEyebrow>
          <AppDisplayTitle className="text-2xl sm:text-2xl">
            {t("upload_docs.greeting")}{" "}
            <span className="text-brand-ink">
              {catechumen.firstName}
            </span>
          </AppDisplayTitle>
          <AppGoldRule className="mx-auto" />
          <p className="text-sm text-muted-foreground">
            {t("upload_docs.subtitle")}
          </p>
        </div>

        <div className="rounded-sm border border-border/70 bg-white p-5 space-y-4">
          <div className="space-y-1.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("upload_docs.new_title")}
            </h2>
            <div className="h-px w-8 bg-brand-gold" aria-hidden />
          </div>

          {sent && (
            <div className="flex items-center gap-2 rounded-sm border border-border/70 bg-muted/30 p-3 text-sm font-medium tracking-tight text-brand-ink">
              <CheckCircle className="h-4 w-4" />
              {t("upload_docs.sent_success")}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              {t("upload_docs.doc_type")}
            </label>
            <select
              aria-label={t("upload_docs.doc_type")}
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm mt-1"
            >
              {catechumen.documentTypes.map((k: string) => (
                <option key={k} value={k}>
                  {t(`upload_docs.types.${k}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              {t("upload_docs.file")}
            </label>
            <input
              aria-label={t("upload_docs.file")}
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.pdf,application/pdf"
              capture="environment"
              onChange={(e) => setDocFile(e.target.files?.[0] || null)}
              className="mt-1 flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm file:mr-4 file:rounded-sm file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-semibold file:tracking-tight file:text-brand-ink"
            />
            <p className="text-overline text-muted-foreground mt-1">
              {t("upload_docs.file_hint")}
            </p>
          </div>

          <Button
            className="w-full"
            onClick={handleUpload}
            disabled={sending || !docFile}
          >
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {sending ? t("upload_docs.sending") : t("upload_docs.submit")}
          </Button>
        </div>
      </div>
    </div>
  );
}
