import React from 'react';
import { Avatar } from '../components/Avatar';
import { BrandButton, Card, EmptyState, KeyValue, ListCard, ListRow, Row, Screen, ScreenTitle, SectionHeader, SkeletonList, Tag } from '../components/ui';
import { fullName } from '../utils/format';

const RELATION: Record<string, string> = {
  MOTHER: 'Mãe',
  FATHER: 'Pai',
  GUARDIAN: 'Encarregado(a)',
  GRANDPARENT: 'Avô/Avó',
  OTHER: 'Outro',
};

export function FamilyScreen({
  data,
  loading,
  error,
  onOpenCatechumen,
  onEdit,
  onAddGuardian,
  onEditGuardian,
  onRemoveGuardian,
  onMessageGuardian,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
  onOpenCatechumen?: (id: string) => void;
  onEdit?: () => void;
  onAddGuardian?: () => void;
  onEditGuardian?: (guardian: any) => void;
  onRemoveGuardian?: (guardian: any) => void;
  onMessageGuardian?: (guardian: any) => void;
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
      <Screen testID="family-screen">
        <EmptyState icon="home-alert-outline" title="Família indisponível" body={error || 'Família não encontrada.'} />
      </Screen>
    );
  }

  const guardians = Array.isArray(data.guardians) ? data.guardians : [];
  const catechumens = Array.isArray(data.catechumens) ? data.catechumens : [];

  return (
    <Screen testID="family-screen">
      <ScreenTitle
        eyebrow={data.community?.name || 'Família'}
        title={data.name || 'Família'}
        subtitle={[data.address, data.city].filter(Boolean).join(', ') || undefined}
        action={onEdit ? <BrandButton variant="ghost" icon="pencil-outline" label="Editar" onPress={onEdit} testID="edit-family" style={{ marginTop: 0 }} /> : undefined}
      />
      {data.phone || data.email || data.notes ? (
        <Card>
          <KeyValue label="Telefone" value={data.phone} />
          <KeyValue label="E-mail" value={data.email} />
          <KeyValue label="Notas" value={data.notes} />
        </Card>
      ) : null}

      <SectionHeader title="Responsáveis" icon="account-supervisor-outline" action={onAddGuardian ? 'Adicionar' : undefined} onAction={onAddGuardian} />
      {guardians.length === 0 ? (
        <EmptyState icon="account-supervisor-outline" title="Sem responsáveis" body="Ainda não há responsáveis registados nesta família." action={onAddGuardian ? 'Adicionar responsável' : undefined} onAction={onAddGuardian} />
      ) : (
        <ListCard>
          {guardians.map((guardian: any, index: number) => {
            const name = fullName(guardian.user, guardian.name || 'Responsável');
            const relation = RELATION[String(guardian.relationship || guardian.relation)] || guardian.relationship;
            return (
              <ListRow
                key={guardian.id}
                testID={`guardian-${guardian.id}`}
                left={<Avatar name={name} url={guardian.user?.avatarUrl} size={36} />}
                title={name}
                subtitle={[guardian.user?.email, guardian.phone || guardian.user?.phone].filter(Boolean).join(' · ')}
                right={
                  <Row gap={4}>
                    {relation ? <Tag label={relation} tone="gold" /> : null}
                    {guardian.isPrimary ? <Tag label="Principal" tone="info" /> : null}
                  </Row>
                }
                chevron={Boolean(onEditGuardian)}
                onPress={onEditGuardian ? () => onEditGuardian(guardian) : undefined}
                last={index === guardians.length - 1}
              />
            );
          })}
        </ListCard>
      )}
      {onMessageGuardian && guardians.some((g: any) => g.user?.id) ? (
        <BrandButton variant="tonal" icon="message-text-outline" label="Enviar mensagem à família" onPress={() => onMessageGuardian(guardians.find((g: any) => g.user?.id))} />
      ) : null}

      <SectionHeader title="Catequizandos" icon="account-child-outline" />
      {catechumens.length === 0 ? (
        <EmptyState icon="account-child-outline" title="Sem catequizandos" body="Ainda não há catequizandos nesta família." />
      ) : (
        <ListCard>
          {catechumens.map((catechumen: any, index: number) => {
            const name = fullName(catechumen, 'Catequizando');
            return (
              <ListRow
                key={catechumen.id}
                testID={`family-catechumen-${catechumen.id}`}
                left={<Avatar name={name} url={catechumen.avatarUrl} size={36} />}
                title={name}
                subtitle={catechumen.enrollments?.[0]?.class?.name}
                onPress={onOpenCatechumen ? () => onOpenCatechumen(catechumen.id) : undefined}
                last={index === catechumens.length - 1}
              />
            );
          })}
        </ListCard>
      )}
      {onRemoveGuardian ? null : null}
    </Screen>
  );
}
