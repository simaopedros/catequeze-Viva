import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useFeedback } from '../../src/components/Feedback';
import { useAsync } from '../../src/hooks/useAsync';
import { shareTextFile } from '../../src/screens/exportFile';
import { ReportsScreen, reportsToCsv } from '../../src/screens/ReportsScreen';

export default function ReportsRoute() {
  const { api, workspaceId } = useAuth();
  const { notify } = useFeedback();
  const router = useRouter();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.reportsOverview(workspaceId || undefined), [workspaceId]);
  const [exporting, setExporting] = useState(false);

  return (
    <ReportsScreen
      data={data}
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={() => void reload()}
      onOpenClass={(id) => router.push(`/(app)/class/${id}`)}
      exporting={exporting}
      onExportCsv={async () => {
        if (!data?.classReports) return;
        setExporting(true);
        try {
          await shareTextFile(`relatorio-presencas-${new Date().toISOString().slice(0, 10)}.csv`, reportsToCsv(data.classReports));
          notify('Relatório exportado.', 'success');
        } catch (err) {
          notify(err instanceof Error ? err.message : 'Não foi possível exportar.', 'error');
        } finally {
          setExporting(false);
        }
      }}
    />
  );
}
