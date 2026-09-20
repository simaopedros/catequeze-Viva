import { useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { copy } from '../../../src/copy/ptBR';
import { FormScreen } from '../../../src/screens/CatalogListScreen';

export default function InvitesRoute() {
  const { api, workspaceId } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('GUARDIAN');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <FormScreen
        title={copy.people.invitesTitle}
        busy={busy}
        error={error}
        submitLabel={copy.people.sendInvite}
        fields={[
          { key: 'email', label: copy.people.inviteEmail, value: email, onChange: setEmail },
          { key: 'role', label: copy.people.inviteRole, value: role, onChange: setRole },
        ]}
        onSubmit={async () => {
          if (!workspaceId) return;
          setBusy(true);
          setError(null);
          try {
            await api.invite({ email, parishId: workspaceId, role });
            setEmail('');
          } catch (err) {
            setError(err instanceof Error ? err.message : copy.catalog.error);
          } finally {
            setBusy(false);
          }
        }}
      />
  );
}
