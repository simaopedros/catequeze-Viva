import React, { useState } from 'react';
import { BrandButton, ErrorState, Field, GroupedList, ListRow, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { copy } from '../copy/ptBR';
import { asItems } from '../format';

export function SettingsScreen({
  firstName,
  lastName,
  phone,
  onFirstName,
  onLastName,
  onPhone,
  onSaveProfile,
  currentPassword,
  newPassword,
  onCurrentPassword,
  onNewPassword,
  onChangePassword,
  prefs,
  onTogglePref,
  twoFactorEnabled,
  twoFactorSecret,
  twoFactorCode,
  onTwoFactorCode,
  onStartTwoFactor,
  onConfirmTwoFactor,
  onDisableTwoFactor,
  saving,
  error,
}: {
  firstName: string;
  lastName: string;
  phone: string;
  onFirstName: (value: string) => void;
  onLastName: (value: string) => void;
  onPhone: (value: string) => void;
  onSaveProfile: () => void;
  currentPassword: string;
  newPassword: string;
  onCurrentPassword: (value: string) => void;
  onNewPassword: (value: string) => void;
  onChangePassword: () => void;
  prefs?: Record<string, boolean> | { items?: { topic: string; optedIn: boolean }[] } | any;
  onTogglePref?: (topic: string, optedIn: boolean) => void;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
  twoFactorCode?: string;
  onTwoFactorCode?: (value: string) => void;
  onStartTwoFactor?: () => void;
  onConfirmTwoFactor?: () => void;
  onDisableTwoFactor?: () => void;
  saving?: boolean;
  error?: string | null;
}) {
  return (
    <Screen testID="settings-screen">
      <ScreenTitle title={copy.settings.title} />
      {error ? <ErrorState title={copy.catalog.error} body={error} /> : null}
      <Field label={copy.signup.firstName} value={firstName} onChangeText={onFirstName} />
      <Field label={copy.signup.lastName} value={lastName} onChangeText={onLastName} />
      <Field label="Telefone" value={phone} onChangeText={onPhone} />
      <BrandButton label={saving ? copy.common.saving : copy.settings.profile} onPress={onSaveProfile} disabled={saving} />
      <Field label={copy.settings.currentPassword} value={currentPassword} onChangeText={onCurrentPassword} secureTextEntry />
      <Field label={copy.settings.newPassword} value={newPassword} onChangeText={onNewPassword} secureTextEntry />
      <BrandButton variant="ghost" label={copy.settings.password} onPress={onChangePassword} />
      {prefs ? (
        <GroupedList header={copy.settings.emailPrefs}>
          {(Array.isArray(prefs)
            ? prefs
            : Array.isArray(prefs.items)
              ? prefs.items
              : Object.entries(prefs).map(([topic, optedIn]) => ({ topic, optedIn }))
          ).map((item: any) => (
            <ListRow
              key={item.topic || item.key}
              title={item.topic || item.key}
              meta={item.optedIn ? copy.settings.granted : copy.settings.denied}
              onPress={() => onTogglePref?.(item.topic || item.key, !item.optedIn)}
            />
          ))}
        </GroupedList>
      ) : null}
      <GroupedList header={copy.settings.twoFactor}>
        <ListRow
          title={twoFactorEnabled ? copy.settings.twoFactorEnabled : copy.settings.twoFactorOff}
          accessory={false}
        />
      </GroupedList>
      {twoFactorSecret ? (
        <Field label={copy.settings.twoFactorSecret} value={twoFactorSecret} editable={false} />
      ) : null}
      <Field
        label={copy.auth.code}
        value={twoFactorCode || ''}
        onChangeText={onTwoFactorCode}
        keyboardType="number-pad"
        maxLength={6}
      />
      {twoFactorEnabled ? (
        <BrandButton variant="ghost" label={copy.settings.twoFactorDisable} onPress={() => onDisableTwoFactor?.()} />
      ) : twoFactorSecret ? (
        <BrandButton label={copy.settings.twoFactorConfirm} onPress={() => onConfirmTwoFactor?.()} />
      ) : (
        <BrandButton variant="ghost" label={copy.settings.twoFactorStart} onPress={() => onStartTwoFactor?.()} />
      )}
    </Screen>
  );
}

export function ConsentsScreen({
  payload,
  loading,
  error,
  onToggle,
}: {
  payload: unknown;
  loading?: boolean;
  error?: string | null;
  onToggle: (type: string, granted: boolean) => void;
}) {
  const items = asItems(payload);
  return (
    <Screen>
      <ScreenTitle title={copy.settings.consents} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.catalog.error} body={error} /> : null}
      <GroupedList>
        {items.map((item: any) => (
          <ListRow
            key={item.id || item.type}
            title={item.type}
            meta={item.granted ? copy.settings.granted : copy.settings.denied}
            onPress={() => onToggle(item.type, !item.granted)}
          />
        ))}
      </GroupedList>
    </Screen>
  );
}

export function OnboardingScreen({
  onCoordinator,
  onMember,
  busy,
  error,
}: {
  onCoordinator: (payload: { parishName: string; parishCity?: string; parishState?: string; yearName: string; yearStart: string; yearEnd: string; className?: string }) => void;
  onMember: (intent: 'MEMBER' | 'ORGANIZER' | 'CATECHESIS') => void;
  busy?: boolean;
  error?: string | null;
}) {
  const [parishName, setParishName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [yearName, setYearName] = useState('Ano atual');
  const [yearStart, setYearStart] = useState('2026-02-01');
  const [yearEnd, setYearEnd] = useState('2026-12-15');
  const [className, setClassName] = useState('');

  return (
    <Screen testID="onboarding-screen">
      <ScreenTitle title={copy.onboarding.title} subtitle={copy.onboarding.subtitle} />
      {error ? <ErrorState title={copy.catalog.error} body={error} /> : null}
      <Field label={copy.onboarding.parishName} value={parishName} onChangeText={setParishName} />
      <Field label={copy.onboarding.city} value={city} onChangeText={setCity} />
      <Field label={copy.onboarding.state} value={state} onChangeText={setState} />
      <Field label={copy.onboarding.yearName} value={yearName} onChangeText={setYearName} />
      <Field label={copy.onboarding.yearStart} value={yearStart} onChangeText={setYearStart} />
      <Field label={copy.onboarding.yearEnd} value={yearEnd} onChangeText={setYearEnd} />
      <Field label={copy.onboarding.className} value={className} onChangeText={setClassName} />
      <BrandButton
        label={busy ? copy.common.saving : copy.onboarding.submit}
        disabled={busy || !parishName}
        onPress={() =>
          onCoordinator({
            parishName,
            parishCity: city,
            parishState: state,
            yearName,
            yearStart,
            yearEnd,
            className: className || undefined,
          })
        }
      />
      <BrandButton variant="ghost" label={copy.onboarding.member} onPress={() => onMember('MEMBER')} />
      <BrandButton variant="ghost" label={copy.onboarding.organizer} onPress={() => onMember('ORGANIZER')} />
      <BrandButton variant="ghost" label={copy.onboarding.catechesis} onPress={() => onMember('CATECHESIS')} />
    </Screen>
  );
}
