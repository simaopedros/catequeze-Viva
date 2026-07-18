export type ManualConversationType = 'DIRECT' | 'GROUP' | 'ANNOUNCEMENT';
export type ConversationScopeType = 'PARISH' | 'COMMUNITY' | 'CLASS';
export type ConversationEntityType = 'DIRECT' | 'GROUP' | 'CLASS_CHAT' | 'ANNOUNCEMENT';

export function sanitizeParticipantUserIds(currentUserId: string, participantUserIds: string[]): string[] {
  return [...new Set(participantUserIds.map((id) => id.trim()).filter(Boolean))].filter((id) => id !== currentUserId);
}

/** Never expose full email in contact DTOs. */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email || !email.includes('@')) return null;
  const [local, domain] = email.split('@');
  if (!local || !domain) return null;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

export function buildDisplayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (name) return name;
  return maskEmail(user.email) || 'Usuário';
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
