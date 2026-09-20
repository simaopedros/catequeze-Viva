import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Chip, ListRow } from '../components/ui';
import { colors } from '../theme';
import { ATTENDANCE_STATUSES, copy } from '../copy/ptBR';
import { MoreScreen } from '../screens/MoreScreen';
import { AttendanceScreen } from '../screens/AttendanceScreen';

function flattenStyle(style: unknown): Record<string, unknown> {
  if (!style) return {};
  if (typeof style === 'function') return flattenStyle(style({ pressed: false }));
  if (Array.isArray(style)) return Object.assign({}, ...style.map((item) => flattenStyle(item)));
  if (typeof style === 'object') return style as Record<string, unknown>;
  return {};
}

function styleOf(view: ReturnType<typeof render>, testID: string) {
  return flattenStyle(view.getByTestId(testID).props.style);
}

describe('design system primitives', () => {
  it('keeps selected chips in the gold family instead of navy', () => {
    const view = render(
      <>
        <Chip label="Recentes" active onPress={() => undefined} testID="chip-on" />
        <Chip label="Em alta" onPress={() => undefined} testID="chip-off" />
      </>,
    );

    const active = styleOf(view, 'chip-on');
    const idle = styleOf(view, 'chip-off');
    expect(active.backgroundColor).toBe(colors.goldSoft);
    expect(active.borderColor).toBe(colors.gold);
    expect(active.backgroundColor).not.toBe(colors.ink);
    expect(idle.backgroundColor).toBe(colors.elevated);
  });

  it('fires list row presses', () => {
    const onPress = jest.fn();
    const view = render(<ListRow title="Turma A" meta="Paróquia" testID="row" onPress={onPress} />);
    fireEvent.press(view.getByTestId('row'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('copy catalog', () => {
  it('translates attendance statuses to Portuguese', () => {
    expect(ATTENDANCE_STATUSES.map((id) => copy.attendance.statuses[id])).toEqual([
      'Presente',
      'Falta',
      'Atraso',
      'Justificado',
    ]);
  });
});

describe('More screen', () => {
  it('does not duplicate profile editing fields', () => {
    const view = render(
      <MoreScreen
        name="Ana"
        workspaces={[{ id: 'w1', name: 'Paróquia São José' } as any]}
        workspaceId="w1"
        profile={{ handle: 'ana' } as any}
        onSelectWorkspace={jest.fn()}
        onOpenBible={jest.fn()}
        onOpenDocuments={jest.fn()}
        onOpenEditProfile={jest.fn()}
        onOpenProfile={jest.fn()}
        onLogout={jest.fn()}
      />,
    );

    expect(view.queryByTestId('profile-handle')).toBeNull();
    expect(view.getByTestId('open-edit-profile')).toBeTruthy();
    expect(view.getByText('Espaço de trabalho')).toBeTruthy();
  });
});

describe('Attendance screen', () => {
  it('renders Portuguese status chips', () => {
    const view = render(
      <AttendanceScreen
        meeting={{
          attendance: [{ catechumenProfileId: 'c1', displayName: 'João', status: 'PRESENT' }],
        }}
        onSave={jest.fn()}
      />,
    );

    expect(view.getByText('Presente')).toBeTruthy();
    expect(view.getByText('Falta')).toBeTruthy();
    expect(view.queryByText('PRESENT')).toBeNull();
  });
});
