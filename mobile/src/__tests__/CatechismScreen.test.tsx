import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CatechismHomeScreen } from '../screens/CatechismScreens';

describe('CatechismHomeScreen', () => {
  it('mostra grelha de partes e hero', () => {
    const view = render(
      <CatechismHomeScreen
        results={[]}
        onOpenCategory={() => {}}
        onOpenEntry={() => {}}
        onSearch={() => {}}
      />,
    );
    expect(view.getByTestId('catechism-screen')).toBeTruthy();
    expect(view.getByTestId('catechism-hero')).toBeTruthy();
    expect(view.getByTestId('catechism-part-creed')).toBeTruthy();
  });

  it('lista entradas com navegação', () => {
    const onOpenEntry = jest.fn();
    const view = render(
      <CatechismHomeScreen
        results={[{ number: 42, question: 'Pergunta exemplo', category: 'creed' }]}
        listMode="category"
        activeCategory="creed"
        onOpenCategory={() => {}}
        onOpenEntry={onOpenEntry}
        onSearch={() => {}}
      />,
    );
    fireEvent.press(view.getByTestId('catechism-entry-42'));
    expect(onOpenEntry).toHaveBeenCalledWith(42);
  });
});
