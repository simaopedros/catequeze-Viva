import React from 'react';
import { Text } from 'react-native-paper';
import type { SocialPerson } from '../api/types';
import { Avatar } from '../components/Avatar';
import { BrandButton, EmptyState, ListCard, ListRow, Screen, ScreenTitle, SkeletonList } from '../components/ui';
import { colors, spacing } from '../theme';

export function personHandle(person: SocialPerson) {
  return person.socialHandle || person.handle || null;
}

export function PeopleListScreen({
  title,
  subtitle,
  people,
  loading,
  error,
  emptyTitle,
  emptyBody,
  onOpenPerson,
  testID,
  hasMore,
  loadingMore,
  onLoadMore,
  refreshing,
  onRefresh,
}: {
  title: string;
  subtitle: string;
  people: SocialPerson[];
  loading?: boolean;
  error?: string | null;
  emptyTitle: string;
  emptyBody: string;
  onOpenPerson: (handle: string) => void;
  testID?: string;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <Screen testID={testID} refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenTitle title={title} subtitle={subtitle} />
      {loading && people.length === 0 ? <SkeletonList rows={4} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Lista indisponível" body={error} /> : null}
      {!loading && !error && people.length === 0 ? <EmptyState icon="account-search-outline" title={emptyTitle} body={emptyBody} /> : null}
      {people.length > 0 ? (
        <ListCard>
          {people.map((person, index) => {
            const handle = personHandle(person);
            return (
              <ListRow
                key={person.id}
                testID={`person-${person.id}`}
                left={<Avatar name={person.displayName} url={person.avatarUrl} size={40} />}
                title={person.displayName}
                subtitle={[handle ? `@${handle}` : 'Sem handle público', person.followersCount != null ? `${person.followersCount} seguidores` : null].filter(Boolean).join(' · ')}
                onPress={handle ? () => onOpenPerson(handle) : undefined}
                last={index === people.length - 1}
              />
            );
          })}
        </ListCard>
      ) : null}
      {people.length > 0 ? (
        <Text variant="labelSmall" style={{ color: colors.muted, marginTop: spacing.xs, textAlign: 'center' }}>
          {people.length} pessoa(s)
        </Text>
      ) : null}
      {hasMore && onLoadMore ? (
        <BrandButton variant="ghost" testID="load-more" label={loadingMore ? 'A carregar…' : 'Carregar mais'} disabled={loadingMore} loading={loadingMore} onPress={onLoadMore} />
      ) : null}
    </Screen>
  );
}
