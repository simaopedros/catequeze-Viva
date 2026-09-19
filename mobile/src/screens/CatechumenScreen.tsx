import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { Avatar } from '../components/Avatar';
import { BrandButton, Card, EmptyState, KeyValue, ListCard, ListRow, Row, Screen, ScreenTitle, SectionHeader, SkeletonList, Tag } from '../components/ui';
import { colors, spacing } from '../theme';
import { formatDate, fullName } from '../utils/format';

function ageOf(birthDate?: string | null): string | null {
  if (!birthDate) return null;
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const beforeBirthday = now.getMonth() < date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() < date.getDate());
  if (beforeBirthday) age -= 1;
  return `${age} anos`;
}

export function CatechumenScreen({
  data,
  loading,
  error,
  onOpenFamily,
  onOpenClass,
  onEdit,
  onDelete,
  onMessageGuardian,
  onOpenDocuments,
  onOpenAttendanceHistory,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
  onOpenFamily?: (id: string) => void;
  onOpenClass?: (id: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMessageGuardian?: () => void;
  onOpenDocuments?: () => void;
  onOpenAttendanceHistory?: () => void;
}) {
  if (loading && !data) {
    return (
      <Screen>
        <SkeletonList rows={3} />
      </Screen>
    );
  }
  if (error || !data) {
    return (
      <Screen testID="catechumen-screen">
        <EmptyState icon="account-question-outline" title="Catequizando indisponível" body={error || 'Perfil não encontrado.'} />
      </Screen>
    );
  }

  const name = fullName(data, 'Catequizando');
  const enrollments = Array.isArray(data.enrollments) ? data.enrollments : [];
  const journeys = Array.isArray(data.sacramentalJourneys) ? data.sacramentalJourneys : [];
  const guardians = data.household?.guardians || [];

  return (
    <Screen testID="catechumen-screen">
      <Card tone="ink">
        <Row gap={spacing.md}>
          <Avatar name={name} url={data.avatarUrl} size={60} />
          <View style={{ flex: 1 }}>
            <Text variant="headlineSmall" style={{ color: colors.white }}>
              {name}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.tabInactive }}>
              {[ageOf(data.birthDate), data.parish?.name].filter(Boolean).join(' · ')}
            </Text>
            {data.status ? <View style={{ marginTop: 6 }}><Tag label={data.status === 'ACTIVE' ? 'Ativo' : String(data.status)} tone={data.status === 'ACTIVE' ? 'success' : 'neutral'} /></View> : null}
          </View>
        </Row>
        <Row style={{ marginTop: spacing.sm, flexWrap: 'wrap' }}>
          {onEdit ? <BrandButton variant="gold" icon="pencil-outline" label="Editar" onPress={onEdit} testID="edit-catechumen" style={{ flex: 1 }} /> : null}
          {onMessageGuardian && guardians.length > 0 ? (
            <BrandButton variant="ghost" icon="message-text-outline" label="Falar com a família" onPress={onMessageGuardian} style={{ flex: 1, borderColor: colors.inkSoft }} />
          ) : null}
        </Row>
      </Card>

      <ScreenTitle title="" />
      <Card>
        <KeyValue label="Data de nascimento" value={formatDate(data.birthDate)} />
        <KeyValue label="Batizado" value={data.baptized === true ? 'Sim' : data.baptized === false ? 'Não' : undefined} />
        <KeyValue label="Paróquia de batismo" value={data.baptismParish} />
        <KeyValue label="Escola" value={data.school} />
        <KeyValue label="Ano escolar" value={data.schoolYear} />
        <KeyValue label="Contacto" value={data.phone || data.email} />
        {data.notes || data.healthNotes ? (
          <Text variant="bodySmall" style={{ color: colors.muted, marginTop: spacing.xs }}>
            {data.notes || data.healthNotes}
          </Text>
        ) : null}
      </Card>

      {data.household ? (
        <>
          <SectionHeader title="Família" icon="home-heart" action={onOpenFamily ? 'Abrir' : undefined} onAction={() => data.household?.id && onOpenFamily?.(data.household.id)} />
          <ListCard>
            <ListRow
              testID="open-family"
              icon="home-outline"
              title={data.household.name || 'Família'}
              subtitle={guardians.map((g: any) => fullName(g.user, '')).filter(Boolean).join(', ') || 'Sem responsáveis registados'}
              onPress={data.household?.id && onOpenFamily ? () => onOpenFamily(data.household.id) : undefined}
              last
            />
          </ListCard>
        </>
      ) : null}

      <SectionHeader title="Turmas" icon="school-outline" />
      {enrollments.length === 0 ? (
        <EmptyState icon="school-outline" title="Sem turmas" body="Este catequizando ainda não está inscrito em turmas." />
      ) : (
        <ListCard>
          {enrollments.map((enrollment: any, index: number) => (
            <ListRow
              key={enrollment.id}
              testID={`enrollment-${enrollment.id}`}
              icon="school-outline"
              title={enrollment.class?.name || 'Turma'}
              subtitle={enrollment.class?.stage?.name || enrollment.class?.community?.name}
              right={enrollment.status ? <Tag label={enrollment.status === 'ACTIVE' ? 'Ativa' : enrollment.status} tone={enrollment.status === 'ACTIVE' ? 'success' : 'neutral'} /> : undefined}
              onPress={enrollment.class?.id && onOpenClass ? () => onOpenClass(enrollment.class.id) : undefined}
              last={index === enrollments.length - 1}
            />
          ))}
        </ListCard>
      )}

      {journeys.length > 0 ? (
        <>
          <SectionHeader title="Percursos sacramentais" icon="cross-outline" />
          {journeys.map((journey: any) => {
            const milestones = Array.isArray(journey.milestones) ? journey.milestones : [];
            const done = milestones.filter((m: any) => m.status === 'DONE' || m.status === 'COMPLETED').length;
            const pct = milestones.length ? Math.round((done / milestones.length) * 100) : 0;
            return (
              <Card key={journey.id}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text variant="titleSmall" style={{ color: colors.ink }}>
                    {journey.template?.name || 'Percurso'}
                  </Text>
                  <Text variant="labelMedium" style={{ color: colors.goldDark }}>
                    {done}/{milestones.length}
                  </Text>
                </Row>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.paper, marginTop: spacing.xs, overflow: 'hidden' }}>
                  <View style={{ width: `${pct}%`, height: '100%', backgroundColor: colors.gold }} />
                </View>
              </Card>
            );
          })}
        </>
      ) : null}

      <Row style={{ flexWrap: 'wrap' }}>
        {onOpenAttendanceHistory ? <BrandButton variant="text" icon="history" label="Histórico de presenças" onPress={onOpenAttendanceHistory} /> : null}
        {onOpenDocuments ? <BrandButton variant="text" icon="file-document-outline" label="Documentos" onPress={onOpenDocuments} /> : null}
        {onDelete ? <BrandButton variant="text" icon="delete-outline" label="Apagar" onPress={onDelete} testID="delete-catechumen" /> : null}
      </Row>
    </Screen>
  );
}
