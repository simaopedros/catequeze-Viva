import React from 'react';
import {
  BrandButton,
  EmptyState,
  ErrorState,
  Field,
  GroupedList,
  ListRow,
  LoadingState,
  Screen,
  ScreenTitle,
} from '../components/ui';
import { copy } from '../copy/ptBR';
import { asItems, displayPerson, formatDay, formatWhen } from '../format';

export function CatalogListScreen({
  title,
  subtitle,
  payload,
  loading,
  error,
  mapItem,
  onOpen,
  onCreate,
  createLabel,
  onSecondary,
  secondaryLabel,
  emptyTitle = copy.catalog.empty,
  onRefresh,
  refreshing,
  testID,
}: {
  title: string;
  subtitle?: string;
  payload: unknown;
  loading?: boolean;
  error?: string | null;
  mapItem?: (item: any) => { id: string; title: string; meta?: string };
  onOpen?: (id: string, item: any) => void;
  onCreate?: () => void;
  createLabel?: string;
  onSecondary?: () => void;
  secondaryLabel?: string;
  emptyTitle?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  testID?: string;
}) {
  const items = asItems(payload);
  return (
    <Screen testID={testID} onRefresh={onRefresh} refreshing={refreshing}>
      <ScreenTitle title={title} subtitle={subtitle} />
      {onCreate ? <BrandButton label={createLabel || copy.people.create} onPress={onCreate} /> : null}
      {onSecondary ? <BrandButton variant="ghost" label={secondaryLabel || copy.catalog.open} onPress={onSecondary} /> : null}
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.catalog.error} body={error} /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState title={emptyTitle} body={copy.catalog.empty} />
      ) : (
        <GroupedList>
          {items.map((item) => {
            const mapped = mapItem
              ? mapItem(item)
              : {
                  id: String(item.id),
                  title: displayPerson(item) || item.title || item.name || copy.catalog.open,
                  meta: item.meta || item.email || item.status || undefined,
                };
            return (
              <ListRow
                key={mapped.id}
                title={mapped.title}
                meta={mapped.meta}
                onPress={onOpen ? () => onOpen(mapped.id, item) : undefined}
                accessory={Boolean(onOpen)}
              />
            );
          })}
        </GroupedList>
      )}
    </Screen>
  );
}

export function CalendarScreen({
  payload,
  loading,
  error,
  onOpenMeeting,
  onCreate,
  name,
  date,
  onName,
  onDate,
  onRefresh,
  refreshing,
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  onOpenMeeting: (id: string) => void;
  onCreate?: () => void;
  name?: string;
  date?: string;
  onName?: (value: string) => void;
  onDate?: (value: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const events = asItems(payload?.events);
  const meetings = asItems(payload?.meetings);
  return (
    <Screen testID="calendar-screen" onRefresh={onRefresh} refreshing={refreshing}>
      <ScreenTitle title={copy.calendar.title} subtitle={copy.calendar.subtitle} />
      {onCreate && onName && onDate ? (
        <>
          <Field label={copy.calendar.eventName} value={name} onChangeText={onName} />
          <Field label={copy.calendar.eventDate} value={date} onChangeText={onDate} placeholder="2026-09-21" />
          <BrandButton label={copy.calendar.newEvent} onPress={onCreate} disabled={!name || !date} />
        </>
      ) : null}
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.catalog.error} body={error} /> : null}
      <GroupedList header={copy.calendar.meetings}>
        {meetings.length === 0 ? (
          <ListRow title={copy.calendar.emptyTitle} meta={copy.calendar.emptyBody} accessory={false} />
        ) : (
          meetings.map((meeting: any) => (
            <ListRow
              key={meeting.id}
              title={meeting.title || meeting.theme || copy.home.meetingFallback}
              meta={formatWhen(meeting.startsAt)}
              onPress={() => onOpenMeeting(meeting.id)}
            />
          ))
        )}
      </GroupedList>
      <GroupedList header={copy.calendar.liturgical}>
        {events.map((event: any) => (
          <ListRow
            key={event.id}
            title={event.name || event.title}
            meta={formatDay(event.date)}
            accessory={false}
          />
        ))}
      </GroupedList>
    </Screen>
  );
}

export function FormScreen({
  title,
  subtitle,
  fields,
  onSubmit,
  busy,
  error,
  submitLabel,
}: {
  title: string;
  subtitle?: string;
  fields: { key: string; label: string; value: string; onChange: (value: string) => void; multiline?: boolean }[];
  onSubmit: () => void;
  busy?: boolean;
  error?: string | null;
  submitLabel?: string;
}) {
  return (
    <Screen>
      <ScreenTitle title={title} subtitle={subtitle} />
      {error ? <ErrorState title={copy.catalog.error} body={error} /> : null}
      {fields.map((field) => (
        <Field
          key={field.key}
          label={field.label}
          value={field.value}
          onChangeText={field.onChange}
          multiline={field.multiline}
          testID={`field-${field.key}`}
        />
      ))}
      <BrandButton label={busy ? copy.common.saving : submitLabel || copy.common.save} disabled={busy} onPress={onSubmit} />
    </Screen>
  );
}
