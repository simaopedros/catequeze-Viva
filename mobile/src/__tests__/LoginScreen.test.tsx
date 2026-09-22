import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { LoginScreen } from '../screens/LoginScreen';
import { TwoFactorScreen } from '../screens/TwoFactorScreen';
import { CommunityScreen } from '../screens/CommunityScreen';

jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ apiBaseUrl: 'https://api.example.com' }),
}));

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

  it('shows branded login layout with footer art', () => {
    const view = render(
      <LoginScreen onSubmit={jest.fn()} onForgotPassword={jest.fn()} />,
    );

    expect(view.getByTestId('login-brand-header')).toBeTruthy();
    expect(view.getByText('Catequese')).toBeTruthy();
    expect(view.getByText('Viva')).toBeTruthy();
    expect(view.getByTestId('login-footer-art')).toBeTruthy();
    expect(view.getByText('Esqueci a senha')).toBeTruthy();
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
    const onPublishPost = jest.fn().mockResolvedValue(undefined);
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
        access={{ authenticated: true, canPublish: true }}
        feedScope="all"
        onChangeFeedScope={jest.fn()}
        onOpenAuthor={jest.fn()}
        onPublishPost={onPublishPost}
      />,
    );

    expect(view.getByTestId('community-screen')).toBeTruthy();
    expect(view.getByText('Paz e bem')).toBeTruthy();
    expect(view.getByTestId('community-compose-card')).toBeTruthy();
    fireEvent.press(view.getByTestId('compose-open-field'));
    expect(view.getByTestId('compose-input')).toBeTruthy();
  });
});
