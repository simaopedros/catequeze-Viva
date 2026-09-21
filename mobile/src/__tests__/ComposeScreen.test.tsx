import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { POST_KINDS, ComposeScreen } from '../screens/ComposeScreen';

describe('ComposeScreen', () => {
  it('abre todos os tipos de publicação suportados', () => {
    const view = render(
      <ComposeScreen canPublish onPublish={jest.fn()} onPreviewShare={jest.fn()} />,
    );

    for (const kind of POST_KINDS) {
      expect(view.getByTestId(`compose-kind-${kind.id}`)).toBeTruthy();
      expect(view.getByText(kind.label)).toBeTruthy();
    }

    fireEvent.press(view.getByTestId('compose-kind-TEXT'));
    expect(view.getByTestId('compose-body')).toBeTruthy();
  });
});
