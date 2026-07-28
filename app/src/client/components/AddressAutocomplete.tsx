import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useViaCep } from "../hooks/useViaCep";
import CityStateSelect from "./CityStateSelect";
import { Loader2 } from "lucide-react";

export interface AddressData {
  zipCode: string;
  street: string;
  number: string;
  neighborhood: string;
  complement: string;
  city: string;
  state: string;
}

interface AddressAutocompleteProps {
  value: AddressData;
  onChange: (address: AddressData) => void;
  disabled?: boolean;
}

const formatCep = (raw: string): string => {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

/**
 * Composite address component with CEP auto-fill via ViaCEP.
 * Pure React — no external dependencies, React 19 compatible.
 */
export default function AddressAutocomplete({
  value,
  onChange,
  disabled = false,
}: AddressAutocompleteProps) {
  const { t } = useTranslation("components");
  const [autoFilledFromCep, setAutoFilledFromCep] = useState(false);
  const { data: cepData, loading: cepLoading } = useViaCep(value.zipCode);

  const cepDigits = value.zipCode.replace(/\D/g, "");
  const showFillButton =
    cepData && cepDigits.length === 8 && !autoFilledFromCep;

  const fillFromCep = useCallback(() => {
    if (!cepData) return;
    onChange({
      ...value,
      street: cepData.street || value.street,
      neighborhood: cepData.neighborhood || value.neighborhood,
      city: cepData.city || value.city,
      state: cepData.state || value.state,
      complement: cepData.complement || value.complement,
    });
    setAutoFilledFromCep(true);
  }, [cepData, value, onChange]);

  const update = (field: keyof AddressData, val: string) => {
    if (field === "zipCode") {
      setAutoFilledFromCep(false);
      onChange({ ...value, zipCode: val });
    } else {
      onChange({ ...value, [field]: val });
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setAutoFilledFromCep(false);
    onChange({ ...value, zipCode: formatted });
  };

  const inputClass =
    "flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm";

  return (
    <div className="space-y-3">
      {/* CEP */}
      <div>
        <label className="text-xs font-medium text-muted-foreground">
          {t("cep_label")}
        </label>
        <div className="flex items-center gap-2 mt-1">
          <input
            value={value.zipCode}
            onChange={handleCepChange}
            disabled={disabled}
            placeholder={t("cep_placeholder")}
            aria-label={t("cep_placeholder")}
            className={inputClass + " w-40"}
            maxLength={9}
          />
          {cepLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {showFillButton && (
            <button
              type="button"
              onClick={fillFromCep}
              className="text-xs text-brand-ink hover:underline whitespace-nowrap"
            >
              {t("address_fill")}
            </button>
          )}
        </div>
      </div>

      {/* Street + Number */}
      <div className="grid grid-cols-[1fr_100px] gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            {t("street_label")}
          </label>
          <input
            value={value.street}
            onChange={(e) => update("street", e.target.value)}
            className={inputClass + " mt-1"}
            placeholder={t("street_placeholder")}
            aria-label={t("street_label")}
            disabled={disabled}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            {t("number_label")}
          </label>
          <input
            value={value.number}
            onChange={(e) => update("number", e.target.value)}
            className={inputClass + " mt-1"}
            placeholder={t("number_placeholder")}
            aria-label={t("number_label")}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Neighborhood + Complement */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            {t("neighborhood_label")}
          </label>
          <input
            value={value.neighborhood}
            onChange={(e) => update("neighborhood", e.target.value)}
            className={inputClass + " mt-1"}
            placeholder={t("neighborhood_placeholder")}
            aria-label={t("neighborhood_label")}
            disabled={disabled}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            {t("complement_label")}
          </label>
          <input
            value={value.complement}
            onChange={(e) => update("complement", e.target.value)}
            className={inputClass + " mt-1"}
            placeholder={t("complement_placeholder")}
            aria-label={t("complement_label")}
            disabled={disabled}
          />
        </div>
      </div>

      {/* City + State (IBGE) */}
      <div>
        <label className="text-xs font-medium text-muted-foreground">
          {t("city_state_label")}
        </label>
        <div className="mt-1">
          <CityStateSelect
            city={value.city}
            state={value.state}
            onCityChange={(city) => update("city", city)}
            onStateChange={(state) => update("state", state)}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
