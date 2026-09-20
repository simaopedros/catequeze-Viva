import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { Avatar } from '../components/Avatar';
import { BrandButton, Card, EmptyState, ErrorText, Field, KeyValue, ListCard, ListRow, Row, Screen, ScreenTitle, SectionHeader, SkeletonList, Tag } from '../components/ui';
import { colors, spacing } from '../theme';
import { formatDate, fullName } from '../utils/format';

export function SacramentsScreen({
  items,
  loading,
  error,
  onOpen,
  refreshing,
  onRefresh,
}: {
  items: any[];
  loading?: boolean;
  error?: string | null;
  onOpen: (id: string) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <Screen testID="sacraments-screen" refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenTitle title="Percursos sacramentais" subtitle="Acompanhe os marcos de cada catequizando." />
      {loading && items.length === 0 ? <SkeletonList rows={4} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Percursos indisponíveis" body={error} /> : null}
      {!loading && !error && items.length === 0 ? <EmptyState icon="cross-outline" title="Sem percursos" body="Os percursos são criados na plataforma web a partir dos modelos da paróquia." /> : null}
      {items.length > 0 ? (
        <ListCard>
          {items.map((journey, index) => {
            const milestones: any[] = journey.milestones ?? [];
            const done = milestones.filter((m) => m.status === 'COMPLETED' || m.status === 'DONE').length;
            const name = fullName(journey.catechumenProfile, 'Catequizando');
            return (
              <ListRow
                key={journey.id}
                testID={`journey-${journey.id}`}
                left={<Avatar name={name} url={journey.catechumenProfile?.photoUrl} size={38} />}
                title={name}
                subtitle={[journey.template?.name || journey.template?.sacrament?.name, journey.targetDate ? `meta ${formatDate(journey.targetDate)}` : null].filter(Boolean).join(' · ')}
                right={milestones.length ? <Tag label={`${done}/${milestones.length}`} tone={done === milestones.length ? 'success' : 'gold'} /> : undefined}
                onPress={() => onOpen(journey.id)}
                last={index === items.length - 1}
              />
            );
          })}
        </ListCard>
      ) : null}
    </Screen>
  );
}

const MILESTONE_STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'neutral' | 'info' }> = {
  COMPLETED: { label: 'Concluído', tone: 'success' },
  DONE: { label: 'Concluído', tone: 'success' },
  IN_PROGRESS: { label: 'Em curso', tone: 'warning' },
  PENDING: { label: 'Pendente', tone: 'neutral' },
  SCHEDULED: { label: 'Agendado', tone: 'info' },
};

