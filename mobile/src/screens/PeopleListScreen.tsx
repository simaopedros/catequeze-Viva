import React from 'react';
import { Pressable, Text } from 'react-native';
import type { SocialPerson } from '../api/types';
import { Card, EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';
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
          <Pressable
            key={person.id}
            testID={`person-${person.id}`}
            onPress={() => handle && onOpenPerson(handle)}
            disabled={!handle}
          >
            <Card>
              <Text style={{ color: colors.ink, fontWeight: '700' }}>{person.displayName}</Text>
              <Text style={{ color: colors.goldDark, marginTop: 2 }}>
                {handle ? `@${handle}` : 'Sem handle público'}
                {person.followersCount != null ? ` · ${person.followersCount} seguidores` : ''}
              </Text>
            </Card>
          </Pressable>
        );
      })}
      <Text style={{ color: colors.muted, marginTop: spacing.sm }}>{people.length} pessoa(s)</Text>
    </Screen>
  );
}
