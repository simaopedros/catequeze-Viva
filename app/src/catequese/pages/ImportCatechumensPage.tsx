import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '../../client/components/ui/button';
import { Textarea } from '../../client/components/ui/textarea';
import { ArrowLeft, Upload, CheckCircle, AlertCircle, FileUp, Eye } from 'lucide-react';
import { useQuery, importCatechumensCSV, listParishes } from 'wasp/client/operations';
import { useUserContext } from '../../client/hooks/useUserContext';
import { useActiveParish } from '../../client/hooks/useActiveParish';
import { AppPageHeader, AppPanel } from '../../client/components/brand/AppChrome';

function parseCSVLine(line: string): string[] {
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

function parseCSV(csvText: string) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 1) return [];

  const headerLine = lines[0];
  const headerCols = parseCSVLine(headerLine).map(h => h.toLowerCase().replace(/\s/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  const dataLines = lines.slice(1);
  const parsedRows: any[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    const row: Record<string, string> = {};
    headerCols.forEach((h, idx) => { row[h] = cols[idx] || ''; });

    const firstName = row['nome'] || row['firstname'] || row['firstName'] || cols[0] || '';
    const lastName = row['sobrenome'] || row['lastname'] || row['lastName'] || cols[1] || '';
    const birthDateStr = row['nascimento'] || row['birthdate'] || row['birthDate'] || row['datanascimento'] || cols[2] || '';
    const familyName = row['familia'] || row['family'] || row['household'] || '';

    parsedRows.push({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDate: birthDateStr.trim(),
      familyName: familyName.trim(),
      lineNumber: i + 2,
    });
  }
  return parsedRows;
}

export default function ImportCatechumensPage() {
  const { t } = useTranslation('common');
  const [csvData, setCsvData] = useState('');
  const [results, setResults] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { userRole } = useUserContext();
  const { activeParishId } = useActiveParish();
  const { data: parishes = [] } = useQuery(listParishes);
  const [selectedParishId, setSelectedParishId] = useState('');

  const showParishSelector = useMemo(() => {
    return ['SUPER_ADMIN', 'DIOCESE_ADMIN'].includes(userRole) && parishes.length > 1;
  }, [userRole, parishes]);

  useEffect(() => {
    if (activeParishId) {
      setSelectedParishId(activeParishId);
    } else if (parishes.length > 0) {
      setSelectedParishId(parishes[0].id);
    }
  }, [activeParishId, parishes]);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setCsvData(e.target?.result as string || '');
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      handleFile(file);
    } else {
      setError(t('catechumens.import_invalid_csv'));
    }
  }, [handleFile, t]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const previewRows = useMemo(() => {
    if (!csvData.trim()) return [];
    try {
      return parseCSV(csvData);
    } catch {
      return [];
    }
  }, [csvData]);

  const handleImport = async () => {
    if (!csvData.trim()) return;
    setImporting(true);
    setError('');
    try {
      const result = await importCatechumensCSV({
        csvData,
        parishId: showParishSelector ? selectedParishId : undefined,
      });
      setResults(result);
    } catch (e: any) {
      setError(e.message || t('catechumens.import_error'));
    } finally {
      setImporting(false);
    }
  };

  return (
      <div className="mx-auto max-w-2xl space-y-8">
        <AppPageHeader
          eyebrow={t('catechumens.import_title')}
          title={t('catechumens.import_title')}
          subtitle={t('catechumens.import_subtitle')}
          actions={
            <Button variant="outline" size="sm" className="h-10 rounded-sm" asChild>
              <Link to="/app/catechumens">
                <ArrowLeft className="mr-1 h-4 w-4" />
                {t('back')}
              </Link>
            </Button>
          }
        />

        <AppPanel className="space-y-4">
          <div>
            <h3 className="font-semibold mb-1">{t('catechumens.import_format_title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('catechumens.import_format_desc')}
            </p>
            <pre className="mt-2 rounded-lg bg-muted p-3 text-xs">
{`nome,sobrenome,nascimento,familia
João,Silva,2015-03-15,Silva Santos
Maria,Santos,2014-07-22,Silva Santos`}
            </pre>
          </div>

          {showParishSelector && (
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('parish') || 'Paróquia'}</label>
              <select
                value={selectedParishId}
                onChange={(e) => setSelectedParishId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
              >
                {parishes.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">{t('catechumens.import_csv_label')}</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-1 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer ${
    dragOver
     ? 'border-primary bg-primary/5'
     : 'border-muted-foreground/25 hover:border-muted-foreground/50 bg-muted/20'
    }`}
            >
              <FileUp className={`h-8 w-8 mb-2 ${dragOver ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className="text-sm text-muted-foreground text-center">
                {dragOver ? t('catechumens.import_drag_over') : t('catechumens.import_drag_hint')}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            <Textarea
              value={csvData}
              onChange={e => setCsvData(e.target.value)}
              className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2 font-mono"
              placeholder={t('catechumens.import_csv_placeholder')}
            />
          </div>

          {previewRows.length > 0 && (
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-primary" />
                  {t('catechumens.import_preview') || 'Visualização dos Dados'} ({previewRows.length} {t('catechumens.rows') || 'linhas'})
                </h4>
              </div>
              <div className="overflow-x-auto max-h-60 rounded-md border bg-background">
                <table className="min-w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground uppercase font-semibold border-b">
                    <tr>
                      <th className="px-3 py-2">{t('catechumens.line') || 'Linha'}</th>
                      <th className="px-3 py-2">{t('first_name')}</th>
                      <th className="px-3 py-2">{t('last_name')}</th>
                      <th className="px-3 py-2">{t('catechumens.birth_short')}</th>
                      <th className="px-3 py-2">{t('catechumens.family')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewRows.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className="hover:bg-muted/10">
                        <td className="px-3 py-2 text-muted-foreground">{row.lineNumber}</td>
                        <td className="px-3 py-2 font-medium">{row.firstName || <span className="text-destructive font-normal">{t('catechumens.empty') || 'Vazio'}</span>}</td>
                        <td className="px-3 py-2">{row.lastName}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.birthDate || '-'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.familyName || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewRows.length > 50 && (
                <p className="text-xs text-muted-foreground italic text-center">
                  {t('catechumens.preview_showing_limit', { total: previewRows.length })}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          <Button className="h-10 rounded-sm shadow-none" onClick={handleImport} disabled={!csvData.trim() || importing}>
            <Upload className="mr-2 h-4 w-4" />
            {importing ? t('catechumens.importing') : t('import')}
          </Button>
        </AppPanel>

        {results && (
          <div className="rounded-sm border border-border/70 bg-white p-6 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              {t('catechumens.import_result_title')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-green-500/10 p-4 text-center">
                <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">{results.created}</p>
                <p className="text-sm text-green-600">{t('catechumens.import_created')}</p>
              </div>
              <div className="rounded-lg bg-destructive/10 p-4 text-center">
                <p className="text-2xl font-semibold tracking-tight tabular-nums text-destructive">{results.errors}</p>
                <p className="text-sm text-destructive">{t('catechumens.import_errors')}</p>
              </div>
            </div>
            {results.details?.length > 0 && (
              <div className="text-xs text-muted-foreground space-y-1 max-h-40 overflow-y-auto border p-2 rounded-lg bg-muted/10 font-mono">
                {results.details.map((d: string, i: number) => (
                  <p key={i}>{d}</p>
                ))}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button asChild className="flex-1">
                <Link to="/app/families">{t('families.view_families_cta') || 'Vincular a Famílias'}</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link to="/app/catechumens">{t('catechumens.import_view_list')}</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
  );
}