export function SacramentalJourneyScreen({ data, loading, error, onOpenCatechumen }: { data: any; loading?: boolean; error?: string | null; onOpenCatechumen?: (id: string) => void }) {
  if (loading && !data) {
    return (
      <Screen>
        <SkeletonList rows={3} />
      </Screen>
    );
  }
  if (error || !data) {
    return (
      <Screen testID="journey-screen">
        <EmptyState icon="cloud-off-outline" title="Percurso indisponível" body={error || 'Não encontrado.'} />
      </Screen>
    );
  }
  const milestones: any[] = [...(data.milestones ?? [])].sort((a, b) => (a.templateMilestone?.order ?? a.order ?? 0) - (b.templateMilestone?.order ?? b.order ?? 0));
  const done = milestones.filter((m) => m.status === 'COMPLETED' || m.status === 'DONE').length;
  const pct = milestones.length ? Math.round((done / milestones.length) * 100) : 0;
  const name = fullName(data.catechumenProfile, 'Catequizando');

  return (
    <Screen testID="journey-screen">
      <ScreenTitle eyebrow={data.template?.name || 'Percurso sacramental'} title={name} subtitle={data.targetDate ? `Meta: ${formatDate(data.targetDate)}` : undefined} />
      <Card tone="ink">
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="titleMedium" style={{ color: colors.white }}>
            Progresso
          </Text>
          <Text variant="titleMedium" style={{ color: colors.goldLight }}>
            {done}/{milestones.length}
          </Text>
        </Row>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.inkSoft, marginTop: spacing.sm, overflow: 'hidden' }}>
          <View style={{ width: `${pct}%`, height: '100%', backgroundColor: colors.gold }} />
        </View>
      </Card>
      <Card>
        <KeyValue label="Turma" value={data.catechumenProfile?.enrollments?.[0]?.class?.name} />
        <KeyValue label="Modelo" value={data.template?.name} />
        {data.template?.description ? (
          <Text variant="bodySmall" style={{ color: colors.muted, marginTop: spacing.xs }}>
            {data.template.description}
          </Text>
        ) : null}
      </Card>
      <SectionHeader title="Marcos" icon="flag-checkered" action={onOpenCatechumen && data.catechumenProfile?.id ? 'Ver ficha' : undefined} onAction={() => data.catechumenProfile?.id && onOpenCatechumen?.(data.catechumenProfile.id)} />
      {milestones.length === 0 ? (
        <EmptyState icon="flag-outline" title="Sem marcos" body="O modelo deste percurso ainda não tem marcos definidos." />
      ) : (
        <ListCard>
          {milestones.map((milestone, index) => {
            const meta = MILESTONE_STATUS[String(milestone.status)] ?? MILESTONE_STATUS.PENDING;
            const title = milestone.templateMilestone?.name || milestone.name || milestone.title || `Marco ${index + 1}`;
            return (
              <ListRow
                key={milestone.id}
                icon={meta.tone === 'success' ? 'check-circle' : meta.tone === 'warning' ? 'progress-clock' : 'circle-outline'}
                title={title}
                subtitle={[milestone.templateMilestone?.description || milestone.description, milestone.completedAt ? `concluído ${formatDate(milestone.completedAt)}` : milestone.scheduledAt ? `agendado ${formatDate(milestone.scheduledAt)}` : null].filter(Boolean).join(' · ')}
                right={<Tag label={meta.label} tone={meta.tone} />}
                chevron={false}
                last={index === milestones.length - 1}
              />
            );
          })}
        </ListCard>
      )}
    </Screen>
  );
}

const TRACK_KIND: Record<string, string> = { INITIAL: 'Formação inicial', CONTINUING: 'Formação contínua', SPECIALIZED: 'Especialização', RETREAT: 'Retiro' };

