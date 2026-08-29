export type ParsedCatechumenCsvRow = {
  firstName: string;
  lastName: string;
  birthDate: string;
  familyName: string;
  className: string;
  lineNumber: number;
};

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/\s/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function parseCatechumenCsv(csvText: string): ParsedCatechumenCsvRow[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 1) return [];

  const headerCols = parseCsvLine(lines[0]).map(normalizeHeader);
  const parsedRows: ParsedCatechumenCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCsvLine(line);
    const row: Record<string, string> = {};
    headerCols.forEach((h, idx) => {
      row[h] = cols[idx] || '';
    });

    parsedRows.push({
      firstName: (row.nome || row.firstname || cols[0] || '').trim(),
      lastName: (row.sobrenome || row.lastname || cols[1] || '').trim(),
      birthDate: (
        row.nascimento ||
        row.birthdate ||
        row.datanascimento ||
        cols[2] ||
        ''
      ).trim(),
      familyName: (row.familia || row.family || row.household || '').trim(),
      className: (
        row.turma ||
        row.class ||
        row.classname ||
        row.classid ||
        ''
      ).trim(),
      lineNumber: i + 1,
    });
  }
  return parsedRows;
}

export function parseBirthDateUtc(value: string): Date | null {
  if (!value) return null;
  const iso = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  }
  const br = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (br) {
    const day = Number(br[1]);
    const month = Number(br[2]);
    const year = Number(br[3]);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }
  return null;
}
