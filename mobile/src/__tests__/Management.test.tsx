import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { reportsToCsv } from '../screens/ReportsScreen';
import { InviteMemberScreen } from '../screens/TeamScreens';
import { SettingsScreen } from '../screens/SettingsScreen';

describe('Fase E screens', () => {
  it('exporta o ranking em CSV com cabeçalho e separador ;', () => {
    const csv = reportsToCsv([
      { id: 'c1', name: 'Turma "A"', totalEnrolled: 10, totalMeetings: 4, presentCount: 30, absentCount: 10, attendanceRate: 75.4, lastMeetingDate: '2026-09-26T12:00:00.000Z' },
    ]);
    const [header, row] = csv.split('\n');
    expect(header.startsWith('"Turma";"Inscritos"')).toBe(true);
    expect(row).toBe('"Turma ""A""";"10";"4";"30";"10";"75";"2026-09-26"');
  });

  it('valida o e-mail do convite e envia o papel escolhido', () => {
    const onSubmit = jest.fn();
    const view = render(<InviteMemberScreen assignableRoles={['LEAD_CATECHIST', 'GUARDIAN']} communities={[]} classes={[]} onSubmit={onSubmit} />);
    fireEvent.changeText(view.getByTestId('invite-email'), 'nao-e-email');
    fireEvent.press(view.getByTestId('invite-submit'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(view.getByText('Indique um e-mail válido.')).toBeTruthy();

    fireEvent.changeText(view.getByTestId('invite-email'), 'Catequista@Paroquia.pt');
    fireEvent.press(view.getByTestId('invite-submit'));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ email: 'Catequista@Paroquia.pt', role: 'LEAD_CATECHIST' }));
  });

  it('exige confirmação igual e 8 caracteres para alterar a palavra-passe', async () => {
    const onChangePassword = jest.fn().mockResolvedValue(true);
    const view = render(
      <SettingsScreen user={{ firstName: 'Ana', lastName: 'Silva', email: 'ana@p.pt' }} onSaveProfile={jest.fn()} onChangePassword={onChangePassword} twoFactor={{ enabled: false }} />,
    );
    fireEvent.changeText(view.getByTestId('settings-current-password'), 'antiga123');
    fireEvent.changeText(view.getByTestId('settings-new-password'), 'curta');
    fireEvent.changeText(view.getByTestId('settings-confirm-password'), 'curta');
    fireEvent.press(view.getByTestId('settings-change-password'));
    expect(onChangePassword).not.toHaveBeenCalled();

    fireEvent.changeText(view.getByTestId('settings-new-password'), 'novaPass123');
    fireEvent.changeText(view.getByTestId('settings-confirm-password'), 'novaPass123');
    fireEvent.press(view.getByTestId('settings-change-password'));
    await Promise.resolve();
    expect(onChangePassword).toHaveBeenCalledWith('antiga123', 'novaPass123');
    expect(view.getByText('Inativa')).toBeTruthy();
  });
});
