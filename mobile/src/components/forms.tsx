import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { HelperText, Menu, Switch, Text, TextInput } from 'react-native-paper';
import { DatePickerModal, TimePickerModal, pt, registerTranslation } from 'react-native-paper-dates';
import { colors, radius, spacing } from '../theme';
import { formatDate } from '../utils/format';
import { Icon, type IconName } from './ui';

registerTranslation('pt', pt);

export type SelectOption<T extends string = string> = { value: T; label: string; hint?: string };

/** Campo de escolha única baseado em Menu do Paper (funciona em web e nativo). */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Selecionar…',
  icon,
  error,
  helper,
  allowClear,
  testID,
}: {
  label: string;
  value: T | null | undefined;
  options: SelectOption<T>[];
  onChange: (value: T | null) => void;
  placeholder?: string;
  icon?: IconName;
  error?: string | null;
  helper?: string;
  allowClear?: boolean;
  testID?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Menu
        visible={open}
        onDismiss={() => setOpen(false)}
        anchorPosition="bottom"
        contentStyle={{ backgroundColor: colors.surface, borderRadius: radius.md, maxHeight: 320 }}
        anchor={
          <Pressable testID={testID} onPress={() => setOpen(true)} accessibilityRole="button">
            <TextInput
              mode="outlined"
              label={label}
              value={selected?.label ?? ''}
              placeholder={placeholder}
              editable={false}
              pointerEvents="none"
              outlineColor={colors.line}
              activeOutlineColor={colors.ink}
              textColor={colors.ink}
              style={{ backgroundColor: colors.surface }}
              outlineStyle={{ borderRadius: radius.md }}
              left={icon ? <TextInput.Icon icon={icon} color={colors.muted} /> : undefined}
              right={<TextInput.Icon icon="chevron-down" color={colors.muted} />}
              error={Boolean(error)}
            />
          </Pressable>
        }
      >
        {allowClear ? (
          <Menu.Item
            title="Nenhum"
            leadingIcon="close-circle-outline"
            onPress={() => {
              onChange(null);
              setOpen(false);
            }}
          />
        ) : null}
        {options.map((option) => (
          <Menu.Item
            key={option.value}
            testID={testID ? `${testID}-${option.value}` : undefined}
            title={option.label}
            leadingIcon={option.value === value ? 'check' : undefined}
            onPress={() => {
              onChange(option.value);
              setOpen(false);
            }}
          />
        ))}
      </Menu>
      {error ? (
        <HelperText type="error" visible>
          {error}
        </HelperText>
      ) : helper ? (
        <HelperText type="info" visible>
          {helper}
        </HelperText>
      ) : null}
    </View>
  );
}

