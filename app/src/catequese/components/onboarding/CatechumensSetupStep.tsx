import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createCatechumen, enrollCatechumen } from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import { ArrowRight, Loader2, Plus } from "lucide-react";
import { cn } from "../../../client/utils";
import { trackMarketingEvent } from "../../../client/analytics/marketingAnalytics";

type AddedPerson = { id: string; firstName: string; lastName: string };

interface CatechumensSetupStepProps {
  classId: string;
  className: string;
  onContinue: (count: number) => void;
  onSkip: () => void;
}

export function CatechumensSetupStep({
  classId,
  className,
  onContinue,
  onSkip,
}: CatechumensSetupStepProps) {
  const { t } = useTranslation("onboarding");
  const [mode, setMode] = useState<"manual" | "bulk" | "file">("manual");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [added, setAdded] = useState<AddedPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addOne = async (fn: string, ln: string) => {
    const profile = await createCatechumen({
      firstName: fn,
      lastName: ln || "—",
    });
    await enrollCatechumen({ classId, catechumenProfileId: profile.id });
    return { id: profile.id as string, firstName: fn, lastName: ln || "" };
  };

  /** Parse CSV/TSV or "name, last" lines into first/last pairs. */
  const parseNameLines = (text: string): { fn: string; ln: string }[] => {
    const rows: { fn: string; ln: string }[] = [];
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      // Skip header-ish rows
      if (/^(nome|name|first|primeiro)/i.test(line) && /sobrenome|last|surname/i.test(line)) {
        continue;
      }
      const parts = line.split(/[,;\t]/).map((p) => p.trim()).filter(Boolean);
      if (parts.length === 0) continue;
      if (parts.length === 1) {
        const words = parts[0].split(/\s+/);
        rows.push({
          fn: words[0] || parts[0],
          ln: words.slice(1).join(" ") || "",
        });
      } else {
        rows.push({ fn: parts[0], ln: parts.slice(1).join(" ") });
      }
    }
    return rows;
  };

  const enrollParsed = async (rows: { fn: string; ln: string }[], method: string) => {
    if (rows.length === 0) {
      setError(t("catechumens_setup.bulk_empty"));
      return;
    }
    setLoading(true);
    setError("");
    const created: AddedPerson[] = [];
    try {
      for (const row of rows) {
        const person = await addOne(row.fn, row.ln);
        created.push(person);
      }
      setAdded((prev) => [...prev, ...created]);
      trackMarketingEvent("onboarding_step_completed", {
        step: "catechumens_bulk_added",
        method,
        count: created.length,
      });
    } catch (err: any) {
      setError(err?.message || t("catechumens_setup.add_error"));
      if (created.length) setAdded((prev) => [...prev, ...created]);
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith(".csv") && !name.endsWith(".txt") && !name.endsWith(".tsv")) {
      setError(t("catechumens_setup.file_type_error"));
      return;
    }
    try {
      const text = await file.text();
      await enrollParsed(parseNameLines(text), "csv_file");
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

  const handleBulkAdd = async () => {
    const rows = parseNameLines(bulkText);
    await enrollParsed(rows, "bulk_text");
    if (rows.length) setBulkText("");
  };

  const handleContinue = () => {
    onContinue(added.length);
  };

  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t("catechumens_setup.eyebrow")}
        </p>
        <h2
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]"
          style={{ fontFamily: "var(--font-brand-display)" }}
        >
          {t("catechumens_setup.title")}
        </h2>
        <div className="h-px w-10 bg-[#D39A2B]" aria-hidden />
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("catechumens_setup.subtitle", { className })}
        </p>
      </div>

      {error && (
        <div className="rounded-sm border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          {error}
        </div>
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
              "flex-1 rounded-sm py-2 text-xs font-medium transition-colors",
              mode === id
                ? "bg-[#071A2D] text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
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
          <Button type="submit" variant="outline" disabled={loading} className="h-10 w-full rounded-sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
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
          <p className="text-xs text-muted-foreground">{t("catechumens_setup.bulk_hint")}</p>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={handleBulkAdd}
            className="h-10 w-full rounded-sm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
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
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-sm file:border-0 file:bg-[#071A2D] file:px-3 file:py-2 file:text-xs file:font-medium file:text-white"
          />
          <p className="text-xs text-muted-foreground">{t("catechumens_setup.file_hint")}</p>
          {loading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("catechumens_setup.file_importing")}
            </p>
          )}
        </div>
      )}
      {added.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("catechumens_setup.added_count", { count: added.length })}
          </p>
          <ul className="max-h-40 space-y-1 overflow-y-auto border-t border-border/60 pt-2">
            {added.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-foreground">
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
          disabled={loading || added.length === 0}
          className="h-11 w-full rounded-sm shadow-none"
        >
          {t("catechumens_setup.continue", { count: added.length })}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={onSkip}
          disabled={loading}
          className="py-2 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("catechumens_setup.skip")}
        </button>
        {added.length === 0 && (
          <p className="text-center text-xs text-muted-foreground">{t("catechumens_setup.skip_hint")}</p>
        )}
      </div>
    </div>
  );
}
