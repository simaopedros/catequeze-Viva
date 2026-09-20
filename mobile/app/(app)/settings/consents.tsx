import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { ConsentsScreen } from '../../../src/screens/SettingsScreens';

export default function ConsentsRoute() {
  const { api } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.consents(), []);
  return (
    <ConsentsScreen
      payload={data}
      loading={loading}
      error={error}
      onToggle={async (type: string, granted: boolean) => {
        await api.saveConsent(type, granted);
        await reload();
      }}
    />
  );
}
