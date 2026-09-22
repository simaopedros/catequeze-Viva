import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CatechumensScreen } from '../screens/CatechumensScreen';

describe('CatechumensScreen', () => {
  it('renders list and opens detail', () => {
    const onOpen = jest.fn();
    const view = render(
      <CatechumensScreen
        payload={[
          {
            id: 'p1',
            firstName: 'Ana',
            lastName: 'Silva',
            enrollments: [{ class: { name: '3A — Crisma' } }],
          },
        ]}
        onOpen={onOpen}
      />,
    );

    expect(view.getByTestId('catechumens-screen')).toBeTruthy();
    expect(view.getByTestId('catechumens-header')).toBeTruthy();
    expect(view.getByText('Ana Silva')).toBeTruthy();
    expect(view.getByText('3A — Crisma')).toBeTruthy();
    fireEvent.press(view.getByTestId('catechumen-p1'));
    expect(onOpen).toHaveBeenCalledWith('p1');
  });

  it('filters rows from search', () => {
    const view = render(
      <CatechumensScreen
        payload={[
          { id: 'p1', firstName: 'Ana', lastName: 'Silva' },
          { id: 'p2', firstName: 'Bruno', lastName: 'Costa' },
        ]}
        onOpen={jest.fn()}
      />,
    );

    fireEvent.changeText(view.getByTestId('catechumens-search'), 'bruno');
    expect(view.queryByText('Ana Silva')).toBeNull();
    expect(view.getByText('Bruno Costa')).toBeTruthy();
  });
});
