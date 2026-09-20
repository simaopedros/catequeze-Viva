import React from 'react';
import type { SocialPerson } from '../api/types';
import { AppText, EmptyState, ErrorState, ListRow, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { copy } from '../copy/ptBR';

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
  onRefresh,
  refreshing,
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
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <Screen testID={testID} onRefresh={onRefresh} refreshing={refreshing}>
      <ScreenTitle title={title} subtitle={subtitle} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.people.errorTitle} body={error} /> : null}
      {!loading && !error && people.length === 0 ? <EmptyState title={emptyTitle} body={emptyBody} /> : null}
      {people.map((person) => {
        const handle = personHandle(person);
        return (
          <ListRow
            key={person.id}
            testID={`person-${person.id}`}
            title={person.displayName}
            meta={
              handle
                ? `@${handle}${person.followersCount != null ? ` · ${person.followersCount} seguidores` : ''}`
                : copy.profile.noHandle
            }
            onPress={() => handle && onOpenPerson(handle)}
          />
        );
      })}
      <AppText variant="caption" color="secondary">
        {copy.common.peopleCount(people.length)}
      </AppText>
    </Screen>
  );
}
