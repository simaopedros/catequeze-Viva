import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PostReactionStrip } from '../components/postReactionsUi';

describe('PostReactionStrip', () => {
  it('renders three pastoral reactions', () => {
    const onReact = jest.fn();
    const view = render(
      <PostReactionStrip active="AMEM" totalCount={4} onReact={onReact} />,
    );

    expect(view.getByTestId('react-AMEM')).toBeTruthy();
    expect(view.getByTestId('react-REZO')).toBeTruthy();
    expect(view.getByTestId('react-ALELUIA')).toBeTruthy();
    fireEvent.press(view.getByTestId('react-ALELUIA'));
    expect(onReact).toHaveBeenCalledWith('ALELUIA');
  });
});
