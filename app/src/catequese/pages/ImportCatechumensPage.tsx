import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '../../client/components/ui/button';
import { Textarea } from '../../client/components/ui/textarea';
import { ArrowLeft, Upload, CheckCircle, AlertCircle, FileUp } from 'lucide-react';
import { AppShell } from '../AppShell';
import { importCatechumensCSV } from 'wasp/client/operations';

export default function ImportCatechumensPage() {
  const { t } = useTranslation('common');
  const [csvData, setCsvData] = useState('');
  const [results, setResults] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImport = async () => {
    if (!csvData.trim()) return;
    setImporting(true);
    setError('');
    try {
      const result = await importCatechumensCSV({ csvData });
      setResults(result);
    } catch (e: any) {
      setError(e.message || t('catechumens.import_error'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/app/catechumens"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('catechumens.import_title')}</h1>
            <p className="text-muted-foreground text-sm">{t('catechumens.import_subtitle')}</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div>
            <h3 className="font-semibold mb-1">{t('catechumens.import_format_title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('catechumens.import_format_desc')}
            </p>
            <pre className="mt-2 rounded-lg bg-muted p-3 text-xs">
{`nome,sobrenome,nascimento
João,Silva,2015-03-15
Maria,Santos,2014-07-22`}
            </pre>
          </div>

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

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          <Button onClick={handleImport} disabled={!csvData.trim() || importing}>
            <Upload className="mr-2 h-4 w-4" />
            {importing ? t('catechumens.importing') : t('import')}
          </Button>
        </div>

        {results && (
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              {t('catechumens.import_result_title')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-success/10 p-4 text-center">
                <p className="text-2xl font-bold text-success">{results.created}</p>
                <p className="text-sm text-success">{t('catechumens.import_created')}</p>
              </div>
              <div className="rounded-lg bg-destructive/10 p-4 text-center">
                <p className="text-2xl font-bold text-destructive">{results.errors}</p>
                <p className="text-sm text-destructive">{t('catechumens.import_errors')}</p>
              </div>
            </div>
            {results.details?.length > 0 && (
              <div className="text-xs text-muted-foreground space-y-1 max-h-40 overflow-y-auto">
                {results.details.map((d: string, i: number) => (
                  <p key={i}>{d}</p>
                ))}
              </div>
            )}
            <Button asChild variant="outline" className="mt-2">
              <Link to="/app/catechumens">{t('catechumens.import_view_list')}</Link>
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
