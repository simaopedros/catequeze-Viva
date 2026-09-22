import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PostCommentComposer } from '../components/postCommentsUi';

describe('PostCommentComposer', () => {
  it('sends from inline composer', () => {
    const onSubmit = jest.fn();
    const onChangeText = jest.fn();
    const view = render(
      <PostCommentComposer
        value="Amém"
        onChangeText={onChangeText}
        onSubmit={onSubmit}
        viewerName="Maria"
      />,
    );

    expect(view.getByTestId('post-comment-composer')).toBeTruthy();
    fireEvent.press(view.getByTestId('comment-submit'));
    expect(onSubmit).toHaveBeenCalled();
  });
});
