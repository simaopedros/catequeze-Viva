import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ClassesScreen } from '../screens/ClassesScreen';

describe('ClassesScreen', () => {
  it('renders mock layout with search and list rows', () => {
    const onOpen = jest.fn();
    const view = render(
      <ClassesScreen
        payload={[
          { id: 'c1', name: '1A - Primeira Eucaristia', _count: { enrollments: 12 } },
          { id: 'c2', name: '2A - Crisma', _count: { enrollments: 10 } },
        ]}
        onOpen={onOpen}
      />,
    );

    expect(view.getByText('Turmas')).toBeTruthy();
    expect(view.getByTestId('classes-search')).toBeTruthy();
    expect(view.getByText('1A - Primeira Eucaristia')).toBeTruthy();
    expect(view.getByText('12 catequizandos')).toBeTruthy();

    fireEvent.changeText(view.getByTestId('classes-search'), 'crisma');
    expect(view.queryByText('1A - Primeira Eucaristia')).toBeNull();
    expect(view.getByText('2A - Crisma')).toBeTruthy();

    fireEvent.press(view.getByTestId('class-c2'));
    expect(onOpen).toHaveBeenCalledWith('c2');
  });
});
