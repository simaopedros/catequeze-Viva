import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { EntityFormScreen } from '../screens/EntityFormScreen';
import { ClassesScreen } from '../screens/ClassesScreen';
import { canManagePastoral } from '../lib/roleAccess';

describe('EntityFormScreen', () => {
  it('creates a meeting without technical kind/sourceId fields', async () => {
    const api = {
      createMeeting: jest.fn().mockResolvedValue({ id: 'm1' }),
    } as any;
    const onDone = jest.fn();
    const view = render(
      <EntityFormScreen
        kind="meeting"
        extras={{ classId: 'class-1' }}
        api={api}
        workspaceId="ws-1"
        onDone={onDone}
      />,
    );

    expect(view.getByText('Novo encontro')).toBeTruthy();
    expect(view.queryByText(/kind/i)).toBeNull();
    expect(view.queryByText(/sourceId/i)).toBeNull();
    fireEvent.changeText(view.getByTestId('field-title'), 'Encontro 3');
    fireEvent.changeText(view.getByTestId('field-date'), '2026-09-20');
    fireEvent.press(view.getByTestId('form-submit'));
    await waitFor(() => expect(api.createMeeting).toHaveBeenCalled());
    expect(api.createMeeting.mock.calls[0][0]).toMatchObject({
      title: 'Encontro 3',
      date: '2026-09-20',
      classId: 'class-1',
    });
  });
});

describe('class CRUD visibility', () => {
  it('shows create for catechists and hides it from the family portal', () => {
    expect(canManagePastoral('LEAD_CATECHIST')).toBe(true);
    expect(canManagePastoral('GUARDIAN')).toBe(false);

    const staff = render(
      <ClassesScreen payload={[]} canWrite onCreate={jest.fn()} onOpen={jest.fn()} />,
    );
    expect(staff.getByTestId('crud-create')).toBeTruthy();
    expect(staff.getByText('Nova turma')).toBeTruthy();

    const family = render(<ClassesScreen payload={[]} canWrite={false} onOpen={jest.fn()} />);
    expect(family.queryByTestId('crud-create')).toBeNull();
  });
});
