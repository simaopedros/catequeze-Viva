import { useAuth } from '../../../src/auth/AuthContext';
import { copy } from '../../../src/copy/ptBR';
import { useAsync } from '../../../src/hooks/useAsync';
import { SettingsScreen } from '../../../src/screens/SettingsScreens';
import React, { useEffect, useState } from 'react';

export default function SettingsRoute() {
  const { api, user, refresh } = useAuth();
  const prefs = useAsync(() => api.emailPrefs(), []);
  const twoFactor = useAsync(() => api.twoFactorStatus(), []);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setPhone(user?.phone || '');
  }, [user]);

  return (
    <SettingsScreen
      firstName={firstName}
      lastName={lastName}
      phone={phone}
      onFirstName={setFirstName}
      onLastName={setLastName}
      onPhone={setPhone}
      currentPassword={currentPassword}
      newPassword={newPassword}
      onCurrentPassword={setCurrentPassword}
      onNewPassword={setNewPassword}
      prefs={prefs.data}
      twoFactorEnabled={Boolean(twoFactor.data?.twoFactor?.enabled || twoFactor.data?.enabled)}
      twoFactorSecret={twoFactorSecret}
      twoFactorCode={twoFactorCode}
      onTwoFactorCode={setTwoFactorCode}
      saving={saving}
      error={error}
      onSaveProfile={async () => {
        setSaving(true);
        setError(null);
        try {
          await api.updateProfile({ firstName, lastName, phone });
          await refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : copy.settings.saved);
        } finally {
          setSaving(false);
        }
      }}
      onChangePassword={async () => {
        setSaving(true);
        setError(null);
        try {
          await api.changePassword({ currentPassword, newPassword });
          setCurrentPassword('');
          setNewPassword('');
        } catch (err) {
          setError(err instanceof Error ? err.message : copy.catalog.error);
        } finally {
          setSaving(false);
        }
      }}
      onTogglePref={async (topic, optedIn) => {
        await api.updateEmailPref(topic, optedIn);
        await prefs.reload();
      }}
      onStartTwoFactor={async () => {
        const result = await api.startTwoFactorSetup();
        setTwoFactorSecret(result.secret || result.uri || '');
      }}
      onConfirmTwoFactor={async () => {
        await api.confirmTwoFactorSetup(twoFactorCode);
        setTwoFactorCode('');
        setTwoFactorSecret(null);
        await twoFactor.reload();
      }}
      onDisableTwoFactor={async () => {
        await api.disableTwoFactor(twoFactorCode);
        setTwoFactorCode('');
        await twoFactor.reload();
      }}
    />
  );
}
