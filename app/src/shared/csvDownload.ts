/** Client-side CSV download (runs in the authenticated user's browser only). */

function escapeCsvCell(value: unknown): string {
  const raw = String(value ?? "");
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsvContent(rows: unknown[][]): string {
  return "\uFEFF" + rows.map((r) => r.map(escapeCsvCell).join(",")).join("\n");
}

export function downloadCsv(filename: string, rows: unknown[][]): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([toCsvContent(rows)], {
    type: "text/csv;charset=utf-8",
  });
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
