import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BRAZILIAN_STATES, useIbgeCities } from "../hooks/useIbgeCities";

interface CityStateSelectProps {
  city: string;
  state: string;
  onCityChange: (city: string) => void;
  onStateChange: (state: string) => void;
  disabled?: boolean;
}

/**
 * Compact component: State (UF) select + City search/select backed by IBGE API.
 * Used in onboarding flows and parish forms where full address is not needed.
 * The UF select is a simple static dropdown (27 states).
 * The city field is a text input that loads matching cities from IBGE on demand.
 */
export default function CityStateSelect({
  city,
  state,
  onCityChange,
  onStateChange,
  disabled = false,
}: CityStateSelectProps) {
  const { t } = useTranslation("components");
  const [cityInput, setCityInput] = useState(city);
  const [showDropdown, setShowDropdown] = useState(false);
  const { cities, loading: loadingCities } = useIbgeCities(state, cityInput);

  // When parent changes city prop, sync local input
  const displayCity = city || cityInput;

  const inputClass =
    "flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm";

  return (
    <div className="grid grid-cols-[100px_1fr] gap-3">
      {/* UF Select */}
      <select
        value={state}
        onChange={(e) => onStateChange(e.target.value)}
        className={inputClass}
        disabled={disabled}
      >
        <option value="">UF</option>
        {BRAZILIAN_STATES.map((s) => (
          <option key={s.uf} value={s.uf}>
            {s.uf}
          </option>
        ))}
      </select>

      {/* City input with dropdown */}
      <div className="relative">
        <input
          value={displayCity}
          onChange={(e) => {
            setCityInput(e.target.value);
            onCityChange(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          className={inputClass}
          placeholder={t("city_placeholder")}
          aria-label={t("city_placeholder")}
          disabled={disabled}
        />
        {showDropdown && cities.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-sm border bg-white shadow-sm max-h-48 overflow-y-auto">
            {loadingCities && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                {t("loading")}
              </div>
            )}
            {cities.slice(0, 50).map((c) => (
              <button
                key={c.id}
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-brand-ink transition-colors hover:bg-muted/40 hover:text-brand-ink-soft"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setCityInput(c.name);
                  onCityChange(c.name);
                  setShowDropdown(false);
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
