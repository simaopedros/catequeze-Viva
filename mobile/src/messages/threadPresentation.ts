export function conversationRecord(data: any) {
  return data?.conversation ?? data;
}

export function conversationTitle(data: any): string {
  const conv = conversationRecord(data);
  const title = conv?.title || conv?.name || conv?.subject || data?.title || data?.name;
  if (title && String(title).trim()) return String(title).trim();
  return 'Conversa';
}

export function conversationSubtitle(data: any): string | undefined {
  const conv = conversationRecord(data);
  const className = conv?.class?.name;
  const community = conv?.community?.name || conv?.parish?.name;
  const type = conv?.type;
  if (className) return `Turma ${className}`;
  if (community) return community;
  if (type === 'CLASS_CHAT') return 'Chat da turma';
  if (type === 'ANNOUNCEMENT') return 'Aviso da paróquia';
  if (type === 'DIRECT') return 'Mensagem direta';
  return undefined;
}

export function threadMessages(data: any): any[] {
  const list = data?.messages || data?.items;
  return Array.isArray(list) ? list : [];
}

export function viewerUserId(data: any): string | undefined {
  return data?.viewerId || data?.currentUserId || data?.viewer?.id;
}

export function messageBody(message: any): string {
  return String(message?.content || message?.body || '').trim();
}

export function messageAuthorLabel(message: any): string {
  const sender = message?.sender || message?.author;
  const full = [sender?.firstName, sender?.lastName].filter(Boolean).join(' ').trim();
  return full || sender?.displayName || message?.senderName || 'Membro';
}

export function isOwnMessage(message: any, data: any): boolean {
  if (message?.mine || message?.isOwn) return true;
  const viewerId = viewerUserId(data);
  const authorId = message?.sender?.id || message?.author?.id || message?.senderId;
  return Boolean(viewerId && authorId && viewerId === authorId);
}

export function formatMessageTime(value?: string | Date | null): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
