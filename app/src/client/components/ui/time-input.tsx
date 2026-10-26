import * as React from "react";
import { useTranslation } from "react-i18next";
import { Input } from "./input";
import { maskTime24h } from "../../../shared/timeMask";

type TimeInputProps = Omit<React.ComponentProps<typeof Input>, "type">;

/**
 * 24-hour HH:MM field. Native `type="time"` follows the OS locale, which shows
 * AM/PM on many Brazilian devices.
 */
export function TimeInput({ onChange, placeholder, ...props }: TimeInputProps) {
  const { t } = useTranslation("common");
  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      maxLength={5}
      pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
      placeholder={placeholder ?? "19:30"}
      data-pattern-message={t("validation.native_time")}
      {...props}
      onChange={(e) => {
        e.target.value = maskTime24h(e.target.value);
        onChange?.(e);
      }}
    />
  );
}
