import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { BrandButton, Card, EmptyState, Icon, PrimaryFab, Row, Screen, ScreenTitle, SkeletonList, Tag } from '../components/ui';
import { colors, spacing } from '../theme';
import { formatRelative, fullName } from '../utils/format';

export function AnnouncementsScreen({
  items,
  loading,
  error,
  onAcknowledge,
  busyId,
  refreshing,
  onRefresh,
  onCreate,
}: {
  items: any[];
  loading?: boolean;
  error?: string | null;
  onAcknowledge?: (id: string) => void;
  busyId?: string | null;
  refreshing?: boolean;
  onRefresh?: () => void;
  onCreate?: () => void;
}) {
  const pending = items.filter((item) => !item.acknowledged).length;
  return (
    <Screen
      testID="announcements-screen"
      refreshing={refreshing}
      onRefresh={onRefresh}
      fab={onCreate ? <PrimaryFab icon="bullhorn-outline" label="Novo aviso" onPress={onCreate} testID="create-announcement" /> : undefined}
    >
      <ScreenTitle title="Avisos pastorais" subtitle={pending > 0 ? `${pending} por confirmar` : 'Comunicações da coordenação e da diocese.'} />
      {loading && items.length === 0 ? <SkeletonList rows={3} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Avisos indisponíveis" body={error} /> : null}
      {!loading && !error && items.length === 0 ? <EmptyState icon="bullhorn-outline" title="Sem avisos" body="Quando a coordenação publicar um aviso, aparece aqui." /> : null}
      {items.map((item) => {
        const done = Boolean(item.acknowledged);
        return (
          <Card key={item.id} testID={`announcement-${item.id}`} style={!done ? { borderColor: colors.gold } : undefined}>
            <Row style={{ alignItems: 'flex-start' }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: done ? colors.cream : '#F8E7BF', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="bullhorn-outline" size={19} color={done ? colors.muted : colors.goldDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text variant="titleSmall" style={{ color: colors.ink, flex: 1 }}>
                    {item.title}
                  </Text>
                  {item.inherited ? <Tag label={item.originLabel || 'Diocese'} tone="info" /> : null}
                </Row>
                {item.body ? (
                  <Text variant="bodyMedium" style={{ color: colors.inkSoft, marginTop: 4, lineHeight: 21 }}>
                    {item.body}
                  </Text>
                ) : null}
                <Text variant="labelSmall" style={{ color: colors.muted, marginTop: 6 }}>
                  {[fullName(item.createdBy, ''), formatRelative(item.publishedAt || item.createdAt), item._count?.acknowledgements != null ? `${item._count.acknowledgements} confirmações` : null].filter(Boolean).join(' · ')}
                </Text>
                {!done && onAcknowledge ? (
                  <BrandButton variant="tonal" icon="check" label={busyId === item.id ? 'A confirmar…' : 'Li e compreendi'} disabled={Boolean(busyId)} onPress={() => onAcknowledge(item.id)} testID={`ack-${item.id}`} />
                ) : done ? (
                  <Row style={{ marginTop: spacing.xs }}>
                    <Icon name="check-circle" size={16} color={colors.success} />
                    <Text variant="labelSmall" style={{ color: colors.success }}>
                      Confirmado
                    </Text>
                  </Row>
                ) : null}
              </View>
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}
