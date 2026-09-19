import React from 'react';
import { Checkbox } from 'react-native-paper';
import { Avatar } from '../components/Avatar';
import { EmptyState, FilterChips, ListCard, ListRow, Screen, ScreenTitle, SkeletonList, Tag } from '../components/ui';
import { colors } from '../theme';
import { formatDate } from '../utils/format';

type Birthday = {
  catechumenId: string;
  name: string;
  photoUrl?: string | null;
  nextBirthday: string;
  age: number;
  className?: string;
  giftDelivered?: boolean;
};

function daysUntil(value: string): number {
  const target = new Date(value);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

export function BirthdaysScreen({
  items,
  loading,
  error,
  days,
  onChangeDays,
  onToggleGift,
  busyId,
  onOpenCatechumen,
  refreshing,
  onRefresh,
  canManage,
}: {
  items: Birthday[];
  loading?: boolean;
  error?: string | null;
  days: number;
  onChangeDays: (days: number) => void;
  onToggleGift?: (catechumenId: string) => void;
  busyId?: string | null;
  onOpenCatechumen?: (id: string) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  canManage?: boolean;
}) {
  return (
    <Screen testID="birthdays-screen" refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenTitle title="Aniversários" subtitle="Lembre-se de felicitar os catequizandos." />
      <FilterChips
        value={String(days)}
        onChange={(value) => onChangeDays(Number(value))}
        options={[
          { value: '7', label: 'Esta semana' },
          { value: '30', label: '30 dias' },
          { value: '90', label: '3 meses' },
        ]}
      />
      {loading && items.length === 0 ? <SkeletonList rows={4} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Aniversários indisponíveis" body={error} /> : null}
      {!loading && !error && items.length === 0 ? <EmptyState icon="cake-variant-outline" title="Sem aniversários" body="Nenhum catequizando faz anos neste período." /> : null}
      {items.length > 0 ? (
        <ListCard>
          {items.map((item, index) => {
            const remaining = daysUntil(item.nextBirthday);
            const label = remaining === 0 ? 'Hoje!' : remaining === 1 ? 'Amanhã' : `em ${remaining} dias`;
            return (
              <ListRow
                key={item.catechumenId}
                testID={`birthday-${item.catechumenId}`}
                left={<Avatar name={item.name} url={item.photoUrl} size={38} />}
                title={item.name}
                subtitle={[item.className, `faz ${item.age} anos · ${formatDate(item.nextBirthday)}`].filter(Boolean).join(' · ')}
                right={
                  <>
                    <Tag label={label} tone={remaining === 0 ? 'gold' : remaining <= 7 ? 'warning' : 'neutral'} />
                    {canManage && onToggleGift ? (
                      <Checkbox
                        status={item.giftDelivered ? 'checked' : 'unchecked'}
                        color={colors.gold}
                        uncheckedColor={colors.line}
                        disabled={busyId === item.catechumenId}
                        onPress={() => onToggleGift(item.catechumenId)}
                        testID={`gift-${item.catechumenId}`}
                      />
                    ) : null}
                  </>
                }
                chevron={false}
                onPress={onOpenCatechumen ? () => onOpenCatechumen(item.catechumenId) : undefined}
                last={index === items.length - 1}
              />
            );
          })}
        </ListCard>
      ) : null}
    </Screen>
  );
}
