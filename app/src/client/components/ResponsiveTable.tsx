import { type ReactNode } from "react";
import { cn } from "../utils";
import type { MobileCardField } from "../../shared/uiPresentation";

export interface ResponsiveTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  headerClassName?: string;
  /** Render function for the cell value */
  render: (item: T) => ReactNode;
  /** Optional: render as a card label in mobile view */
  cardLabel?: string;
  /** Hide this column from the default mobile field list */
  hideOnMobile?: boolean;
  /** Essential first line on the mobile card */
  mobileTitle?: boolean;
  /** Secondary information; at most two are rendered by default */
  mobileMetadata?: boolean;
  /** Contextual next action, rendered after metadata */
  mobileAction?: boolean;
}

interface ResponsiveTableProps<T> {
  columns: ResponsiveTableColumn<T>[];
  data: T[];
  /** Unique key for each row */
  getRowKey: (item: T, index: number) => string | number;
  /** Optional: mobile card header (e.g., name + status badge) */
  renderCardHeader?: (item: T) => ReactNode;
  /**
   * Explicit mobile card body. Prefer this over auto field list for
   * operational lists (name, status, next action, 1–2 meta fields).
   */
  renderMobileCard?: (item: T) => ReactNode;
  /** Structured mobile fields when renderMobileCard is not provided */
  mobileFields?: MobileCardField<T, ReactNode>[];
  /** Optional: what to show when data is empty */
  emptyMessage?: string;
  /** Classes for the wrapper */
  className?: string;
  /** Classes for the table element (desktop) */
  tableClassName?: string;
  /** Row click — whole card/row is the target */
  onRowClick?: (item: T) => void;
  /** When true, mobile cards omit per-field labels (use for dense lists) */
  compactMobile?: boolean;
}

/**
 * Responsive table: desktop HTML table; mobile cards/lists.
 * Pass `renderMobileCard` for designed mobile presentation;
 * reserve horizontal scroll for genuinely comparative tables only.
 */
export function ResponsiveTable<T>({
  columns,
  data,
  getRowKey,
  renderCardHeader,
  renderMobileCard,
  mobileFields,
  emptyMessage,
  className,
  tableClassName,
  onRowClick,
  compactMobile,
}: ResponsiveTableProps<T>) {
  if (data.length === 0 && emptyMessage) {
    return (
      <div className="py-10 text-center text-sm font-semibold tracking-tight text-brand-ink">
        {emptyMessage}
      </div>
    );
  }

  const visibleMobileColumns = columns.filter((column) => !column.hideOnMobile);
  const hasMobilePriority = visibleMobileColumns.some(
    (column) =>
      column.mobileTitle || column.mobileMetadata || column.mobileAction,
  );
  const defaultMobileColumns = hasMobilePriority
    ? [
        visibleMobileColumns.find((column) => column.mobileTitle),
        ...visibleMobileColumns
          .filter((column) => column.mobileMetadata)
          .slice(0, 2),
        visibleMobileColumns.find((column) => column.mobileAction),
      ].filter((column): column is ResponsiveTableColumn<T> => Boolean(column))
    : visibleMobileColumns.slice(0, 3);

  return (
    <>
      {/* Desktop: standard table */}
      <div
        className={cn(
          "hidden md:block overflow-x-auto rounded-sm border border-border/70 bg-surface-elevated",
          className,
        )}
      >
        <table className={cn("w-full text-sm", tableClassName)}>
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "whitespace-nowrap p-3 text-left text-[11px] font-medium tracking-wide text-muted-foreground",
                    col.headerClassName,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr
                key={getRowKey(item, idx)}
                className={cn(
                  "border-b last:border-0 hover:bg-muted/30 transition-colors",
                  onRowClick && "cursor-pointer",
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn("p-3 whitespace-nowrap", col.className)}
                  >
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: designed cards / expandable rows */}
      <div className={cn("md:hidden space-y-3", className)} role="list">
        {data.map((item, idx) => {
          const interactive = Boolean(onRowClick);
          return (
            <div
              key={getRowKey(item, idx)}
              role="listitem"
              className={cn(
                "rounded-sm border border-border/70 bg-surface-elevated p-3.5",
                interactive &&
                  "cursor-pointer active:scale-[0.99] transition-transform motion-reduce:transition-none motion-reduce:active:scale-100",
                interactive &&
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              onClick={() => onRowClick?.(item)}
              onKeyDown={
                interactive
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick?.(item);
                      }
                    }
                  : undefined
              }
              tabIndex={interactive ? 0 : undefined}
            >
              {renderMobileCard ? (
                renderMobileCard(item)
              ) : (
                <>
                  {renderCardHeader && (
                    <div className="mb-3 border-b border-border/60 pb-3">
                      {renderCardHeader(item)}
                    </div>
                  )}
                  {mobileFields ? (
                    <dl className="space-y-2">
                      {mobileFields.map((field) => (
                        <div
                          key={field.key}
                          className={cn(
                            "flex justify-between gap-2",
                            field.prominence === "title" &&
                              "flex-col items-start",
                          )}
                        >
                          {field.label && !compactMobile && (
                            <dt className="shrink-0 text-xs text-muted-foreground">
                              {field.label}
                            </dt>
                          )}
                          <dd
                            className={cn(
                              "text-sm text-right",
                              field.prominence === "title" &&
                                "text-left text-base font-semibold text-brand-ink",
                            )}
                          >
                            {field.render(item)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <dl className="space-y-2">
                      {defaultMobileColumns.map((col) => (
                        <div
                          key={col.key}
                          className="flex items-start justify-between gap-2"
                        >
                          {!compactMobile && (
                            <dt className="shrink-0 text-xs text-muted-foreground">
                              {col.cardLabel || col.header}
                            </dt>
                          )}
                          <dd className="text-sm text-right">
                            {col.render(item)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
