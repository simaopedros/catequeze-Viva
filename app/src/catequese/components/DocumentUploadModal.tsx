import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../client/components/ui/button";
import {
  AppDisplayTitle,
  AppGoldRule,
} from "../../client/components/brand/AppChrome";
import { FilePlus, Loader2, X } from "lucide-react";
import { uploadDocumentMultipart } from "../../client/utils/documentUpload";
import { toast } from "../../client/hooks/use-toast";

const DOC_TYPES = [
  "BAPTISM_CERTIFICATE",
  "BIRTH_CERTIFICATE",
  "CONSENT_FORM",
  "MARRIAGE_CERTIFICATE",
  "PASTORAL_LETTER",
  "OTHER",
] as const;

interface DocumentUploadModalProps {
  catechumenProfileId: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DocumentUploadModal({
  catechumenProfileId,
  open,
  onClose,
  onSuccess,
}: DocumentUploadModalProps) {
  const { t } = useTranslation("common");
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("BAPTISM_CERTIFICATE");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!open) return null;

  const handleUpload = async () => {
    if (!name.trim() || !file) return;
    setUploading(true);
    try {
      await uploadDocumentMultipart({
        file,
        name: name.trim(),
        type,
        catechumenProfileId,
      });
      toast({ title: t("documents.sent_success") });
      setName("");
      setFile(null);
      onSuccess?.();
      onClose();
    } catch (e: any) {
      toast({ title: t("upload_error") });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-sm border border-border/70 bg-white w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <FilePlus className="h-5 w-5 shrink-0 text-brand-ink" />
              <AppDisplayTitle as="h2" className="text-lg sm:text-lg">
                {t("new_document")}
              </AppDisplayTitle>
            </div>
            <AppGoldRule />
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-brand-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">
            {t("documents.name")}
          </label>
          <input
            placeholder={t("documents.name_placeholder")}
            aria-label={t("documents.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 flex h-9 w-full rounded-sm border border-input bg-background px-3 py-1 text-sm"
            autoFocus
          />
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">
            {t("documents.doc_type_label")}
          </label>
          <select
            aria-label={t("documents.doc_type_label")}
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 flex h-9 w-full rounded-sm border border-input bg-background px-3 py-1 text-sm"
          >
            {DOC_TYPES.map((dt) => (
              <option key={dt} value={dt}>
                {t("catechumens.doc_types." + dt)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">
            {t("documents.doc_file_label")}
          </label>
          <input
            aria-label={t("documents.doc_file_label")}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mt-1 flex h-9 w-full rounded-sm border border-input bg-background px-3 py-1 text-sm"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={uploading}
          >
            {t("cancel")}
          </Button>
          <Button
            size="sm"
            onClick={handleUpload}
            disabled={uploading || !name.trim() || !file}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" /> {t("saving")}
              </>
            ) : (
              t("upload")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
