import { useParams } from "react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import { FileText, Upload, CheckCircle, Clock, Loader2 } from "lucide-react";
import { useQuery, getCatechumenByUploadToken } from "wasp/client/operations";
import { toast } from "../../client/hooks/use-toast";
import { uploadPublicDocumentMultipart } from "../../client/utils/documentUpload";

const DOC_TYPES = [
  "BAPTISM_CERTIFICATE",
  "BIRTH_CERTIFICATE",
  "CONSENT_FORM",
  "MARRIAGE_CERTIFICATE",
  "PASTORAL_LETTER",
  "OTHER",
] as const;

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-[#071A2D]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
        <div className="w-full max-w-md space-y-4 rounded-sm border border-border/70 bg-white p-8 text-center">
          <div className="mx-auto w-fit rounded-sm border border-destructive/20 bg-destructive/10 p-4">
            <Clock className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            {t("upload_docs.invalid_title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {error?.message || t("upload_docs.invalid_desc")}
          </p>
        </div>
      </div>
    );
  }

  const catechumen = data as any;

  return (
    <div className="min-h-screen bg-[#F7F4EE] flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
            <FileText className="h-4 w-4" />
            {t("workspace.app_name")}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("upload_docs.greeting")}{" "}
            <span className="text-[#071A2D]">
              {catechumen.firstName} {catechumen.lastName}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("upload_docs.subtitle")}
          </p>
        </div>

        {catechumen.documents?.length > 0 && (
          <div className="rounded-sm border border-border/70 bg-white p-5">
            <h2 className="font-semibold text-sm mb-3">
              {t("upload_docs.existing_title")}
            </h2>
            <div className="space-y-2">
              {catechumen.documents.map((d: any) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="text-overline text-muted-foreground">
                        {t(`upload_docs.types.${d.type}`, {
                          defaultValue: d.type,
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={d.verifiedAt ? "default" : "secondary"}
                    className="text-overline gap-1"
                  >
                    {d.verifiedAt ? (
                      <>
                        <CheckCircle className="h-3 w-3" />{" "}
                        {t("upload_docs.verified")}
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3" /> {t("upload_docs.pending")}
                      </>
                    )}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-sm border border-border/70 bg-white p-5 space-y-4">
          <h2 className="font-semibold text-sm">
            {t("upload_docs.new_title")}
          </h2>

          {sent && (
            <div className="rounded-sm border border-border/70 bg-muted/30 p-3 text-sm text-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {t("upload_docs.sent_success")}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              {t("upload_docs.doc_type")}
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm mt-1"
            >
              {DOC_TYPES.map((k) => (
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
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => setDocFile(e.target.files?.[0] || null)}
              className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm mt-1 file:mr-4 file:py-1 file:px-3 file:rounded-sm file:border-0 file:text-sm file:bg-muted file:text-foreground"
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
