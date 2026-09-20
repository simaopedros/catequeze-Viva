import { AppText, BrandButton, EmptyState, ErrorState, Field, GroupedList, ListRow, LoadingState, ReaderFrame, Screen, ScreenTitle } from '../components/ui';
import { copy } from '../copy/ptBR';
import { asItems } from '../format';

export function GroupDetailScreen({
  group,
  loading,
  error,
  onJoin,
  onLeave,
  notice,
  onNotice,
  onPostNotice,
}: {
  group: any;
  loading?: boolean;
  error?: string | null;
  onJoin: () => void;
  onLeave: () => void;
  notice?: string;
  onNotice?: (value: string) => void;
  onPostNotice?: () => void;
}) {
  const notices = asItems(group?.notices);
  const members = asItems(group?.members);
  return (
    <Screen testID="group-detail-screen">
      <ScreenTitle title={group?.name || copy.groups.title} subtitle={group?.description || group?.kind} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.catalog.error} body={error} /> : null}
      {group?.myStatus === 'ACTIVE' ? (
        <BrandButton variant="ghost" label={copy.groups.leave} onPress={onLeave} />
      ) : (
        <BrandButton label={copy.groups.join} onPress={onJoin} />
      )}
      {onPostNotice && onNotice ? (
        <>
          <Field label={copy.groups.notice} value={notice || ''} onChangeText={onNotice} placeholder={copy.groups.noticePlaceholder} multiline />
          <BrandButton variant="ghost" label={copy.groups.postNotice} onPress={onPostNotice} disabled={!notice?.trim()} />
        </>
      ) : null}
      <GroupedList header={copy.groups.notice}>
        {notices.length === 0 ? <ListRow title="—" accessory={false} /> : notices.map((notice: any) => (
          <ListRow key={notice.id} title={notice.body || notice.title} accessory={false} />
        ))}
      </GroupedList>
      <GroupedList header={copy.people.membersTitle}>
        {members.map((member: any) => (
          <ListRow
            key={member.id || member.userId}
            title={member.displayName || member.name || member.email || 'Membro'}
            accessory={false}
          />
        ))}
      </GroupedList>
    </Screen>
  );
}

export function AnnouncementDetailScreen({
  item,
  onAck,
}: {
  item: any;
  onAck: () => void;
}) {
  if (!item) {
    return (
      <Screen>
        <EmptyState title={copy.announcements.emptyTitle} body={copy.announcements.emptyBody} />
      </Screen>
    );
  }
  return (
    <Screen>
      <ScreenTitle title={item.title} subtitle={item.createdBy?.firstName} />
      <ListRow title={item.body} accessory={false} />
      {item.acknowledged ? (
        <ListRow title={copy.announcements.acknowledged} accessory={false} />
      ) : (
        <BrandButton label={copy.announcements.acknowledge} onPress={onAck} />
      )}
    </Screen>
  );
}

export function ReaderScreen({
  title,
  body,
  loading,
  error,
}: {
  title: string;
  body?: string;
  loading?: boolean;
  error?: string | null;
}) {
  return (
    <Screen tone="paper">
      <ScreenTitle title={title} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.catalog.error} body={error} /> : null}
      {body ? (
        <ReaderFrame>
          <AppText variant="body">{body}</AppText>
        </ReaderFrame>
      ) : null}
    </Screen>
  );
}