/** Campo de data (YYYY-MM-DD) com modal do react-native-paper-dates. */
export function DateField({
  label,
  value,
  onChange,
  icon = 'calendar-outline',
  error,
  helper,
  testID,
  allowClear = true,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  icon?: IconName;
  error?: string | null;
  helper?: string;
  testID?: string;
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(`${value.slice(0, 10)}T12:00:00`) : undefined;
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Pressable testID={testID} onPress={() => setOpen(true)} accessibilityRole="button">
        <TextInput
          mode="outlined"
          label={label}
          value={date ? formatDate(date) : ''}
          placeholder="Escolher data"
          editable={false}
          pointerEvents="none"
          outlineColor={colors.line}
          activeOutlineColor={colors.ink}
          textColor={colors.ink}
          style={{ backgroundColor: colors.surface }}
          outlineStyle={{ borderRadius: radius.md }}
          left={<TextInput.Icon icon={icon} color={colors.muted} />}
          right={
            value && allowClear ? (
              <TextInput.Icon icon="close" color={colors.muted} onPress={() => onChange(null)} forceTextInputFocus={false} />
            ) : undefined
          }
          error={Boolean(error)}
        />
      </Pressable>
      <DatePickerModal
        locale="pt"
        mode="single"
        visible={open}
        date={date}
        onDismiss={() => setOpen(false)}
        onConfirm={({ date: picked }) => {
          setOpen(false);
          if (picked) {
            const iso = new Date(picked.getTime() - picked.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
            onChange(iso);
          }
        }}
        saveLabel="Confirmar"
        label={label}
        animationType="slide"
      />
      {error ? (
        <HelperText type="error" visible>
          {error}
        </HelperText>
      ) : helper ? (
        <HelperText type="info" visible>
          {helper}
        </HelperText>
      ) : null}
    </View>
  );
}

/** Campo de hora (HH:MM). */
export function TimeField({
  label,
  value,
  onChange,
  icon = 'clock-outline',
  error,
  testID,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  icon?: IconName;
  error?: string | null;
  testID?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hours, minutes] = (value || '').split(':').map((part) => Number.parseInt(part, 10));
  return (
    <View style={{ marginBottom: spacing.md, flex: 1 }}>
      <Pressable testID={testID} onPress={() => setOpen(true)} accessibilityRole="button">
        <TextInput
          mode="outlined"
          label={label}
          value={value ?? ''}
          placeholder="--:--"
          editable={false}
          pointerEvents="none"
          outlineColor={colors.line}
          activeOutlineColor={colors.ink}
          textColor={colors.ink}
          style={{ backgroundColor: colors.surface }}
          outlineStyle={{ borderRadius: radius.md }}
          left={<TextInput.Icon icon={icon} color={colors.muted} />}
          right={value ? <TextInput.Icon icon="close" color={colors.muted} onPress={() => onChange(null)} forceTextInputFocus={false} /> : undefined}
          error={Boolean(error)}
        />
      </Pressable>
      <TimePickerModal
        locale="pt"
        visible={open}
        hours={Number.isFinite(hours) ? hours : 10}
        minutes={Number.isFinite(minutes) ? minutes : 0}
        onDismiss={() => setOpen(false)}
        onConfirm={({ hours: h, minutes: m }) => {
          setOpen(false);
          onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }}
        label={label}
        cancelLabel="Cancelar"
        confirmLabel="Confirmar"
      />
      {error ? (
        <HelperText type="error" visible>
          {error}
        </HelperText>
      ) : null}
    </View>
  );
}

export function SwitchField({
  label,
  hint,
  value,
  onChange,
  icon,
  testID,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  icon?: IconName;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      testID={testID}
      accessibilityRole="switch"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.md,
        marginBottom: spacing.md,
      }}
    >
      {icon ? <Icon name={icon} size={20} color={colors.muted} /> : null}
      <View style={{ flex: 1 }}>
        <Text variant="bodyLarge" style={{ color: colors.ink }}>
          {label}
        </Text>
        {hint ? (
          <Text variant="bodySmall" style={{ color: colors.muted }}>
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onChange} color={colors.gold} />
    </Pressable>
  );
}

export const DAY_OF_WEEK_OPTIONS: SelectOption[] = [
  { value: 'SUNDAY', label: 'Domingo' },
  { value: 'MONDAY', label: 'Segunda-feira' },
  { value: 'TUESDAY', label: 'Terça-feira' },
  { value: 'WEDNESDAY', label: 'Quarta-feira' },
  { value: 'THURSDAY', label: 'Quinta-feira' },
  { value: 'FRIDAY', label: 'Sexta-feira' },
  { value: 'SATURDAY', label: 'Sábado' },
];

export const RELATIONSHIP_OPTIONS: SelectOption[] = [
  { value: 'MOTHER', label: 'Mãe' },
  { value: 'FATHER', label: 'Pai' },
  { value: 'GUARDIAN', label: 'Encarregado(a) de educação' },
  { value: 'GRANDPARENT', label: 'Avô/Avó' },
  { value: 'OTHER', label: 'Outro' },
];