export function FormationScreen({
  items,
  loading,
  error,
  refreshing,
  onRefresh,
  onEnroll,
  onUnenroll,
  busyId,
}: {
  items: any[];
  loading?: boolean;
  error?: string | null;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEnroll?: (trackId: string) => void;
  onUnenroll?: (trackId: string) => void;
  busyId?: string | null;
}) {
  return (
    <Screen testID="formation-screen" refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenTitle title="Formação de catequistas" subtitle="Percursos formativos da paróquia e da diocese." />
      {loading && items.length === 0 ? <SkeletonList rows={3} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Formação indisponível" body={error} /> : null}
      {!loading && !error && items.length === 0 ? <EmptyState icon="school-outline" title="Sem percursos formativos" body="Quando a coordenação criar formações, aparecem aqui." /> : null}
      {items.map((track) => {
        const sessions: any[] = track.sessions ?? [];
        const upcoming = sessions.filter((session) => new Date(session.date || session.startsAt).getTime() >= Date.now()).slice(0, 3);
        const enrolled = Boolean(track.myEnrollment) && track.myEnrollment?.status !== 'DROPPED';
        const canEnroll = track.active !== false && !enrolled && onEnroll;
        return (
          <Card key={track.id} testID={`track-${track.id}`}>
            <Row style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ color: colors.ink }}>
                  {track.name}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.muted, marginTop: 2 }}>
                  {[TRACK_KIND[String(track.kind)] ?? track.kind, track.hours ? `${track.hours} h` : null, track.inherited ? track.origin?.label || 'Diocese' : null, track._count?.enrollments != null ? `${track._count.enrollments} inscritos` : null].filter(Boolean).join(' · ')}
                </Text>
              </View>
              {enrolled ? <Tag label="Inscrito" tone="success" /> : track.active === false ? <Tag label="Inativo" tone="neutral" /> : null}
            </Row>
            {track.description ? (
              <Text variant="bodyMedium" style={{ color: colors.inkSoft, marginTop: spacing.sm, lineHeight: 21 }}>
                {track.description}
              </Text>
            ) : null}
            {upcoming.length > 0 ? (
              <View style={{ marginTop: spacing.sm, gap: 4 }}>
                {upcoming.map((session) => (
                  <Row key={session.id}>
                    <Tag label={formatDate(session.date || session.startsAt)} tone="gold" />
                    <Text variant="bodySmall" style={{ color: colors.inkSoft, flex: 1 }}>
                      {session.title || session.topic || 'Sessão'}
                    </Text>
                  </Row>
                ))}
              </View>
            ) : null}
            {(track.moduleCount || track.lessonCount) ? (
              <Text variant="labelSmall" style={{ color: colors.muted, marginTop: spacing.xs }}>
                {[track.moduleCount ? `${track.moduleCount} módulos` : null, track.lessonCount ? `${track.lessonCount} lições` : null].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
            {canEnroll ? (
              <BrandButton
                icon="account-plus-outline"
                label={busyId === track.id ? 'A inscrever…' : 'Inscrever-me'}
                loading={busyId === track.id}
                disabled={Boolean(busyId)}
                onPress={() => onEnroll(track.id)}
                testID={`enroll-track-${track.id}`}
              />
            ) : null}
            {enrolled && onUnenroll ? (
              <BrandButton
                variant="ghost"
                icon="account-minus-outline"
                label={busyId === track.id ? 'A cancelar…' : 'Cancelar inscrição'}
                loading={busyId === track.id}
                disabled={Boolean(busyId)}
                onPress={() => onUnenroll(track.id)}
                testID={`unenroll-track-${track.id}`}
              />
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}

function groupMembershipLabel(group: any): { label: string; tone: 'success' | 'warning' | 'neutral' } | null {
  const status = group.myStatus || group.myMembership?.status;
  if (status === 'ACTIVE' || group.isMember) return { label: 'Membro', tone: 'success' };
  if (status === 'PENDING' || status === 'INVITED') return { label: 'Pedido enviado', tone: 'warning' };
  return null;
}

export function GroupsScreen({
  items,
  loading,
  error,
  refreshing,
  onRefresh,
  onJoin,
  onLeave,
  busyId,
}: {
  items: any[];
  loading?: boolean;
  error?: string | null;
  refreshing?: boolean;
  onRefresh?: () => void;
  onJoin?: (groupId: string) => void;
  onLeave?: (groupId: string) => void;
  busyId?: string | null;
}) {
  return (
    <Screen testID="groups-screen" refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenTitle title="Grupos pastorais" subtitle="Comunidades de oração, serviço e formação." />
      {loading && items.length === 0 ? <SkeletonList rows={3} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Grupos indisponíveis" body={error} /> : null}
      {!loading && !error && items.length === 0 ? <EmptyState icon="account-group-outline" title="Sem grupos" body="Ainda não há grupos pastorais visíveis para si." /> : null}
      {items.length > 0 ? (
        <ListCard>
          {items.map((group, index) => {
            const membership = groupMembershipLabel(group);
            const status = group.myStatus || group.myMembership?.status;
            const isMember = status === 'ACTIVE' || Boolean(group.isMember);
            const canJoin = !isMember && status !== 'PENDING' && status !== 'INVITED' && (group.visibility === 'PUBLIC' || group.visibility === 'PRIVATE') && onJoin;
            const canLeave = isMember && onLeave;
            return (
              <ListRow
                key={group.id}
                testID={`group-${group.id}`}
                icon="account-group-outline"
                title={group.name}
                subtitle={[group.kind, group.city, group.memberCount != null ? `${group.memberCount} membros` : group._count?.members != null ? `${group._count.members} membros` : null].filter(Boolean).join(' · ')}
                right={
                  canJoin ? (
                    <BrandButton variant="text" label={busyId === group.id ? '…' : 'Entrar'} disabled={Boolean(busyId)} onPress={() => onJoin(group.id)} testID={`join-group-${group.id}`} style={{ marginTop: 0 }} />
                  ) : canLeave ? (
                    <BrandButton variant="text" label={busyId === group.id ? '…' : 'Sair'} disabled={Boolean(busyId)} onPress={() => onLeave(group.id)} testID={`leave-group-${group.id}`} style={{ marginTop: 0 }} />
                  ) : membership ? (
                    <Tag label={membership.label} tone={membership.tone} />
                  ) : undefined
                }
                chevron={false}
                last={index === items.length - 1}
              />
            );
          })}
        </ListCard>
      ) : null}
    </Screen>
  );
}

export function SupportScreen({
  items,
  loading,
  error,
  refreshing,
  onRefresh,
  defaultName,
  defaultEmail,
  onSubmit,
  submitting,
  submitError,
}: {
  items: any[];
  loading?: boolean;
  error?: string | null;
  refreshing?: boolean;
  onRefresh?: () => void;
  defaultName?: string;
  defaultEmail?: string;
  onSubmit?: (values: { name: string; email: string; message: string }) => Promise<boolean> | boolean;
  submitting?: boolean;
  submitError?: string | null;
}) {
  const [name, setName] = React.useState(defaultName ?? '');
  const [email, setEmail] = React.useState(defaultEmail ?? '');
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    if (defaultName) setName(defaultName);
    if (defaultEmail) setEmail(defaultEmail);
  }, [defaultName, defaultEmail]);

  return (
    <Screen testID="support-screen" refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenTitle title="Suporte" subtitle="Os seus pedidos de ajuda à equipa Catequese Viva." />
      {onSubmit ? (
        <Card>
          <Text variant="titleSmall" style={{ color: colors.ink, marginBottom: spacing.sm }}>
            Novo pedido
          </Text>
          <ErrorText message={submitError} />
          <Field label="Nome" value={name} onChangeText={setName} autoCapitalize="words" testID="support-name" />
          <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" testID="support-email" />
          <Field label="Mensagem" value={message} onChangeText={setMessage} multiline testID="support-message" />
          <BrandButton
            icon="send-outline"
            label={submitting ? 'A enviar…' : 'Enviar pedido'}
            loading={submitting}
            disabled={submitting || !name.trim() || !email.trim() || !message.trim()}
            onPress={async () => {
              const ok = await onSubmit({ name: name.trim(), email: email.trim(), message: message.trim() });
              if (ok) setMessage('');
            }}
            testID="support-submit"
          />
        </Card>
      ) : null}
      {loading && items.length === 0 ? <SkeletonList rows={2} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Suporte indisponível" body={error} /> : null}
      {!loading && !error && items.length === 0 && !onSubmit ? (
        <EmptyState icon="lifebuoy" title="Sem pedidos" body="Pode contactar o suporte a partir da plataforma web ou pelo e-mail suporte@catechis.app." />
      ) : null}
      {!loading && !error && items.length === 0 && onSubmit ? (
        <EmptyState icon="lifebuoy" title="Sem pedidos ainda" body="Escreva em cima para falar connosco. Respondemos por e-mail." />
      ) : null}
      {items.map((item) => (
        <Card key={item.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text variant="titleSmall" style={{ color: colors.ink, flex: 1 }}>
              {item.subject || 'Pedido'}
            </Text>
            <Tag label={item.status === 'RESOLVED' || item.isRead ? 'Respondido' : 'Aberto'} tone={item.status === 'RESOLVED' || item.isRead ? 'success' : 'warning'} />
          </Row>
          <Text variant="bodyMedium" style={{ color: colors.inkSoft, marginTop: 4 }} numberOfLines={4}>
            {item.message || item.body}
          </Text>
          <Text variant="labelSmall" style={{ color: colors.muted, marginTop: 6 }}>
            {formatDate(item.createdAt)}
          </Text>
        </Card>
      ))}
    </Screen>
  );
}
