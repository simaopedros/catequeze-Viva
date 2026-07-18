import { describe, expect, it } from 'vitest';
import {
  buildDisplayName,
  canAddParticipantsToConversation,
  canRemoveParticipantsFromConversation,
  getConversationScopeType,
  isManualConversationTypeAllowed,
  maskEmail,
  sanitizeParticipantUserIds,
} from '../server/operations/conversationPolicies';

describe('conversationPolicies', () => {
  it('masks emails and builds display names without full email', () => {
    expect(maskEmail('alice@example.com')).toBe('al***@example.com');
    expect(maskEmail(null)).toBeNull();
    expect(
      buildDisplayName({ firstName: 'Ana', lastName: 'Silva', email: 'a@b.com' }),
    ).toBe('Ana Silva');
    expect(
      buildDisplayName({ firstName: null, lastName: null, email: 'x@y.com' }),
    ).toBe('x***@y.com');
  });

  it('sanitizes participant ids by trimming, deduping, and removing the sender', () => {
    expect(
      sanitizeParticipantUserIds('me', [' user-a ', 'me', 'user-a', '', 'user-b']),
    ).toEqual(['user-a', 'user-b']);
  });

  it('restricts manual conversation types in personal workspaces', () => {
    expect(isManualConversationTypeAllowed('DIRECT', true)).toBe(true);
    expect(isManualConversationTypeAllowed('GROUP', true)).toBe(false);
    expect(isManualConversationTypeAllowed('ANNOUNCEMENT', true)).toBe(false);
    expect(isManualConversationTypeAllowed('GROUP', false)).toBe(true);
  });

  it('derives the expected scope from class and community context', () => {
    expect(getConversationScopeType({})).toBe('PARISH');
    expect(getConversationScopeType({ communityId: 'community-1' })).toBe('COMMUNITY');
    expect(getConversationScopeType({ classId: 'class-1', communityId: 'community-1' })).toBe('CLASS');
  });

  it('allows participant mutations only on supported conversation types', () => {
    expect(canAddParticipantsToConversation('GROUP')).toBe(true);
    expect(canAddParticipantsToConversation('ANNOUNCEMENT')).toBe(true);
    expect(canAddParticipantsToConversation('DIRECT')).toBe(false);
    expect(canAddParticipantsToConversation('CLASS_CHAT')).toBe(false);

    expect(canRemoveParticipantsFromConversation('DIRECT', true)).toBe(false);
    expect(canRemoveParticipantsFromConversation('CLASS_CHAT', false)).toBe(false);
    expect(canRemoveParticipantsFromConversation('CLASS_CHAT', true)).toBe(true);
    expect(canRemoveParticipantsFromConversation('GROUP', false)).toBe(true);
  });
});
