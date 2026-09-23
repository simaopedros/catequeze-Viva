import {
  conversationTitle,
  formatMessageTime,
  isOwnMessage,
  messageAuthorLabel,
} from '../messages/threadPresentation';

describe('threadPresentation', () => {
  it('uses conversation title from payload', () => {
    expect(conversationTitle({ conversation: { title: 'Coordenação' } })).toBe('Coordenação');
    expect(conversationTitle({})).toBe('Conversa');
  });

  it('detects own messages', () => {
    expect(isOwnMessage({ senderId: 'u1' }, { viewerId: 'u1' })).toBe(true);
    expect(isOwnMessage({ sender: { id: 'u2' } }, { viewerId: 'u1' })).toBe(false);
  });

  it('formats author name', () => {
    expect(messageAuthorLabel({ sender: { firstName: 'Ana', lastName: 'Silva' } })).toBe('Ana Silva');
  });

  it('formats message time', () => {
    const today = new Date();
    today.setHours(14, 30, 0, 0);
    expect(formatMessageTime(today.toISOString())).toMatch(/14:30/);
  });
});
