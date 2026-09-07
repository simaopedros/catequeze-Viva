import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Paperclip, Trash2 } from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { toast } from "../../client/hooks/use-toast";
import {
  downloadOfficialResourceAttachment,
  uploadOfficialResourceAttachment,
} from "../../client/utils/officialResourceUpload";
import { removeOfficialResourceAttachment } from "wasp/client/operations";

export type OfficialAttachment = {
  id: string;
  name: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  fileUrl?: string;
};

export function OfficialResourceAttachments({
  resourceId,
  workspaceId,
  attachments,
  canEdit,
  onChanged,
}: {
  resourceId: string;
  workspaceId?: string;
  attachments: OfficialAttachment[];
  canEdit: boolean;
  onChanged?: () => void;
}) {
  const { t } = useTranslation("hierarchy");
  const { t: tc } = useTranslation("common");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      await uploadOfficialResourceAttachment({
        resourceId,
        workspaceId,
        file,
      });
      toast({ title: t("library.attached") });
      onChanged?.();
    } catch (e: any) {
      toast({
        title: t("library.attach_error"),
        description: e?.message,
        variant: "destructive",
      });
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDownload = async (att: OfficialAttachment) => {
    try {
      await downloadOfficialResourceAttachment({
        attachmentId: att.id,
        name: att.name,
        workspaceId,
        fileUrl: att.fileUrl,
      });
    } catch (e: any) {
      toast({
        title: t("library.download_error"),
        description: e?.message,
        variant: "destructive",
      });
    }
  };

  const handleRemove = async (id: string) => {
    if (id.startsWith("legacy:")) return;
    try {
      await removeOfficialResourceAttachment({ id, workspaceId });
      toast({ title: t("library.attachment_removed") });
      onChanged?.();
    } catch (e: any) {
      toast({
        title: t("library.attach_error"),
        description: e?.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-2" data-testid="official-attachments">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {t("library.attachments")}
      </p>
      {attachments.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("library.no_attachments")}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {attachments.map((att) => (
            <li
              key={att.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border/60 px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate">{att.name}</span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(att)}
                >
                  <Download className="mr-1 h-3.5 w-3.5" />
                  {tc("download")}
                </Button>
                {canEdit && !att.id.startsWith("legacy:") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(att.id)}
                    aria-label={t("library.remove_attachment")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <div>
          <input
            ref={inputRef}
            type="file"
            data-testid="official-attach-input"
            className="sr-only"
            accept=".pdf,.doc,.docx,.odt,.xlsx,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Paperclip className="mr-1 h-3.5 w-3.5" />
            {uploading ? t("library.attaching") : t("library.attach")}
          </Button>
        </div>
      )}
    </div>
  );
}
