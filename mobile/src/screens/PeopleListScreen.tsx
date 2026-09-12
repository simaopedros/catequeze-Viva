import React from 'react';
import { Text } from 'react-native';
import type { SocialPerson } from '../api/types';
import { EmptyState, LoadingState, PersonRow, Screen, ScreenTitle } from '../components/ui';
import { colors, fonts, spacing } from '../theme';

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
}) {
  return (
    <Screen testID={testID}>
      <ScreenTitle title={title} subtitle={subtitle} />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Lista indisponível" body={error} /> : null}
      {!loading && !error && people.length === 0 ? (
        <EmptyState title={emptyTitle} body={emptyBody} />
      ) : null}
      {people.map((person) => {
        const handle = personHandle(person);
        return (
          <PersonRow
            key={person.id}
            testID={`person-${person.id}`}
            name={person.displayName}
            photoUrl={person.avatarUrl}
            hint={handle ? `@${handle}` : 'Sem handle público'}
            chip={person.followersCount != null ? `${person.followersCount} seguidores` : undefined}
            onPress={() => handle && onOpenPerson(handle)}
          />
        );
      })}
      <Text style={{ color: colors.muted, marginTop: spacing.sm, fontFamily: fonts.sans }}>
        {people.length} pessoa(s)
      </Text>
    </Screen>
  );
}
