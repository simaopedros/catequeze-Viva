import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createCatechumen, enrollCatechumen } from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import { ArrowRight, Loader2, Plus } from "lucide-react";
import { cn } from "../../../client/utils";
import {
  AppEyebrow,
  AppDisplayTitle,
  AppGoldRule,
} from "../../../client/components/brand/AppChrome";
import { trackMarketingEvent } from "../../../client/analytics/marketingAnalytics";
import { Alert } from "../../../client/components/ui/alert";

type AddedPerson = { id: string; firstName: string; lastName: string };
type ParsedRow = {
  line: number;
  fn: string;
  ln: string;
  status: "valid" | "duplicate" | "invalid";
};

interface CatechumensSetupStepProps {
  classId: string;
  className: string;
  onContinue: (count: number) => void;
  onSkip: () => void;
  initialCount?: number;
  onCountChange?: (count: number) => void;
}

export function CatechumensSetupStep({
  classId,
  className,
  onContinue,
  onSkip,
  initialCount = 0,
  onCountChange,
}: CatechumensSetupStepProps) {
  const { t } = useTranslation("onboarding");
  const [previouslyAdded] = useState(initialCount);
  const [mode, setMode] = useState<"manual" | "bulk" | "file">("manual");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [added, setAdded] = useState<AddedPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);
  const [failedRows, setFailedRows] = useState<ParsedRow[]>([]);
  const totalCount = previouslyAdded + added.length;

  useEffect(() => {
    onCountChange?.(totalCount);
  }, [onCountChange, totalCount]);

  const addOne = async (fn: string, ln: string) => {
    const profile = await createCatechumen({
      firstName: fn,
      lastName: ln || "—",
    });
    await enrollCatechumen({ classId, catechumenProfileId: profile.id });
    return { id: profile.id as string, firstName: fn, lastName: ln || "" };
  };

  /** Parse CSV/TSV or pasted names and classify before any write. */
  const parseNameLines = (text: string): ParsedRow[] => {
    const seen = new Set(
      added.map((person) =>
        `${person.firstName} ${person.lastName}`.trim().toLocaleLowerCase(),
      ),
    );
    const rows: ParsedRow[] = [];
    text.split(/\r?\n/).forEach((raw, index) => {
      const line = raw.trim();
      if (!line) return;
      if (
        /^(nome|name|first|primeiro)/i.test(line) &&
        /sobrenome|last|surname/i.test(line)
      )
        return;
      const parts = line
        .split(/[,;\t]/)
        .map((part) => part.trim())
        .filter(Boolean);
      const words = (parts[0] || "").split(/\s+/).filter(Boolean);
      const fn = parts.length > 1 ? parts[0] : words[0] || "";
      const ln =
        parts.length > 1 ? parts.slice(1).join(" ") : words.slice(1).join(" ");
      const key = `${fn} ${ln}`.trim().toLocaleLowerCase();
      const invalid = fn.length < 2 || /[<>]/.test(line);
      const duplicate = !invalid && seen.has(key);
      rows.push({
        line: index + 1,
        fn,
        ln,
        status: invalid ? "invalid" : duplicate ? "duplicate" : "valid",
      });
      if (!invalid) seen.add(key);
    });
    return rows;
  };

  const enrollParsed = async (rows: ParsedRow[], method: string) => {
    const validRows = rows.filter((row) => row.status === "valid");
    if (validRows.length === 0) {
      setError(t("catechumens_setup.bulk_empty"));
      return;
    }
    setLoading(true);
    setError("");
    const created: AddedPerson[] = [];
    const failed: ParsedRow[] = [];
    for (const row of validRows) {
      try {
        created.push(await addOne(row.fn, row.ln));
      } catch {
        failed.push(row);
      }
    }
    if (created.length) {
      setAdded((prev) => [...prev, ...created]);
      trackMarketingEvent("onboarding_step_completed", {
        step: "catechumens_bulk_added",
        method,
        count: created.length,
      });
    }
    setFailedRows(failed);
    setPreviewRows(failed);
    if (failed.length) {
      setError(t("catechumens_setup.partial_error", { count: failed.length }));
    }
    setLoading(false);
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (
      !name.endsWith(".csv") &&
      !name.endsWith(".txt") &&
      !name.endsWith(".tsv")
    ) {
      setError(t("catechumens_setup.file_type_error"));
      return;
    }
    try {
      const text = await file.text();
      setPreviewRows(parseNameLines(text));
      setFailedRows([]);
    } catch {
      setError(t("catechumens_setup.file_read_error"));
    }
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const fn = firstName.trim();
    if (!fn) {
      setError(t("catechumens_setup.name_required"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const person = await addOne(fn, lastName.trim());
      setAdded((prev) => [...prev, person]);
      setFirstName("");
      setLastName("");
      trackMarketingEvent("onboarding_step_completed", {
        step: "catechumen_added",
        method: "manual",
      });
    } catch (err: any) {
      setError(err?.message || t("catechumens_setup.add_error"));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAdd = () => {
    setPreviewRows(parseNameLines(bulkText));
    setFailedRows([]);
    setError("");
  };

  const handleContinue = () => {
    onContinue(totalCount);
  };

  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <AppEyebrow>{t("catechumens_setup.eyebrow")}</AppEyebrow>
        <AppDisplayTitle as="h2">
          {t("catechumens_setup.title")}
        </AppDisplayTitle>
        <AppGoldRule />
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("catechumens_setup.subtitle", { className })}
        </p>
      </div>

      {error && (
        <Alert role="alert" aria-live="assertive" variant="destructive">
          {error}
        </Alert>
      )}

      <div className="flex gap-1 rounded-sm border border-border/70 p-1">
        {(
          [
            ["manual", "tab_manual"],
            ["bulk", "tab_bulk"],
            ["file", "tab_file"],
          ] as const
        ).map(([id, key]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn(
              "min-h-11 flex-1 rounded-sm px-2 py-2 text-xs font-medium transition-colors",
              mode === id
                ? "bg-brand-ink text-white"
                : "text-muted-foreground hover:text-brand-ink",
            )}
            aria-pressed={mode === id}
          >
            {t(`catechumens_setup.${key}`)}
          </button>
        ))}
      </div>

      {mode === "manual" && (
        <form onSubmit={handleAddManual} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ob-fn" className="text-xs font-medium">
                {t("catechumens_setup.first_name")}
              </Label>
              <Input
                id="ob-fn"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-11 rounded-sm"
                disabled={loading}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-ln" className="text-xs font-medium">
                {t("catechumens_setup.last_name")}
              </Label>
              <Input
                id="ob-ln"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-11 rounded-sm"
                disabled={loading}
              />
            </div>
          </div>
          <Button
            type="submit"
            variant="outline"
            disabled={loading}
            className="h-11 w-full rounded-sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {t("catechumens_setup.add_one")}
          </Button>
        </form>
      )}

      {mode === "bulk" && (
        <div className="space-y-3">
          <Label htmlFor="ob-bulk" className="text-xs font-medium">
            {t("catechumens_setup.bulk_label")}
          </Label>
          <textarea
            id="ob-bulk"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={t("catechumens_setup.bulk_placeholder")}
            rows={5}
            disabled={loading}
            className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            {t("catechumens_setup.bulk_hint")}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={handleBulkAdd}
            className="h-11 w-full rounded-sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {t("catechumens_setup.add_bulk")}
          </Button>
        </div>
      )}

      {mode === "file" && (
        <div className="space-y-3">
          <Label htmlFor="ob-csv" className="text-xs font-medium">
            {t("catechumens_setup.file_label")}
          </Label>
          <input
            id="ob-csv"
            type="file"
            accept=".csv,.txt,.tsv,text/csv,text/plain"
            disabled={loading}
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-sm file:border-0 file:bg-brand-ink file:px-3 file:py-2 file:text-xs file:font-medium file:text-white"
          />
          <p className="text-xs text-muted-foreground">
            {t("catechumens_setup.file_hint")}
          </p>
          {loading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("catechumens_setup.file_importing")}
            </p>
          )}
        </div>
      )}
      {previewRows.length > 0 && (
        <div
          className="space-y-3 rounded-sm border border-border/70 bg-muted/20 p-4"
          aria-live="polite"
        >
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-success/10 px-2 py-1 text-success">
              {t("catechumens_setup.preview_valid", {
                count: previewRows.filter((row) => row.status === "valid")
                  .length,
              })}
            </span>
            <span className="rounded-full bg-warning/10 px-2 py-1 text-warning-foreground">
              {t("catechumens_setup.preview_duplicate", {
                count: previewRows.filter((row) => row.status === "duplicate")
                  .length,
              })}
            </span>
            <span className="rounded-full bg-destructive/10 px-2 py-1 text-destructive">
              {t("catechumens_setup.preview_invalid", {
                count: previewRows.filter((row) => row.status === "invalid")
                  .length,
              })}
            </span>
          </div>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
            {previewRows.map((row) => (
              <li
                key={`${row.line}-${row.fn}-${row.ln}`}
                className="flex items-center justify-between gap-3 border-t border-border/50 py-2 first:border-0"
              >
                <span className="truncate">
                  {row.fn} {row.ln}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {t(`catechumens_setup.row_${row.status}`)}
                </span>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            className="h-11 w-full rounded-sm"
            disabled={
              loading || !previewRows.some((row) => row.status === "valid")
            }
            onClick={() =>
              void enrollParsed(
                previewRows,
                mode === "file"
                  ? "csv_file"
                  : failedRows.length
                    ? "retry_failed"
                    : "bulk_text",
              )
            }
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {failedRows.length
              ? t("catechumens_setup.retry_failed", {
                  count: failedRows.length,
                })
              : t("catechumens_setup.confirm_import")}
          </Button>
        </div>
      )}

      {totalCount > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("catechumens_setup.added_count", { count: totalCount })}
          </p>
          <ul className="max-h-40 space-y-1 overflow-y-auto border-t border-border/60 pt-2">
            {added.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between py-1.5 text-sm"
              >
                <span className="font-semibold tracking-tight text-brand-ink">
                  {p.firstName} {p.lastName}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-1">
        <Button
          type="button"
          onClick={handleContinue}
          disabled={loading || totalCount === 0}
          className="h-11 w-full rounded-sm shadow-none"
        >
          {t("catechumens_setup.continue", { count: totalCount })}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={onSkip}
          disabled={loading}
          className="py-2 text-center text-sm text-muted-foreground transition-colors hover:text-brand-ink"
        >
          {t("catechumens_setup.skip")}
        </button>
        {totalCount === 0 && (
          <p className="text-center text-xs text-muted-foreground">
            {t("catechumens_setup.skip_hint")}
          </p>
        )}
      </div>
    </div>
  );
}
