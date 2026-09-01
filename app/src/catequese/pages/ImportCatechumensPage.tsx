import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "../../client/components/ui/button";
import { QueryErrorState } from "../../client/components/QueryErrorState";
import { Textarea } from "../../client/components/ui/textarea";
import {
  ArrowLeft,
  Upload,
  CheckCircle,
  AlertCircle,
  FileUp,
  Eye,
} from "lucide-react";
import {
  useQuery,
  importCatechumensCSV,
  listParishes,
  listClasses,
} from "wasp/client/operations";
import { useUserContext } from "../../client/hooks/useUserContext";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import {
  AppPageHeader,
  AppPanel,
} from "../../client/components/brand/AppChrome";
import { parseCatechumenCsv } from "../../shared/csvCatechumenImport";

export default function ImportCatechumensPage() {
  const { t } = useTranslation("common");
  const [csvData, setCsvData] = useState("");
  const [results, setResults] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { userRole } = useUserContext();
  const { activeParishId } = useActiveParish();
  const [searchParams] = useSearchParams();
  const scopedClassId = searchParams.get("classId") || "";
  const { data: parishes = [] } = useQuery(listParishes);
  const {
    data: classPage,
    error: classesError,
    refetch: refetchClasses,
  } = useQuery(
    listClasses,
    { workspaceId: activeParishId || undefined, take: 100 } as any,
    { enabled: Boolean(activeParishId) },
  );
  const classes = Array.isArray(classPage)
    ? classPage
    : (classPage as any)?.items || [];
  const scopedClass = classes.find((c: any) => c.id === scopedClassId);
  const [selectedParishId, setSelectedParishId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState(scopedClassId);

  const showParishSelector = useMemo(() => {
    return (
      ["SUPER_ADMIN", "DIOCESE_ADMIN"].includes(userRole) && parishes.length > 1
    );
  }, [userRole, parishes]);

  useEffect(() => {
    if (activeParishId) {
      setSelectedParishId(activeParishId);
    } else if (parishes.length > 0) {
      setSelectedParishId(parishes[0].id);
    }
  }, [activeParishId, parishes]);

  useEffect(() => {
    if (scopedClassId) setSelectedClassId(scopedClassId);
  }, [scopedClassId]);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setCsvData((e.target?.result as string) || "");
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
        handleFile(file);
      } else {
        setError(t("catechumens.import_invalid_csv"));
      }
    },
    [handleFile, t],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const previewRows = useMemo(() => {
    if (!csvData.trim()) return [];
    try {
      return parseCatechumenCsv(csvData);
    } catch {
      return [];
    }
  }, [csvData]);

  const handleImport = async () => {
    if (!csvData.trim()) return;
    setImporting(true);
    setError("");
    try {
      const result = await importCatechumensCSV({
        csvData,
        parishId: showParishSelector ? selectedParishId : undefined,
        classId: selectedClassId || undefined,
      });
      setResults(result);
    } catch (e: any) {
      setError(e.message || t("catechumens.import_error"));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <AppPageHeader
        eyebrow={t("catechumens.import_title")}
        title={t("catechumens.import_title")}
        subtitle={t("catechumens.import_subtitle")}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="h-10 rounded-sm"
            asChild
          >
            <Link to="/app/catechumens">
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t("back")}
            </Link>
          </Button>
        }
      />

      <AppPanel className="space-y-4">
        <div className="space-y-1.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("catechumens.import_format_title")}
          </h3>
          <div className="h-px w-8 bg-brand-gold" aria-hidden />
          <p className="text-sm text-muted-foreground">
            {t("catechumens.import_format_desc")}
          </p>
          <pre className="mt-2 rounded-sm bg-muted p-3 text-xs">
            {`nome,sobrenome,nascimento,familia,turma
João,Silva,2015-03-15,Silva Santos,Eucaristia 2026
Maria,Santos,2014-07-22,Silva Santos,Eucaristia 2026`}
          </pre>
        </div>

        {scopedClass && (
          <div className="rounded-sm border border-brand-ink/20 bg-muted/30 p-3 text-sm text-brand-ink">
            {t("catechumens.import_for_class_banner", {
              name: scopedClass.name,
            })}
          </div>
        )}

        {showParishSelector && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("parish") || "Paróquia"}
            </label>
            <select
              aria-label={t("parish") || "Paróquia"}
              value={selectedParishId}
              onChange={(e) => setSelectedParishId(e.target.value)}
              className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm mt-1"
            >
              {parishes.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {!scopedClassId && classesError && classes.length === 0 && (
          <QueryErrorState
            compact
            error={classesError}
            onRetry={refetchClasses}
          />
        )}

        {!scopedClassId && classes.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("catechumens.import_class_label")}
            </label>
            <select
              aria-label={t("catechumens.import_class_label")}
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm mt-1"
            >
              <option value="">{t("catechumens.import_unassigned")}</option>
              {classes.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-sm font-medium">
            {t("catechumens.import_csv_label")}
          </label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-1 flex cursor-pointer flex-col items-center justify-center rounded-sm border border-dashed border-border/70 p-6 transition-colors ${
              dragOver
                ? "border-brand-ink bg-muted/30"
                : "border-muted-foreground/25 hover:border-muted-foreground/50 bg-muted/20"
            }`}
          >
            <FileUp
              className={`mb-2 h-8 w-8 ${
                dragOver ? "text-brand-ink" : "text-muted-foreground"
              }`}
            />
            <p className="text-sm text-muted-foreground text-center">
              {dragOver
                ? t("catechumens.import_drag_over")
                : t("catechumens.import_drag_hint")}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          <Textarea
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            className="flex min-h-[200px] w-full rounded-sm border border-input bg-background px-3 py-2 text-sm mt-2 font-mono"
            placeholder={t("catechumens.import_csv_placeholder")}
            aria-label={t("catechumens.import_csv_placeholder")}
          />
        </div>

        {previewRows.length > 0 && (
          <div className="border rounded-sm p-4 bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <Eye className="h-3.5 w-3.5 text-brand-ink" />
                  {t("catechumens.import_preview") ||
                    "Visualização dos Dados"}{" "}
                  ({previewRows.length} {t("catechumens.rows") || "linhas"})
                </h4>
                <div className="h-px w-8 bg-brand-gold" aria-hidden />
              </div>
            </div>
            <div className="max-h-60 overflow-x-auto rounded-sm border border-border/70 bg-white">
              <table className="min-w-full text-xs text-left">
                <thead className="border-b bg-muted text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">
                      {t("catechumens.line") || "Linha"}
                    </th>
                    <th className="px-3 py-2">{t("first_name")}</th>
                    <th className="px-3 py-2">{t("last_name")}</th>
                    <th className="px-3 py-2">
                      {t("catechumens.birth_short")}
                    </th>
                    <th className="px-3 py-2">{t("catechumens.family")}</th>
                    <th className="px-3 py-2">
                      {t("catechumens.import_class_column")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewRows.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/10">
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.lineNumber}
                      </td>
                      <td className="px-3 py-2 font-semibold tracking-tight text-brand-ink">
                        {row.firstName || (
                          <span className="font-normal text-destructive">
                            {t("catechumens.empty") || "Vazio"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium text-brand-ink/90">
                        {row.lastName}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.birthDate || "-"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.familyName || "-"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.className ||
                          scopedClass?.name ||
                          t("catechumens.import_unassigned")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewRows.length > 50 && (
              <p className="text-xs text-muted-foreground italic text-center">
                {t("catechumens.preview_showing_limit", {
                  total: previewRows.length,
                })}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-sm border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        <Button
          className="h-10 rounded-md"
          onClick={handleImport}
          disabled={!csvData.trim() || importing}
        >
          <Upload className="mr-2 h-4 w-4" />
          {importing ? t("catechumens.importing") : t("import")}
        </Button>
      </AppPanel>

      {results && (
        <div className="space-y-3 rounded-sm border border-border/70 bg-white p-6">
          <div className="space-y-1.5">
            <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-brand-ink" />
              {t("catechumens.import_result_title")}
            </h3>
            <div className="h-px w-8 bg-brand-gold" aria-hidden />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-sm border border-border/70 bg-muted/30 p-4 text-center">
              <p className="text-2xl font-semibold tracking-tight tabular-nums text-brand-ink">
                {results.created}
              </p>
              <p className="text-sm text-brand-ink">
                {t("catechumens.import_created")}
              </p>
              {typeof results.enrolled === "number" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("catechumens.import_enrolled", {
                    count: results.enrolled,
                  })}
                </p>
              )}
            </div>
            <div className="rounded-sm border border-destructive/20 bg-destructive/10 p-4 text-center">
              <p className="text-2xl font-semibold tracking-tight tabular-nums text-destructive">
                {results.errors}
              </p>
              <p className="text-sm text-destructive">
                {t("catechumens.import_errors")}
              </p>
            </div>
          </div>
          {results.details?.length > 0 && (
            <div className="text-xs text-muted-foreground space-y-1 max-h-40 overflow-y-auto border p-2 rounded-sm bg-muted/10 font-mono">
              {results.details.map((d: string, i: number) => (
                <p key={i}>{d}</p>
              ))}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button asChild className="flex-1">
              <Link to="/app/families">
                {t("families.view_families_cta") || "Vincular a Famílias"}
              </Link>
            </Button>
            {selectedClassId ? (
              <Button asChild variant="outline" className="flex-1">
                <Link to={`/app/classes/${selectedClassId}`}>
                  {t("catechumens.import_view_class")}
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="flex-1">
                <Link to="/app/catechumens">
                  {t("catechumens.import_view_list")}
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
