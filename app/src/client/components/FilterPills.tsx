import { useTranslation } from "react-i18next";
import { cn } from "../utils";
import { X } from "lucide-react";

export interface FilterPillOption {
  value: string;
  label: React.ReactNode;
  /** Optional count badge shown after the label */
  count?: number;
}

interface FilterPillsProps {
  options: FilterPillOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** When provided, shows a "Limpar" pill that resets to this value */
  onClear?: () => void;
  /** The value that represents "all" (no filter) — used to hide clear when already clear */
  clearValue?: string;
}

export function FilterPills({
  options,
  value,
  onChange,
  className,
  onClear,
  clearValue,
}: FilterPillsProps) {
  const { t } = useTranslation("common");
  const showClear = onClear && value !== clearValue;

  return (
    <div
      className={cn(
        "flex gap-1.5 overflow-x-auto no-scrollbar scroll-touch snap-x snap-mandatory -mx-1 px-1 items-center",
        className,
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={cn(
            // min-h-11 no mobile: com py-1.5 a pílula ficava em 28px, bem abaixo
            // dos 44px de alvo de toque. No desktop volta ao tamanho compacto.
            "inline-flex shrink-0 snap-start items-center whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium transition-colors min-h-11 sm:min-h-0",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            value === opt.value
              ? "bg-brand-ink text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-brand-ink",
          )}
        >
          {opt.label}
          {opt.count !== undefined && (
            <span
              className={cn(
                "ml-1.5 inline-flex items-center justify-center rounded-sm px-1.5 py-0 text-overline font-medium",
                value === opt.value
                  ? "bg-white/15 text-white"
                  : "bg-muted-foreground/15 text-muted-foreground",
              )}
            >
              {opt.count}
            </span>
          )}
        </button>
      ))}
      {showClear && (
        <button
          type="button"
          onClick={onClear}
          className="flex min-h-11 shrink-0 snap-start items-center gap-1 whitespace-nowrap rounded-sm bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-brand-ink sm:min-h-0"
        >
          <X className="h-3 w-3" />
          {t("clear")}
        </button>
      )}
    </div>
  );
}
