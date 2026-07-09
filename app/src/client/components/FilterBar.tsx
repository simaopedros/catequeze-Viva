import type { ChangeEvent, ReactNode } from "react";
import { cn } from "../utils";
import { SearchInput } from "./SearchInput";
import { FilterPills, type FilterPillOption } from "./FilterPills";

interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  filters?: {
    label?: string;
    options: FilterPillOption[];
    value: string;
    onChange: (value: string) => void;
  }[];
  actions?: ReactNode;
  className?: string;
}

export function FilterBar({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  filters,
  actions,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row gap-3 items-start sm:items-center",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
        {onSearchChange && (
          <SearchInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={onSearchChange}
            className="max-w-xs"
          />
        )}
        {filters?.map((filter, i) => (
          <div key={i} className="flex items-center gap-2">
            {filter.label && (
              <span className="text-body-xs text-text-secondary shrink-0">
                {filter.label}
              </span>
            )}
            <FilterPills
              options={filter.options}
              value={filter.value}
              onChange={filter.onChange}
            />
          </div>
        ))}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
