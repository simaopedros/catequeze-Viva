import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { LoginScreen } from '../screens/LoginScreen';
import { TwoFactorScreen } from '../screens/TwoFactorScreen';
import { CommunityScreen } from '../screens/CommunityScreen';

describe('auth and community UI', () => {
  it('submits login credentials', () => {
    const onSubmit = jest.fn();
    const view = render(
      <LoginScreen onSubmit={onSubmit} onForgotPassword={jest.fn()} />,
    );

    fireEvent.changeText(view.getByTestId('login-email'), 'coord@paroquia.pt');
    fireEvent.changeText(view.getByTestId('login-password'), 'Teste@123');
    fireEvent.press(view.getByTestId('login-submit'));

    expect(onSubmit).toHaveBeenCalledWith('coord@paroquia.pt', 'Teste@123');
  });

  it('requires six TOTP digits', () => {
    const onSubmit = jest.fn();
    const view = render(<TwoFactorScreen onSubmit={onSubmit} onCancel={jest.fn()} />);

    fireEvent.changeText(view.getByTestId('totp-input'), '123');
    fireEvent.press(view.getByTestId('totp-submit'));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.changeText(view.getByTestId('totp-input'), '123456');
    fireEvent.press(view.getByTestId('totp-submit'));
    expect(onSubmit).toHaveBeenCalledWith('123456');
  });

  it('renders the feed and the compose affordance when publishing is allowed', () => {
    const onCompose = jest.fn();
    const view = render(
      <CommunityScreen
        posts={[
          {
            id: '1',
            slug: 'ola',
            body: 'Paz e bem',
            author: { id: 'u', handle: 'joao', displayName: 'João', avatarUrl: null },
          },
        ]}
        topics={[{ slug: 'liturgia', name: 'Liturgia' }]}
        access={{ authenticated: true, canPublish: true }}
        sort="recent"
        onChangeSort={jest.fn()}
        onChangeTopic={jest.fn()}
        onOpenAuthor={jest.fn()}
        onCompose={onCompose}
      />,
    );

    expect(view.getByTestId('community-screen')).toBeTruthy();
    expect(view.getByText('Paz e bem')).toBeTruthy();
    fireEvent.press(view.getByTestId('compose-open'));
    expect(onCompose).toHaveBeenCalled();
  });
});
