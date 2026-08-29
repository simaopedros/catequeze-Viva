import { useEffect, useState } from "react";
import { useLocale } from "../../i18n/useLocale";
import { displayDateToIso, isoToDisplayDate } from "../../shared/displayDate";

type LocalizedDateInputProps = {
  value: string;
  onChange: (isoDate: string) => void;
  className?: string;
  "aria-label"?: string;
};

export function LocalizedDateInput({
  value,
  onChange,
  className,
  "aria-label": ariaLabel,
}: LocalizedDateInputProps) {
  const { currentLocale } = useLocale();
  const [text, setText] = useState(isoToDisplayDate(value, currentLocale));

  useEffect(() => {
    setText(isoToDisplayDate(value, currentLocale));
  }, [value, currentLocale]);

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={
        currentLocale.startsWith("en") ? "MM/DD/YYYY" : "DD/MM/AAAA"
      }
      aria-label={ariaLabel}
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        const iso = displayDateToIso(next, currentLocale);
        if (iso) onChange(iso);
      }}
      onBlur={() => {
        const iso = displayDateToIso(text, currentLocale);
        if (iso) {
          onChange(iso);
          setText(isoToDisplayDate(iso, currentLocale));
        } else {
          setText(isoToDisplayDate(value, currentLocale));
        }
      }}
      className={className}
    />
  );
}
