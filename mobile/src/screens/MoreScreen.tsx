import React, { useState } from 'react';
import type { Workspace } from '../api/types';
import { BrandButton, ConfirmSheet, GroupedList, ListRow, Screen, ScreenTitle } from '../components/ui';
import { copy } from '../copy/ptBR';
import { NAV_GROUP_LABELS, labelFor, type VisibleNavGroup } from '../navigation/visible';
import { NAV_ICON } from '../navigation/destinations';

export function MoreScreen({
  name,
  workspaces,
  workspaceId,
  groups,
  onSelectWorkspace,
  onOpenItem,
  onLogout,
}: {
  name: string;
  workspaces: Workspace[];
  workspaceId: string | null;
  groups: VisibleNavGroup[];
  onSelectWorkspace: (id: string) => void;
  onOpenItem: (iconKey: string) => void;
  onLogout: () => void;
}) {
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <Screen testID="more-screen">
      <ScreenTitle title={copy.more.title} subtitle={name} />
      {groups.map((group) => (
        <GroupedList key={group.id} header={NAV_GROUP_LABELS[group.id]}>
          {group.items.map((item) => (
            <ListRow
              key={item.iconKey}
              icon={NAV_ICON[item.iconKey] || 'ellipse-outline'}
              title={labelFor(item.iconKey)}
              onPress={() => onOpenItem(item.iconKey)}
              testID={`more-${item.iconKey}`}
            />
          ))}
        </GroupedList>
      ))}
      <GroupedList header="Pastoral">
        <ListRow
          icon="gift-outline"
          title={copy.birthdays.title}
          onPress={() => onOpenItem('birthdays')}
          testID="more-birthdays"
        />
      </GroupedList>
      <GroupedList header={copy.more.workspace}>
        {workspaces.map((workspace) => (
          <ListRow
            key={workspace.id}
            icon="business-outline"
            title={workspace.name}
            selected={workspace.id === workspaceId}
            onPress={() => onSelectWorkspace(workspace.id)}
          />
        ))}
      </GroupedList>
      <BrandButton variant="danger" label={copy.more.logout} onPress={() => setConfirmLogout(true)} />
      <ConfirmSheet
        visible={confirmLogout}
        title={copy.more.logoutTitle}
        body={copy.more.logoutBody}
        danger
        confirmLabel={copy.more.logout}
        onConfirm={() => {
          setConfirmLogout(false);
          onLogout();
        }}
        onCancel={() => setConfirmLogout(false)}
      />
    </Screen>
  );
}
