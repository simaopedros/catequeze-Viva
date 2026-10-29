import { useTranslation } from "react-i18next";
import { DOCUMENT_STAGES } from "../../shared/documents/requirements";
export function DocumentStageSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation("common");
  return (
    <label className="block space-y-1 text-sm">
      {t("documentRules.stage")}
      <select
        className="block w-full rounded border bg-background p-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{t("documentRules.automatic")}</option>
        {DOCUMENT_STAGES.map((stage) => (
          <option key={stage} value={stage}>
            {t(`documentRules.stages.${stage}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
