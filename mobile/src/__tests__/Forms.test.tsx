import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ClassFormScreen } from '../screens/ClassFormScreen';
import { MeetingFormScreen } from '../screens/MeetingFormScreen';
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { permissionsFor } from '../auth/permissions';

describe('Fase B forms', () => {
  it('valida o nome da turma antes de submeter', () => {
    const onSubmit = jest.fn();
    const view = render(<ClassFormScreen mode="create" communities={[]} onSubmit={onSubmit} />);

    fireEvent.changeText(view.getByTestId('class-name'), 'AB');
    fireEvent.press(view.getByTestId('class-submit'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(view.getByText('O nome deve ter pelo menos 3 caracteres.')).toBeTruthy();

    fireEvent.changeText(view.getByTestId('class-name'), 'Turma Crisma');
    fireEvent.press(view.getByTestId('class-submit'));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Turma Crisma', maxCapacity: 30 }));
  });

  it('exige data no encontro e preenche valores iniciais na edição', () => {
    const onSubmit = jest.fn();
    const view = render(<MeetingFormScreen mode="create" onSubmit={onSubmit} />);
    fireEvent.changeText(view.getByTestId('meeting-title'), 'Encontro de Advento');
    fireEvent.press(view.getByTestId('meeting-submit'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(view.getByText('Escolha a data do encontro.')).toBeTruthy();

    const edit = render(
      <MeetingFormScreen mode="edit" initial={{ title: 'Já existe', date: '2026-10-03T10:00:00.000Z' }} onSubmit={onSubmit} />,
    );
    expect(edit.getByTestId('meeting-title').props.value).toBe('Já existe');
    fireEvent.press(edit.getByTestId('meeting-submit'));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Já existe' }));
  });

  it('grava presenças em lote a partir da folha do encontro', async () => {
    const onSaveAll = jest.fn().mockResolvedValue(undefined);
    const view = render(
      <AttendanceScreen
        meeting={{
          title: 'Encontro',
          participants: [
            { catechumenProfileId: 'p1', firstName: 'Ana', lastName: 'Silva', status: null },
            { catechumenProfileId: 'p2', firstName: 'Bento', lastName: 'Sousa', status: 'PRESENT' },
          ],
        }}
        onSave={jest.fn()}
        onSaveAll={onSaveAll}
      />,
    );

    expect(view.getByText('Tudo gravado')).toBeTruthy();
    fireEvent.press(view.getAllByTestId('status-ABSENT')[0]);
    fireEvent.press(view.getByTestId('save-all'));
    await Promise.resolve();
    expect(onSaveAll).toHaveBeenCalledWith([{ catechumenProfileId: 'p1', status: 'ABSENT' }]);
  });

  it('deriva permissões por papel no workspace', () => {
    const bootstrap = { workspaces: [{ id: 'ws', name: 'Paróquia', role: 'ASSISTANT_CATECHIST' } as any] };
    const assistant = permissionsFor(bootstrap, 'ws');
    expect(assistant.canOperate).toBe(true);
    expect(assistant.canManageClasses).toBe(false);
    const coordinator = permissionsFor({ workspaces: [{ id: 'ws', name: 'P', role: 'PARISH_COORDINATOR' } as any] }, 'ws');
    expect(coordinator.canManageClasses).toBe(true);
    expect(coordinator.canManageTeam).toBe(true);
    const guardian = permissionsFor({ workspaces: [{ id: 'ws', name: 'P', role: 'GUARDIAN' } as any] }, 'ws');
    expect(guardian.canOperate).toBe(false);
    expect(guardian.isFamily).toBe(true);
  });
});
