import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { reportsToCsv } from '../screens/ReportsScreen';
import { InviteMemberScreen } from '../screens/TeamScreens';
import { SettingsScreen } from '../screens/SettingsScreen';
import { FormationScreen, GroupsScreen, SupportScreen } from '../screens/SecondaryScreens';
import { ClassDetailScreen } from '../screens/ClassDetailScreen';

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

  it('alterna consentimentos LGPD nas definições', () => {
    const onToggleConsent = jest.fn();
    const view = render(
      <SettingsScreen
        user={{ firstName: 'Ana', lastName: 'Silva', email: 'ana@p.pt' }}
        onSaveProfile={jest.fn()}
        onChangePassword={jest.fn()}
        consents={{ IMAGE_USAGE: false }}
        onToggleConsent={onToggleConsent}
      />,
    );
    fireEvent.press(view.getByTestId('consent-IMAGE_USAGE'));
    expect(onToggleConsent).toHaveBeenCalledWith('IMAGE_USAGE', true);
  });

  it('inscreve e cancela formação, entra e sai de grupos, e envia pedido de suporte', async () => {
    const onEnroll = jest.fn();
    const onUnenroll = jest.fn();
    const onJoin = jest.fn();
    const onLeave = jest.fn();
    const onSubmit = jest.fn().mockResolvedValue(true);

    const formation = render(
      <FormationScreen
        items={[
          { id: 't1', name: 'Iniciação', kind: 'INITIAL', active: true },
          { id: 't2', name: 'Contínua', kind: 'CONTINUING', myEnrollment: { status: 'ENROLLED' } },
        ]}
        onEnroll={onEnroll}
        onUnenroll={onUnenroll}
      />,
    );
    fireEvent.press(formation.getByTestId('enroll-track-t1'));
    fireEvent.press(formation.getByTestId('unenroll-track-t2'));
    expect(onEnroll).toHaveBeenCalledWith('t1');
    expect(onUnenroll).toHaveBeenCalledWith('t2');
    formation.unmount();

    const groups = render(
      <GroupsScreen
        items={[
          { id: 'g1', name: 'Jovens', visibility: 'PUBLIC', memberCount: 4 },
          { id: 'g2', name: 'Liturgia', visibility: 'PUBLIC', myStatus: 'ACTIVE', memberCount: 8 },
        ]}
        onJoin={onJoin}
        onLeave={onLeave}
      />,
    );
    fireEvent.press(groups.getByTestId('join-group-g1'));
    fireEvent.press(groups.getByTestId('leave-group-g2'));
    expect(onJoin).toHaveBeenCalledWith('g1');
    expect(onLeave).toHaveBeenCalledWith('g2');
    groups.unmount();

    const support = render(
      <SupportScreen items={[]} defaultName="Ana Silva" defaultEmail="ana@p.pt" onSubmit={onSubmit} />,
    );
    fireEvent.changeText(support.getByTestId('support-message'), 'Preciso de ajuda com o login.');
    fireEvent.press(support.getByTestId('support-submit'));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Ana Silva',
        email: 'ana@p.pt',
        message: 'Preciso de ajuda com o login.',
      }),
    );
  });

  it('mostra o plano mensal da turma e abre o encontro', () => {
    const onOpenMeeting = jest.fn();
    const view = render(
      <ClassDetailScreen
        data={{ name: 'Crisma 2026', status: 'ACTIVE', community: { name: 'São José' } }}
        plan={{
          month: 8,
          year: 2026,
          weeks: [
            {
              weekStart: '2026-09-01T00:00:00.000Z',
              meetings: [{ id: 'm1', title: 'Encontro 1', date: '2026-09-06T16:00:00.000Z', status: 'SCHEDULED' }],
            },
          ],
        }}
        onOpenMeeting={onOpenMeeting}
      />,
    );
    expect(view.getByText('Plano · Setembro 2026')).toBeTruthy();
    expect(view.getByTestId('class-community')).toBeTruthy();
    expect(view.getByText('Comunidade')).toBeTruthy();
    expect(view.getAllByText('São José').length).toBeGreaterThan(0);
    fireEvent.press(view.getByTestId('plan-meeting-m1'));
    expect(onOpenMeeting).toHaveBeenCalledWith('m1');
  });
});
