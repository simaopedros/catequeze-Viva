import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CatechumenDetailScreen } from '../screens/CatechumenDetailScreen';

const profile = {
  id: 'p1',
  firstName: 'Ana',
  lastName: 'Silva',
  email: 'ana@exemplo.com',
  birthDate: '2012-05-10T12:00:00.000Z',
  parish: { name: 'Paróquia São José' },
  household: {
    id: 'h1',
    name: 'Família Silva',
    phone: '(11) 99999-0000',
    guardians: [
      {
        id: 'g1',
        user: { firstName: 'Maria', lastName: 'Silva', email: 'maria@exemplo.com' },
      },
    ],
  },
  enrollments: [{ class: { id: 'c1', name: '3A — Crisma', stage: { name: 'Crisma' } } }],
  sacramentalJourneys: [{ id: 'j1', template: { name: 'Crisma' }, milestones: [{ id: 'm1' }] }],
  documents: [{ id: 'd1' }],
};

describe('CatechumenDetailScreen', () => {
  it('renders hero, sections, and navigation actions', () => {
    const onOpenClass = jest.fn();
    const onOpenFamily = jest.fn();
    const view = render(
      <CatechumenDetailScreen
        profile={profile}
        onOpenClass={onOpenClass}
        onOpenFamily={onOpenFamily}
      />,
    );

    expect(view.getByTestId('catechumen-detail-screen')).toBeTruthy();
    expect(view.getByTestId('catechumen-hero')).toBeTruthy();
    expect(view.getByText('Ana Silva')).toBeTruthy();
    expect(view.getByText('3A — Crisma · Crisma')).toBeTruthy();
    expect(view.getByText('Família Silva')).toBeTruthy();
    expect(view.getByText('maria@exemplo.com')).toBeTruthy();

    fireEvent.press(view.getByTestId('catechumen-class-c1'));
    expect(onOpenClass).toHaveBeenCalledWith('c1');
    fireEvent.press(view.getByTestId('catechumen-family-link'));
    expect(onOpenFamily).toHaveBeenCalledWith('h1');
  });
});
