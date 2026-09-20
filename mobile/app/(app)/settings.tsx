import React, { useState } from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useFeedback } from '../../src/components/Feedback';
import { useAsync } from '../../src/hooks/useAsync';
import { useMutation } from '../../src/hooks/useMutation';
import { SettingsScreen } from '../../src/screens/SettingsScreen';

export default function SettingsRoute() {
  const { api, user, refresh } = useAuth();
  const { notify } = useFeedback();
  const prefs = useAsync(() => api.emailPreferences().catch(() => null), []);
  const twoFactor = useAsync(() => api.twoFactorDetails().catch(() => null), []);
  const consents = useAsync(async () => {
    const rows = await api.consents().catch(() => []);
    const map: Record<string, boolean> = {};
    (Array.isArray(rows) ? rows : []).forEach((row: { type?: string; granted?: boolean }) => {
      if (row?.type) map[row.type] = Boolean(row.granted);
    });
    return map;
  }, []);
  const [setup, setSetup] = useState<{ secret?: string; otpauthUrl?: string } | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const saveProfile = useMutation((values: { firstName: string; lastName: string; phone?: string }) => api.updateProfile(values), {
    successMessage: 'Perfil guardado.',
    onSuccess: () => refresh().catch(() => undefined),
  });
  const startTwoFactor = useMutation(() => api.twoFactorStart(), {
    onSuccess: (result) => setSetup({ secret: result.secret as string | undefined, otpauthUrl: (result.otpauthUrl ?? result.uri) as string | undefined }),
  });
  const verifyTwoFactor = useMutation((token: string) => api.twoFactorVerifySetup(token), {
    successMessage: 'Verificação em dois passos ativada.',
    onSuccess: async () => {
      setSetup(null);
      await twoFactor.reload();
      await refresh().catch(() => undefined);
    },
  });
  const disableTwoFactor = useMutation((token: string) => api.twoFactorDisable(token), {
    successMessage: 'Verificação em dois passos desativada.',
    onSuccess: () => void twoFactor.reload(),
  });
  const dataExport = useMutation(() => api.requestDataExport(), { successMessage: 'Pedido registado. Vai receber um e-mail.' });

  return (
    <SettingsScreen
      user={user}
      loading={!user}
      onSaveProfile={(values) => saveProfile.run(values).then(() => undefined)}
      savingProfile={saveProfile.busy}
      profileError={saveProfile.error}
      onChangePassword={async (currentPassword, newPassword) => {
        setChangingPassword(true);
        setPasswordError(null);
        try {
          await api.changePassword(currentPassword, newPassword);
          notify('Palavra-passe alterada.', 'success');
          return true;
        } catch (err) {
          setPasswordError(err instanceof Error ? err.message : 'Não foi possível alterar a palavra-passe.');
          return false;
        } finally {
          setChangingPassword(false);
        }
      }}
      changingPassword={changingPassword}
      passwordError={passwordError}
      emailPreferences={prefs.data}
      onTogglePreference={async (topic, optedIn) => {
        try {
          await api.updateEmailPreference(topic, optedIn);
          await prefs.reload();
        } catch (err) {
          notify(err instanceof Error ? err.message : 'Não foi possível guardar a preferência.', 'error');
        }
      }}
      twoFactor={twoFactor.data}
      twoFactorSetup={setup}
      onStartTwoFactor={() => void startTwoFactor.run()}
      onVerifyTwoFactor={(token) => verifyTwoFactor.run(token).then(() => undefined)}
      onDisableTwoFactor={(token) => disableTwoFactor.run(token).then(() => undefined)}
      twoFactorBusy={startTwoFactor.busy || verifyTwoFactor.busy || disableTwoFactor.busy}
      twoFactorError={startTwoFactor.error ?? verifyTwoFactor.error ?? disableTwoFactor.error}
      onRequestDataExport={() => void dataExport.run()}
      exporting={dataExport.busy}
      consents={consents.data ?? {}}
      consentError={consentError}
      onToggleConsent={async (type, granted) => {
        setConsentError(null);
        try {
          await api.saveConsent(type, granted);
          await consents.reload();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Não foi possível guardar o consentimento.';
          setConsentError(message);
          notify(message, 'error');
        }
      }}
    />
  );
}
