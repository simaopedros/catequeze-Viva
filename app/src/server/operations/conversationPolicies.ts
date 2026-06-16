export type ManualConversationType = 'DIRECT' | 'GROUP' | 'ANNOUNCEMENT';
export type ConversationScopeType = 'PARISH' | 'COMMUNITY' | 'CLASS';
export type ConversationEntityType = 'DIRECT' | 'GROUP' | 'CLASS_CHAT' | 'ANNOUNCEMENT';

export function sanitizeParticipantUserIds(currentUserId: string, participantUserIds: string[]): string[] {
  return [...new Set(participantUserIds.map((id) => id.trim()).filter(Boolean))].filter((id) => id !== currentUserId);
}

export function getConversationScopeType(args: { classId?: string; communityId?: string }): ConversationScopeType {
  if (args.classId) return 'CLASS';
  if (args.communityId) return 'COMMUNITY';
  return 'PARISH';
}

export function isManualConversationTypeAllowed(type: ManualConversationType, isPersonalWorkspace: boolean): boolean {
  if (!isPersonalWorkspace) return true;
  return type === 'DIRECT';
}

export function canAddParticipantsToConversation(type: ConversationEntityType): boolean {
  return type === 'GROUP' || type === 'ANNOUNCEMENT';
}

export function canRemoveParticipantsFromConversation(type: ConversationEntityType, isSelf: boolean): boolean {
  if (type === 'DIRECT') return false;
  if (type === 'CLASS_CHAT') return isSelf;
  return true;
}
