import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ComposeScreen } from '../screens/ComposeScreen';
import type { SocialShare, SocialTopic } from '../api/types';

const topics: SocialTopic[] = [
  { slug: 'oracao', name: 'Oração' },
  { slug: 'liturgia', name: 'Liturgia' },
  { slug: 'testemunho', name: 'Testemunho' },
  { slug: 'familia', name: 'Família' },
];

const versePreview: SocialShare = {
  kind: 'VERSE',
  title: 'João 3,16',
  subtitle: 'Evangelho',
  excerpt: 'Porque Deus amou o mundo de tal modo…',
  href: '/app/bible',
  sourceId: 'verse-uuid-jo-3-16',
  sourceLabel: 'Versículo',
};

function renderCompose(overrides: Partial<React.ComponentProps<typeof ComposeScreen>> = {}) {
  const props: React.ComponentProps<typeof ComposeScreen> = {
    canPublish: true,
    access: { authenticated: true, canPublish: true },
    topics,
    media: [],
    onPublish: jest.fn(),
    onPickImage: jest.fn(),
    onPickVideo: jest.fn(),
    onRemoveMedia: jest.fn(),
    onPreviewShare: jest.fn(),
    onOpenVersePicker: jest.fn(),
    onSearchPicker: jest.fn(),
    onClosePicker: jest.fn(),
    ...overrides,
  };
  return { ...render(<ComposeScreen {...props} />), props };
}

describe('ComposeScreen', () => {
  it('mostra o compositor da Comunidade sem IDs técnicos', () => {
    const screen = renderCompose();
    expect(screen.getByPlaceholderText('Compartilhe algo com a comunidade...')).toBeTruthy();
    expect(screen.getByTestId('compose-image')).toBeTruthy();
    expect(screen.getByTestId('compose-video')).toBeTruthy();
    expect(screen.getByTestId('compose-topics')).toBeTruthy();
    expect(screen.getByTestId('compose-submit')).toBeTruthy();
    expect(screen.getByTestId('compose-shortcut-verse')).toBeTruthy();
    expect(screen.getByTestId('compose-shortcut-catechism')).toBeTruthy();
    expect(screen.getByTestId('compose-shortcut-library')).toBeTruthy();
    expect(screen.queryByText(/ID da fonte/i)).toBeNull();
    expect(screen.queryByText(/Tipo de partilha/i)).toBeNull();
    expect(screen.queryByText(/sourceId/i)).toBeNull();
    expect(screen.queryByTestId('compose-kind')).toBeNull();
    expect(screen.queryByTestId('compose-source-id')).toBeNull();
    expect(screen.getByText('Escolha até 3 temas')).toBeTruthy();
  });

  it('publica só com o cartão de partilha, sem texto', () => {
    const { props, getByTestId } = renderCompose({ preview: versePreview });
    fireEvent.press(getByTestId('compose-submit'));
    expect(props.onPublish).toHaveBeenCalledWith({
      body: '',
      topicSlugs: [],
      mediaIds: [],
      mediaConsentAck: false,
      share: { kind: 'VERSE', sourceId: 'verse-uuid-jo-3-16' },
    });
  });

  it('exige consentimento para publicar com média e aceita corpo vazio', () => {
    const { props, getByTestId } = renderCompose({
      media: [{ mediaId: 'media-1', kind: 'IMAGE', url: 'https://cdn.example/p.jpg' }],
    });
    fireEvent.press(getByTestId('compose-submit'));
    expect(props.onPublish).not.toHaveBeenCalled();
    expect(getByTestId('compose-consent')).toBeTruthy();
    fireEvent.press(getByTestId('compose-consent'));
    fireEvent.press(getByTestId('compose-submit'));
    expect(props.onPublish).toHaveBeenCalledWith({
      body: '',
      topicSlugs: [],
      mediaIds: ['media-1'],
      mediaConsentAck: true,
      share: null,
    });
  });

  it('limita os temas a três e abre os pickers nativos', () => {
    const { props, getByTestId } = renderCompose();
    fireEvent.press(getByTestId('compose-topic-oracao'));
    fireEvent.press(getByTestId('compose-topic-liturgia'));
    fireEvent.press(getByTestId('compose-topic-testemunho'));
    fireEvent.press(getByTestId('compose-topic-familia'));
    fireEvent.changeText(getByTestId('compose-body'), 'Paz e bem na catequese.');
    fireEvent.press(getByTestId('compose-submit'));
    expect(props.onPublish).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'Paz e bem na catequese.',
        topicSlugs: ['oracao', 'liturgia', 'testemunho'],
      }),
    );

    fireEvent.press(getByTestId('compose-shortcut-verse'));
    expect(props.onOpenVersePicker).toHaveBeenCalled();
    fireEvent.press(getByTestId('compose-shortcut-catechism'));
    expect(props.onSearchPicker).toHaveBeenCalledWith('CATECHISM', '');
    fireEvent.press(getByTestId('compose-shortcut-library'));
    expect(props.onSearchPicker).toHaveBeenCalledWith('DOCUMENT', '');
  });

  it('mostra o aviso de assinatura e bloqueia publicar', () => {
    const { props, getByTestId, getByText } = renderCompose({
      canPublish: false,
      access: { authenticated: true, canPublish: false, reason: 'subscription' },
    });
    fireEvent.changeText(getByTestId('compose-body'), 'Paz e bem');
    fireEvent.press(getByTestId('compose-submit'));
    expect(props.onPublish).not.toHaveBeenCalled();
    expect(getByText(/Assine para publicar/)).toBeTruthy();
  });
});
