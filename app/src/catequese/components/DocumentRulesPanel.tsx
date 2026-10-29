import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useQuery,
  getDocumentStageRules,
  setDocumentStageRule,
} from "wasp/client/operations";
import {
  DOCUMENT_STAGES,
  DOCUMENT_TYPES,
  DEFAULT_DOCUMENT_REQUIREMENTS,
} from "../../shared/documents/requirements";
import { useDocumentTypeLabels } from "../../i18n/useLabels";
import { Button } from "../../client/components/ui/button";
import { toast } from "../../client/hooks/use-toast";
export function DocumentRulesPanel({
  workspaceId,
  dioceseAdmin = false,
}: {
  workspaceId: string;
  dioceseAdmin?: boolean;
}) {
  const { t } = useTranslation("common");
  const labels = useDocumentTypeLabels(true);
  const [scope, setScope] = useState<"PARISH" | "DIOCESE">(
    dioceseAdmin ? "DIOCESE" : "PARISH",
  );
  const {
    data: rawData,
    refetch,
    error,
  } = useQuery(getDocumentStageRules, { workspaceId, scope });
  const data = rawData as { rules: any[]; history: any[] } | undefined;
  const [busy, setBusy] = useState(false);
  async function save(
    stageKind: string,
    documentType: string,
    requirement: string | null,
  ) {
    setBusy(true);
    try {
      await setDocumentStageRule({
        workspaceId,
        scope,
        stageKind,
        documentType,
        requirement,
      });
      await refetch();
    } catch (e: any) {
      toast({
        title: t("error"),
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3 rounded border p-4">
      <h2 className="font-semibold">{t("documentRules.title")}</h2>
      <p className="text-sm">{t("documentRules.advisory")}</p>
      {dioceseAdmin && (
        <select
          aria-label={t("documentRules.scope")}
          value={scope}
          onChange={(e) => setScope(e.target.value as any)}
        >
          <option value="DIOCESE">{t("documentRules.diocese")}</option>
          <option value="PARISH">{t("documentRules.parish")}</option>
        </select>
      )}
      {error && <p role="alert">{error.message}</p>}
      {data && !error && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>{t("documentRules.stage")}</th>
                  {DOCUMENT_TYPES.map((type) => (
                    <th key={type}>{labels[type]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DOCUMENT_STAGES.map((stage) => (
                  <tr key={stage}>
                    <th className="p-2 text-left">
                      {t(`documentRules.stages.${stage}`)}
                    </th>
                    {DOCUMENT_TYPES.map((type) => {
                      const own = data.rules.find(
                        (r: any) =>
                          r.scope === scope &&
                          r.stageKind === stage &&
                          r.documentType === type,
                      );
                      const inherited =
                        scope === "PARISH"
                          ? data.rules.find(
                              (r: any) =>
                                r.scope === "DIOCESE" &&
                                r.stageKind === stage &&
                                r.documentType === type,
                            )?.requirement
                          : null;
                      const effective =
                        own?.requirement ??
                        inherited ??
                        DEFAULT_DOCUMENT_REQUIREMENTS[stage][type];
                      return (
                        <td key={type} className="p-2">
                          <select
                            disabled={busy}
                            aria-label={`${t(
                              `documentRules.stages.${stage}`,
                            )}: ${labels[type]}`}
                            value={own?.requirement ?? ""}
                            onChange={(e) =>
                              save(stage, type, e.target.value || null)
                            }
                          >
                            <option value="">
                              {t("documentRules.inherit")} (
                              {t(
                                `documentRules.values.${
                                  inherited ??
                                  DEFAULT_DOCUMENT_REQUIREMENTS[stage][type]
                                }`,
                              )}
                              )
                            </option>
                            {["REQUIRED", "OPTIONAL", "NOT_APPLICABLE"].map(
                              (value) => (
                                <option key={value} value={value}>
                                  {t(`documentRules.values.${value}`)}
                                </option>
                              ),
                            )}
                          </select>
                          <span className="sr-only">
                            {t(`documentRules.values.${effective}`)}
                          </span>
                          {own && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() => save(stage, type, null)}
                            >
                              {t("documentRules.restore")}
                            </Button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="font-semibold">{t("documentRules.history")}</h3>
          <ul className="space-y-2 text-sm">
            {data.history.map((h: any) => (
              <li key={h.id}>
                {t(
                  h.scope === "DIOCESE"
                    ? "documentRules.diocese"
                    : "documentRules.parish",
                )}
                :{" "}
                {h.changedBy
                  ? `${h.changedBy.firstName ?? ""} ${
                      h.changedBy.lastName ?? ""
                    }`.trim() || h.changedById
                  : h.changedById}
                , {new Date(h.changedAt).toLocaleString()}:{" "}
                {t(`documentRules.stages.${h.stageKind}`)},{" "}
                {labels[h.documentType as keyof typeof labels]},{" "}
                {h.previousValue
                  ? t(`documentRules.values.${h.previousValue}`)
                  : t("documentRules.inherit")}{" "}
                →{" "}
                {h.newValue
                  ? t(`documentRules.values.${h.newValue}`)
                  : t("documentRules.inherit")}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
