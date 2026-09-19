import React, { useEffect, useState } from 'react';
import type { CatechumenInput } from '../api/client';
import { DateField, SelectField } from '../components/forms';
import { BrandButton, ErrorText, Field, Row, Screen, ScreenTitle, SectionHeader } from '../components/ui';
import { spacing } from '../theme';

export function CatechumenFormScreen({
  initial,
  families,
  busy,
  error,
  onSubmit,
  onCreateFamily,
  mode,
}: {
  initial?: Partial<CatechumenInput> | null;
  families: { id: string; name: string }[];
  busy?: boolean;
  error?: string | null;
  onSubmit: (values: CatechumenInput) => Promise<void> | void;
  onCreateFamily?: () => void;
  mode: 'create' | 'edit';
}) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? '');
  const [lastName, setLastName] = useState(initial?.lastName ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [birthDate, setBirthDate] = useState<string | null>(initial?.birthDate ? initial.birthDate.slice(0, 10) : null);
  const [householdId, setHouseholdId] = useState<string | null>(initial?.householdId ?? null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setFirstName(initial.firstName ?? '');
    setLastName(initial.lastName ?? '');
    setEmail(initial.email ?? '');
    setBirthDate(initial.birthDate ? initial.birthDate.slice(0, 10) : null);
    setHouseholdId(initial.householdId ?? null);
  }, [initial]);

  const firstError = touched && !firstName.trim() ? 'Indique o nome.' : null;
  const lastError = touched && !lastName.trim() ? 'Indique o apelido.' : null;

  return (
    <Screen testID="catechumen-form-screen">
      <ScreenTitle title={mode === 'create' ? 'Novo catequizando' : 'Editar catequizando'} subtitle="Dados básicos da ficha. Documentos e turmas são geridos depois." />
      <ErrorText message={error} />
      <Row style={{ alignItems: 'flex-start' }}>
        <Field label="Nome" icon="account-outline" value={firstName} onChangeText={setFirstName} autoCapitalize="words" error={firstError} style={{ flex: 1 }} testID="catechumen-first-name" />
      </Row>
      <Field label="Apelido" value={lastName} onChangeText={setLastName} autoCapitalize="words" error={lastError} testID="catechumen-last-name" />
      <DateField label="Data de nascimento" value={birthDate} onChange={setBirthDate} icon="cake-variant-outline" testID="catechumen-birth" />
      <Field label="E-mail (opcional)" icon="email-outline" value={email} onChangeText={setEmail} keyboardType="email-address" testID="catechumen-email" />
      <SectionHeader title="Família" icon="home-heart" action={onCreateFamily ? 'Criar família' : undefined} onAction={onCreateFamily} />
      <SelectField
        label="Agregado familiar"
        icon="home-outline"
        value={householdId}
        options={families.map((family) => ({ value: family.id, label: family.name }))}
        onChange={setHouseholdId}
        allowClear
        helper={families.length === 0 ? 'Ainda não há famílias registadas.' : 'Liga o catequizando aos responsáveis e ao portal da família.'}
        testID="catechumen-family"
      />
      <BrandButton
        testID="catechumen-submit"
        icon="content-save-outline"
        label={busy ? 'A guardar…' : mode === 'create' ? 'Criar ficha' : 'Guardar alterações'}
        loading={busy}
        disabled={busy}
        onPress={() => {
          setTouched(true);
          if (!firstName.trim() || !lastName.trim()) return;
          void onSubmit({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim() || null,
            birthDate,
            householdId,
          });
        }}
        style={{ marginTop: spacing.md }}
      />
    </Screen>
  );
}
