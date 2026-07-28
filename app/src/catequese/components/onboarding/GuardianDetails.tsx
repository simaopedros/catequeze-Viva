import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../client/components/ui/button";
import {
  AppDisplayTitle,
  AppGoldRule,
} from "../../../client/components/brand/AppChrome";
import { Heart, Check } from "lucide-react";
import PhoneMaskInput from "../../../client/components/PhoneMaskInput";

interface GuardianDetailsProps {
  onComplete: (data: { householdName: string; phone?: string }) => void;
}

export function GuardianDetails({ onComplete }: GuardianDetailsProps) {
  const { t } = useTranslation("onboarding");
  const [householdName, setHouseholdName] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <div className="space-y-4 rounded-sm border border-border/70 bg-white p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 shrink-0 text-brand-ink" />
          <AppDisplayTitle as="h2" className="text-lg sm:text-lg">
            {t("guardian.title")}
          </AppDisplayTitle>
        </div>
        <AppGoldRule />
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">
            {t("guardian.household_name")}
          </label>
          <input
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm mt-1"
            placeholder={t("guardian.household_placeholder")}
            aria-label={t("guardian.household_name")}
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t("guardian.phone")}</label>
          <PhoneMaskInput
            value={phone}
            onChange={setPhone}
            className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm mt-1"
            placeholder={t("guardian.phone_placeholder")}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          onClick={() =>
            onComplete({
              householdName: householdName || t("guardian.default_household"),
              phone: phone || undefined,
            })
          }
          disabled={!householdName.trim()}
        >
          <Check className="mr-2 h-4 w-4" />
          {t("coordinator.finish")}
        </Button>
      </div>
    </div>
  );
}
