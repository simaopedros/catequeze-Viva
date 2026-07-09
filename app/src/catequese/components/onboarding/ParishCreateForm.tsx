import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Church } from "lucide-react";
import { Button } from "../../../client/components/ui/button";
import {
  AppDisplayTitle,
  AppGoldRule,
} from "../../../client/components/brand/AppChrome";
import CityStateSelect from "../../../client/components/CityStateSelect";

interface ParishCreateFormProps {
  onNext: (data: { name: string; city: string; state: string }) => void;
  defaultName?: string;
  defaultCity?: string;
  defaultState?: string;
  loading?: boolean;
}

export function ParishCreateForm({
  onNext,
  defaultName = "",
  defaultCity = "",
  defaultState = "",
  loading = false,
}: ParishCreateFormProps) {
  const { t } = useTranslation("onboarding");
  const [name, setName] = useState(defaultName);
  const [city, setCity] = useState(defaultCity);
  const [state, setState] = useState(defaultState);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onNext({ name: name.trim(), city, state });
  };

  return (
    <div className="space-y-4 rounded-sm border border-border/70 bg-white p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Church className="h-5 w-5 shrink-0 text-[#071A2D]" />
          <AppDisplayTitle as="h2" className="text-lg sm:text-lg">
            {t("parish_create.title")}
          </AppDisplayTitle>
        </div>
        <AppGoldRule />
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">
            {t("parish_create.name_label")}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm mt-1"
            placeholder={t("parish_create.name_placeholder")}
          />
        </div>
        <div>
          <label className="text-sm font-medium">
            {t("parish_create.city_state")}
          </label>
          <div className="mt-1">
            <CityStateSelect
              city={city}
              state={state}
              onCityChange={setCity}
              onStateChange={setState}
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={!name.trim() || loading}>
          {loading ? t("parish_create.creating") : t("parish_create.submit")}
        </Button>
      </div>
    </div>
  );
}
