import React from 'react';
import { Text, View } from 'react-native';
import { BrandButton, EmptyState, HeroHeader, LoadingState, PersonRow, Screen, ScreenTitle } from '../components/ui';
import { formatDate, personName, statusLabel } from '../lib/payload';
import { attendanceTone, colors, fonts, spacing, type AttendanceStatusId } from '../theme';

function Heatmap({ records }: { records: any[] }) {
  if (!records.length) return null;
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={{ color: colors.ink, fontFamily: fonts.serif, fontSize: 20, marginBottom: 8 }}>Presença</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {records.slice(0, 24).map((row) => {
          const status = (row.status as AttendanceStatusId) || null;
          const tone = status ? attendanceTone[status] : null;
          return (
            <View
              key={row.id}
              accessibilityLabel={tone?.label || 'Sem estado'}
              style={{
                width: 18,
                height: 18,
                borderRadius: tone?.shape === 'square' ? 2 : tone?.shape === 'pill' ? 8 : 9,
                transform: tone?.shape === 'diamond' ? [{ rotate: '45deg' }] : undefined,
                backgroundColor: tone?.color || colors.line,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

export function CatechumenProfileScreen({
  data,
  loading,
  error,
  onOpenClass,
  onOpenFamily,
  onEdit,
  onDelete,
  canWrite,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
  onOpenClass?: (id: string) => void;
  onOpenFamily?: (id: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canWrite?: boolean;
}) {
  const records = data?.attendanceRecords || data?.attendance || [];
  return (
    <Screen testID="catechumen-detail-screen">
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Não encontrado" body={error} /> : null}
      {!loading && !error ? (
        <>
          <HeroHeader
            kicker={data?.parish?.name || 'Catequizando'}
            title={personName(data, 'Catequizando')}
            subtitle={data?.enrollments?.[0]?.class?.name || data?.household?.name}
          />
          {canWrite ? (
            <>
              {onEdit ? <BrandButton label="Editar" onPress={onEdit} testID="catechumen-edit" /> : null}
              {onDelete ? (
                <BrandButton variant="danger" label="Apagar" onPress={onDelete} testID="catechumen-delete" />
              ) : null}
            </>
          ) : null}
          <PersonRow
            name={personName(data, 'Catequizando')}
            photoUrl={data?.photoUrl}
            hint={formatDate(data?.birthDate)}
            chip={data?.email}
          />
          <Heatmap records={Array.isArray(records) ? records : []} />
          <Text style={{ color: colors.ink, fontFamily: fonts.serif, fontSize: 20, marginBottom: 8 }}>Turmas</Text>
          {(data?.enrollments || []).map((row: any) => (
            <PersonRow
              key={row.id}
              name={row.class?.name || 'Turma'}
              hint={statusLabel(row.status)}
              onPress={() => row.class?.id && onOpenClass?.(row.class.id)}
            />
          ))}
          <Text style={{ color: colors.ink, fontFamily: fonts.serif, fontSize: 20, marginBottom: 8, marginTop: spacing.sm }}>
            Responsáveis
          </Text>
          {(data?.household?.guardians || []).map((row: any) => (
            <PersonRow
              key={row.id || row.user?.id}
              name={personName(row.user || row)}
              hint={row.user?.email || 'Encarregado de educação'}
              onPress={() => data?.household?.id && onOpenFamily?.(data.household.id)}
            />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

export function FamilyProfileScreen({
  data,
  loading,
  error,
  onOpenCatechumen,
  onEdit,
  canWrite,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
  onOpenCatechumen?: (id: string) => void;
  onEdit?: () => void;
  canWrite?: boolean;
}) {
  return (
    <Screen testID="family-detail-screen">
      <ScreenTitle title={personName(data, 'Família')} subtitle={data?.parish?.name || data?.community?.name} />
      {canWrite && onEdit ? <BrandButton label="Editar família" onPress={onEdit} testID="family-edit" /> : null}
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Não encontrado" body={error} /> : null}
      {(data?.guardians || []).map((row: any) => (
        <PersonRow
          key={row.id || row.user?.id}
          name={personName(row.user || row)}
          hint={row.user?.email || 'Encarregado de educação'}
        />
      ))}
      {(data?.catechumens || data?.dependents || []).map((row: any) => (
        <PersonRow
          key={row.id}
          name={personName(row)}
          photoUrl={row.photoUrl}
          hint={row.enrollments?.[0]?.class?.name}
          onPress={() => onOpenCatechumen?.(row.id)}
        />
      ))}
    </Screen>
  );
}
