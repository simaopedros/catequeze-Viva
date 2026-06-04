import { useCallback } from 'react';

interface PhoneMaskInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Input with automatic Brazilian phone mask.
 * Detects mobile (11 digits) vs landline (10 digits).
 * Format: (00) 00000-0000 (mobile) or (00) 0000-0000 (landline).
 * Pure React — no external dependencies, React 19 compatible.
 */
export default function PhoneMaskInput({
  value,
  onChange,
  placeholder = '(00) 00000-0000',
  disabled = false,
  className,
}: PhoneMaskInputProps) {
  const formatPhone = useCallback((raw: string): string => {
    const digits = raw.replace(/\D/g, '');
    const len = digits.length;

    if (len <= 2) return digits;
    if (len <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (len <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    // 11 digits (mobile)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '');
    // Limit to 11 digits
    const limited = digits.slice(0, 11);
    const formatted = formatPhone(limited);
    onChange(formatted);
  };

  return (
    <input
      type="tel"
      value={value}
      onChange={handleChange}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      maxLength={15}
    />
  );
}
