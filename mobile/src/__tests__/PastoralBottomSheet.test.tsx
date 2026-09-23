import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { PastoralBottomSheet } from '../components/PastoralBottomSheet';

describe('PastoralBottomSheet', () => {
  it('renderiza conteúdo quando visível', () => {
    const view = render(
      <PastoralBottomSheet visible onClose={() => {}} testID="sheet-panel">
        <Text>Conteúdo do painel</Text>
      </PastoralBottomSheet>,
    );
    expect(view.getByTestId('sheet-panel')).toBeTruthy();
    expect(view.getByText('Conteúdo do painel')).toBeTruthy();
  });
});
