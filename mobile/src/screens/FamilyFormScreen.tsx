import React, { useEffect, useState } from 'react';
import type { FamilyInput, GuardianInput } from '../api/client';
import { RELATIONSHIP_OPTIONS, SelectField } from '../components/forms';
import { BrandButton, ErrorText, Field, Screen, ScreenTitle } from '../components/ui';
import { spacing } from '../theme';

export function FamilyFormScreen({
  initial,
  communities,
  busy,
  error,
  onSubmit,
  mode,
}: {
  initial?: Partial<FamilyInput> | null;
  communities: { id: string; name: string }[];
  busy?: boolean;
  error?: string | null;
  onSubmit: (values: FamilyInput) => Promise<void> | void;
  mode: 'create' | 'edit';
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [communityId, setCommunityId] = useState<string | null>(initial?.communityId ?? null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setName(initial.name ?? '');
    setAddress(initial.address ?? '');
    setPhone(initial.phone ?? '');
    setCommunityId(initial.communityId ?? null);
  }, [initial]);

  const nameError = touched && name.trim().length < 2 ? 'Indique o nome da família.' : null;

  return (
    <Screen testID="family-form-screen">
      <ScreenTitle title={mode === 'create' ? 'Nova família' : 'Editar família'} subtitle="Agregado familiar dos catequizandos." />
      <ErrorText message={error} />
      <Field label="Nome da família" icon="home-heart" value={name} onChangeText={setName} autoCapitalize="words" error={nameError} testID="family-name" helper="Ex.: Família Silva" />
      <Field label="Morada (opcional)" icon="map-marker-outline" value={address} onChangeText={setAddress} autoCapitalize="sentences" testID="family-address" />
      <Field label="Telefone (opcional)" icon="phone-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" testID="family-phone" />
      {mode === 'create' ? (
        <SelectField
          label="Comunidade"
          icon="church"
          value={communityId}
          options={communities.map((community) => ({ value: community.id, label: community.name }))}
          onChange={setCommunityId}
          allowClear
          testID="family-community"
        />
      ) : null}
      <BrandButton
        testID="family-submit"
        icon="content-save-outline"
        label={busy ? 'A guardar…' : mode === 'create' ? 'Criar família' : 'Guardar alterações'}
        loading={busy}
        disabled={busy}
        onPress={() => {
          setTouched(true);
          if (name.trim().length < 2) return;
          void onSubmit({ name: name.trim(), address: address.trim() || undefined, phone: phone.trim() || undefined, communityId: communityId ?? undefined });
        }}
        style={{ marginTop: spacing.md }}
      />
    </Screen>
  );
}

export function GuardianFormScreen({
  initial,
  busy,
  error,
  onSubmit,
  onRemove,
  mode,
  familyName,
}: {
  initial?: Partial<GuardianInput> | null;
  busy?: boolean;
  error?: string | null;
  onSubmit: (values: GuardianInput) => Promise<void> | void;
  onRemove?: () => void;
  mode: 'create' | 'edit';
  familyName?: string | null;
}) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? '');
  const [lastName, setLastName] = useState(initial?.lastName ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [relationship, setRelationship] = useState<string | null>(initial?.relationship ?? null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setFirstName(initial.firstName ?? '');
    setLastName(initial.lastName ?? '');
    setEmail(initial.email ?? '');
    setPhone(initial.phone ?? '');
    setRelationship(initial.relationship ?? null);
  }, [initial]);

  const firstError = touched && !firstName.trim() ? 'Indique o nome.' : null;

  return (
    <Screen testID="guardian-form-screen">
      <ScreenTitle eyebrow={familyName ?? undefined} title={mode === 'create' ? 'Novo responsável' : 'Editar responsável'} subtitle="Quem acompanha o catequizando e recebe as comunicações." />
      <ErrorText message={error} />
      <Field label="Nome" icon="account-outline" value={firstName} onChangeText={setFirstName} autoCapitalize="words" error={firstError} testID="guardian-first-name" />
      <Field label="Apelido" value={lastName} onChangeText={setLastName} autoCapitalize="words" testID="guardian-last-name" />
      <SelectField label="Relação" icon="account-heart-outline" value={relationship} options={RELATIONSHIP_OPTIONS} onChange={setRelationship} allowClear testID="guardian-relationship" />
      <Field label="Telefone" icon="phone-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" testID="guardian-phone" />
      {mode === 'create' ? (
        <Field label="E-mail (opcional)" icon="email-outline" value={email} onChangeText={setEmail} keyboardType="email-address" helper="Se existir conta com este e-mail, fica ligada ao portal da família." testID="guardian-email" />
      ) : null}
      <BrandButton
        testID="guardian-submit"
        icon="content-save-outline"
        label={busy ? 'A guardar…' : mode === 'create' ? 'Adicionar responsável' : 'Guardar alterações'}
        loading={busy}
        disabled={busy}
        onPress={() => {
          setTouched(true);
          if (!firstName.trim()) return;
          void onSubmit({
            firstName: firstName.trim(),
            lastName: lastName.trim() || undefined,
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            relationship: relationship ?? undefined,
          });
        }}
        style={{ marginTop: spacing.md }}
      />
      {mode === 'edit' && onRemove ? <BrandButton variant="text" icon="account-remove-outline" label="Remover da família" onPress={onRemove} testID="guardian-remove" /> : null}
    </Screen>
  );
}
