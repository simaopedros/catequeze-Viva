import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { listWorkspaces, useAuth } from '../../src/auth/AuthContext';
import { Screen, ScreenTitle } from '../../src/components/ui';
import { colors, spacing } from '../../src/theme';

export default function WorkspaceSwitchRoute() {
  const { bootstrap, workspaceId, setWorkspaceId } = useAuth();
  const workspaces = listWorkspaces(bootstrap);

  return (
    <Screen testID="workspace-switch-screen">
      <ScreenTitle
        title="Trocar de espaço"
        subtitle="Escolha a paróquia ou comunidade que deseja gerir neste dispositivo."
      />
      {workspaces.map((workspace) => {
        const active = workspace.id === workspaceId;
        return (
          <Pressable
            key={workspace.id}
            testID={`workspace-option-${workspace.id}`}
            onPress={() => setWorkspaceId(workspace.id)}
            style={{
              minHeight: 52,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: spacing[3],
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 16, color: colors.text.primary, fontWeight: active ? '700' : '400' }}>
              {workspace.name}
            </Text>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 2,
                borderColor: active ? colors.primary[700] : colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {active ? (
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: colors.primary[700],
                  }}
                />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </Screen>
  );
}
