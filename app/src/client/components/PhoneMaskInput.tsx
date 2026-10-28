import { useCallback } from "react";
import {
  formatBrazilianPhone,
  formatInternationalPhone,
  isInternationalPhoneInput,
} from "../../shared/phoneFormat";

interface PhoneMaskInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type" | "maxLength"
  > {
  value: string;
  /** Receives the masked (or international) value, not only raw digits. */
  onChange: (value: string) => void;
}

/**
 * Phone input: Brazilian mask by default; if the value starts with +, keep
 * international E.164-style input without forcing BR formatting.
 */
export default function PhoneMaskInput({
  value,
  onChange,
  placeholder = "(00) 00000-0000",
  disabled = false,
  className,
  ...props
}: PhoneMaskInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (isInternationalPhoneInput(raw)) {
        onChange(formatInternationalPhone(raw));
        return;
      }
      const digits = raw.replace(/\D/g, "");
      onChange(formatBrazilianPhone(digits));
    },
    [onChange],
  );

  const international = isInternationalPhoneInput(value);

  return (
    <input
      type="tel"
      value={value}
      onChange={handleChange}
      disabled={disabled}
      placeholder={international ? "+351 912 345 678" : placeholder}
      className={className}
      maxLength={international ? 20 : 15}
      inputMode="tel"
      {...props}
    />
  );
}
