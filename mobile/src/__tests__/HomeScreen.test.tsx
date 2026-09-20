import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { focusMeetingStatusLabel, HomeScreen } from '../screens/HomeScreen';
import { MessagesScreen } from '../screens/MessagesScreen';

describe('focusMeetingStatusLabel', () => {
  const now = new Date('2026-09-19T20:00:00.000Z');

  it('usa o estado operacional quando o encontro está a decorrer ou concluído', () => {
    expect(focusMeetingStatusLabel({ status: 'IN_PROGRESS', date: '2026-06-14T16:00:00.000Z' }, now)).toBe('A decorrer');
    expect(focusMeetingStatusLabel({ status: 'COMPLETED', date: '2026-06-14T16:00:00.000Z' }, now)).toBe('Concluído');
  });

  it('marca encontros passados por concluir em vez de agendados', () => {
    expect(focusMeetingStatusLabel({ status: 'SCHEDULED', date: '2026-06-14T16:00:00.000Z' }, now)).toBe('Por concluir');
    expect(focusMeetingStatusLabel({ status: 'SCHEDULED', date: '2026-10-04T16:00:00.000Z' }, now)).toBe('Agendado');
  });
});

describe('HomeScreen layout', () => {
  it('mostra rótulos dos indicadores, pesquisa curta e avisos sem truncar', () => {
    const onAcknowledge = jest.fn();
    const onOpenAnnouncements = jest.fn();
    const view = render(
      <HomeScreen
        name="Catequista Lead"
        stats={{ activeClasses: 2, activeCatechumens: 8, avgAttendance: 57, upcomingMeetings: [] }}
        onOpenMeeting={jest.fn()}
        onOpenCommunity={jest.fn()}
        onOpenNotifications={jest.fn()}
        onOpenClasses={jest.fn()}
        onSearch={jest.fn()}
        onOpenAttendance={jest.fn()}
        onAcknowledgeAnnouncement={onAcknowledge}
        onOpenAnnouncements={onOpenAnnouncements}
        announcements={[
          { id: 'a1', title: 'Aviso mobile', body: 'Reunião de catequistas sábado.', acknowledged: false },
          { id: 'a2', title: 'Segundo aviso', acknowledged: false },
        ]}
        focus={{
          focusKind: 'recent',
          meeting: {
            id: 'm1',
            title: 'Encontro 2 - A Crisma e o Compromisso',
            status: 'SCHEDULED',
            date: '2026-06-14T16:00:00.000Z',
            class: { id: 'c1', name: 'Turma Crisma 2026' },
          },
        }}
      />,
    );

    expect(view.getByText('Turmas')).toBeTruthy();
    expect(view.getByText('Catequizandos')).toBeTruthy();
    expect(view.getByText('2')).toBeTruthy();
    expect(view.getByText('8')).toBeTruthy();
    expect(view.getByPlaceholderText('Pesquisar turmas e pessoas')).toBeTruthy();
    expect(view.queryByText('Li e compreendi')).toBeNull();
    expect(view.getByText('Entendi')).toBeTruthy();
    expect(view.getByText('+1 aviso')).toBeTruthy();
    expect(view.getByText('Por concluir')).toBeTruthy();
    expect(view.getByText('Marcar presenças')).toBeTruthy();
    expect(view.queryByText('Agendado')).toBeNull();
    expect(view.getByText('Sem mais encontros à vista')).toBeTruthy();

    fireEvent.press(view.getByTestId('ack-announcement'));
    expect(onAcknowledge).toHaveBeenCalledWith('a1');
    fireEvent.press(view.getByTestId('open-announcements'));
    expect(onOpenAnnouncements).toHaveBeenCalled();
  });
});

describe('MessagesScreen', () => {
  it('oferece o FAB Nova conversa', () => {
    const onNew = jest.fn();
    const view = render(
      <MessagesScreen payload={{ items: [] }} onOpen={jest.fn()} onNewConversation={onNew} />,
    );
    expect(view.getByText('Nova conversa')).toBeTruthy();
    fireEvent.press(view.getByTestId('new-conversation'));
    expect(onNew).toHaveBeenCalled();
  });
});
