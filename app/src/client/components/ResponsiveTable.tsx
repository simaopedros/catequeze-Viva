import { type ReactNode } from 'react';
import { cn } from '../utils';

export interface ResponsiveTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  headerClassName?: string;
  /** Render function for the cell value */
  render: (item: T) => ReactNode;
  /** Optional: render as a card label in mobile view */
  cardLabel?: string;
}

interface ResponsiveTableProps<T> {
  columns: ResponsiveTableColumn<T>[];
  data: T[];
  /** Unique key for each row */
  getRowKey: (item: T, index: number) => string | number;
  /** Optional: mobile card header (e.g., name + status badge) */
  renderCardHeader?: (item: T) => ReactNode;
  /** Optional: what to show when data is empty */
  emptyMessage?: string;
  /** Classes for the wrapper */
  className?: string;
  /** Classes for the table element (desktop) */
  tableClassName?: string;
  /** Row click */
  onRowClick?: (item: T) => void;
}

/**
 * Responsive table that shows standard HTML table on desktop (≥768px)
 * and stacked cards on mobile (<768px).
 */
export function ResponsiveTable<T>({
  columns,
  data,
  getRowKey,
  renderCardHeader,
  emptyMessage,
  className,
  tableClassName,
  onRowClick,
}: ResponsiveTableProps<T>) {
  if (data.length === 0 && emptyMessage) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Desktop: standard table */}
      <div className={cn('hidden md:block overflow-x-auto rounded-sm border border-border/70 bg-white', className)}>
        <table className={cn('w-full text-sm', tableClassName)}>
          <thead>
            <tr className="bg-muted/50 border-b">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'p-3 text-left font-medium text-muted-foreground whitespace-nowrap',
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
                  'border-b last:border-0 hover:bg-muted/30 transition-colors',
                  onRowClick && 'cursor-pointer',
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn('p-3 whitespace-nowrap', col.className)}
                  >
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <div className={cn('md:hidden space-y-3', className)}>
        {data.map((item, idx) => (
          <div
            key={getRowKey(item, idx)}
            className={cn(
              'rounded-sm border border-border/70 bg-white p-4 ',
              onRowClick && 'cursor-pointer active:scale-[0.98] transition-transform',
            )}
            onClick={() => onRowClick?.(item)}
          >
            {renderCardHeader && (
              <div className="mb-3 pb-3 border-b">{renderCardHeader(item)}</div>
            )}
            <dl className="space-y-2">
              {columns.map((col) => (
                <div key={col.key} className="flex justify-between items-start gap-2">
                  <dt className="text-xs text-muted-foreground shrink-0">
                    {col.cardLabel || col.header}
                  </dt>
                  <dd className="text-sm text-right">{col.render(item)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}
