import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search, Users, MessageSquareText, Megaphone, Check } from 'lucide-react';
import { cn } from '../../../client/utils';
import { getContactsForConversation, createConversation } from 'wasp/client/operations';
import { useUserContext } from '../../../client/hooks/useUserContext';
import { useActiveWorkspace } from '../../../client/hooks/useActiveWorkspace';

interface Contact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  avatarUrl: string | null;
  role?: string;
}

interface NewConversationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}

const CONVERSATION_TYPE_KEYS = [
  { value: 'DIRECT' as const, key: 'direct', icon: MessageSquareText },
  { value: 'GROUP' as const, key: 'group', icon: Users },
  { value: 'ANNOUNCEMENT' as const, key: 'announcement', icon: Megaphone },
];

function getInitials(firstName: string | null, lastName: string | null): string {
  return [firstName?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
}

export function NewConversationDialog({ isOpen, onClose, onCreated }: NewConversationDialogProps) {
  const { t } = useTranslation('messages');
  const { t: tp } = useTranslation('public');
  const { userRole } = useUserContext();
  const { workspaceId, isPersonal } = useActiveWorkspace();
  const isRestricted = ['CATECHUMEN', 'GUARDIAN'].includes(userRole) || isPersonal;

  const availableTypes = isRestricted
    ? CONVERSATION_TYPE_KEYS.filter(t => t.value === 'DIRECT')
    : CONVERSATION_TYPE_KEYS;

  const [step, setStep] = useState<'type' | 'contacts'>('type');
  const [type, setType] = useState<'DIRECT' | 'GROUP' | 'ANNOUNCEMENT'>('DIRECT');
  const [title, setTitle] = useState('');
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const roleLabel = (role?: string) => {
    if (!role) return '';
    return tp(`workspace.roles.${role}`, { defaultValue: role });
  };

  useEffect(() => {
    if (isOpen && step === 'contacts' && workspaceId) {
      setLoading(true);
      getContactsForConversation({ workspaceId })
        .then(setContacts)
        .catch(() => setContacts([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, step, workspaceId]);

  useEffect(() => {
    if (!isOpen) {
      setStep('type');
      setType('DIRECT');
      setTitle('');
      setSearch('');
      setSelected(new Set());
      setError('');
    }
  }, [isOpen]);

  const filteredContacts = contacts.filter(c => {
    if (!search) return true;
    const name = [c.firstName, c.lastName, c.email].filter(Boolean).join(' ').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const toggleContact = (id: string) => {
    const next = new Set(selected);
    if (type === 'DIRECT') {
      next.clear();
      next.add(id);
    } else {
      if (next.has(id)) next.delete(id); else next.add(id);
    }
    setSelected(next);
  };

  const handleCreate = async () => {
    if (!workspaceId) {
      setError(t('new_dialog.create_error'));
      return;
    }
    if (selected.size === 0) {
      setError(t('new_dialog.select_participant'));
      return;
    }
    if (type !== 'DIRECT' && !title.trim()) {
      setError(t('new_dialog.name_group'));
      return;
    }

    setCreating(true);
    setError('');
    try {
      const conversation = await createConversation({
        type,
        title: type !== 'DIRECT' ? title.trim() : undefined,
        participantUserIds: Array.from(selected),
        parishId: workspaceId,
      });
      onCreated(conversation.id);
      onClose();
    } catch (e: any) {
      setError(e.message || t('new_dialog.create_error'));
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-sm border border-border/70 bg-white">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">
            {step === 'type' ? t('new_dialog.title_type') : t('new_dialog.title_contacts')}
          </h3>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === 'type' && (
          <div className="p-4 space-y-2">
            {availableTypes.map(ct => {
              const Icon = ct.icon;
              return (
                <button
                  key={ct.value}
                  onClick={() => { setType(ct.value); setStep('contacts'); }}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-sm border border-border/70 p-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/20',
                    type === ct.value && 'border-[#071A2D] bg-muted/30'
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-border/70 bg-muted/30 text-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t(`new_dialog.types.${ct.key}.label`)}</p>
                    <p className="text-xs text-muted-foreground">{t(`new_dialog.types.${ct.key}.desc`)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {step === 'contacts' && (
          <>
            <div className="p-4 space-y-3">
              {type !== 'DIRECT' && (
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={t('new_dialog.group_name_placeholder')}
                  maxLength={200}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                />
              )}

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('new_dialog.search_contacts')}
                  className="w-full h-9 pl-8 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                />
              </div>

              {selected.size > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Array.from(selected).map(id => {
                    const c = contacts.find(x => x.id === id);
                    if (!c) return null;
                    return (
                      <span
                        key={id}
                        className="flex items-center gap-1 rounded-sm border border-border/70 bg-muted/30 px-2 py-0.5 text-xs text-foreground"
                      >
                        {c.firstName || c.email}
                        <button onClick={() => toggleContact(id)} className="hover:text-destructive">✕</button>
                      </span>
                    );
                  })}
                </div>
              )}

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto border-t scrollbar-thin">
              {loading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">{t('new_dialog.loading_contacts')}</div>
              ) : filteredContacts.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">{t('new_dialog.no_contacts')}</div>
              ) : (
                filteredContacts.map(c => {
                  const isSelected = selected.has(c.id);
                  const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || t('default_user');
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleContact(c.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        isSelected ? 'bg-muted/30' : 'hover:bg-muted/50'
                      )}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-[#071A2D] text-overline font-semibold text-white">
                        {getInitials(c.firstName, c.lastName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <p className="text-overline text-muted-foreground truncate">
                          {c.role ? roleLabel(c.role) : c.email}
                        </p>
                      </div>
                      <div className={cn(
                        'h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors',
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-muted-foreground/30'
                      )}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t flex items-center justify-between gap-2">
              <button
                onClick={() => { setStep('type'); setSelected(new Set()); setError(''); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {t('new_dialog.back')}
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || selected.size === 0}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  selected.size > 0
                    ? 'bg-[#071A2D] text-white hover:bg-[#0a2540]'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {creating ? t('new_dialog.creating') : type === 'DIRECT' ? t('new_dialog.start_direct') : t('new_dialog.create_group', { count: selected.size })}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
