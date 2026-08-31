import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "../../../client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../client/components/ui/dialog";
import { toast } from "../../../client/hooks/use-toast";
import {
  CONTENT_IMPORT_ACCEPT,
  importContentFile,
} from "../../../client/utils/contentImport";
import type { ContentImportErrorCode } from "../../../shared/contentImport";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function importErrorKey(code?: string): string {
  const known: ContentImportErrorCode[] = [
    "INVALID_TYPE",
    "EMPTY_TEXT",
    "TOO_LARGE",
    "INVALID_FILE",
    "STORAGE_NOT_CONFIGURED",
    "PARSE_FAILED",
  ];
  if (code && known.includes(code as ContentImportErrorCode)) {
    return `library.error_import_${code.toLowerCase()}`;
  }
  return "library.error_import";
}

export function ImportContentModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("content");
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setFile(null);
    setDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (next: boolean) => {
    if (importing) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFile = (next: File | undefined | null) => {
    if (next) setFile(next);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const result = await importContentFile(file);
      toast({ title: t("library.import_success") });
      reset();
      onOpenChange(false);
      navigate(`/app/content-library/${result.id}/edit`);
    } catch (error: any) {
      toast({
        title: t(importErrorKey(error?.code || error?.message), {
          defaultValue: error?.message || t("library.error_import"),
        }),
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("library.import_title")}</DialogTitle>
          <DialogDescription>{t("library.import_hint")}</DialogDescription>
        </DialogHeader>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            handleFile(event.dataTransfer.files?.[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-sm border border-dashed p-6 transition-colors ${
            dragOver
              ? "border-brand-ink bg-muted/30"
              : "border-border/70 bg-muted/20 hover:border-muted-foreground/50"
          }`}
        >
          {importing ? (
            <Loader2 className="mb-2 h-8 w-8 animate-spin text-brand-ink" />
          ) : (
            <FileUp
              className={`mb-2 h-8 w-8 ${
                dragOver ? "text-brand-ink" : "text-muted-foreground"
              }`}
            />
          )}
          <p className="text-center text-sm text-muted-foreground">
            {dragOver
              ? t("library.import_drag_over")
              : file
                ? t("library.import_selected", {
                    name: file.name,
                    size: formatFileSize(file.size),
                  })
                : t("library.import_hint")}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={CONTENT_IMPORT_ACCEPT}
            onChange={(event) => handleFile(event.target.files?.[0])}
            className="hidden"
            disabled={importing}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {t("library.import_formats")}
        </p>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={importing}
          >
            {t("library.import_cancel", { defaultValue: "Cancelar" })}
          </Button>
          <Button
            size="sm"
            onClick={() => void handleImport()}
            disabled={!file || importing}
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("library.import_importing")}
              </>
            ) : (
              t("library.import_submit")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
