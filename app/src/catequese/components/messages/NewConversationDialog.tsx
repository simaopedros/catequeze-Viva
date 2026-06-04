import { useState, useEffect } from 'react';
import { X, Search, Users, MessageSquareText, Megaphone, Hash, Check } from 'lucide-react';
import { cn } from '../../../client/utils';
import { getContactsForConversation, createConversation } from 'wasp/client/operations';

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

const CONVERSATION_TYPES = [
  { value: 'DIRECT' as const, label: 'Mensagem Direta', icon: MessageSquareText, desc: 'Conversa 1-para-1' },
  { value: 'GROUP' as const, label: 'Grupo', icon: Users, desc: 'Chat em grupo' },
  { value: 'ANNOUNCEMENT' as const, label: 'Canal de Avisos', icon: Megaphone, desc: 'Somente coordenadores postam' },
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Admin',
  DIOCESE_ADMIN: 'Diocese',
  PARISH_COORDINATOR: 'Coordenador',
  COMMUNITY_COORDINATOR: 'Comunidade',
  LEAD_CATECHIST: 'Catequista',
  ASSISTANT_CATECHIST: 'Auxiliar',
  GUARDIAN: 'Responsável',
  CATECHUMEN: 'Catequizando',
  CONTENT_REVIEWER: 'Revisor',
  PASTORAL_VIEWER: 'Visitante',
};

function getInitials(firstName: string | null, lastName: string | null): string {
  return [firstName?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
}

export function NewConversationDialog({ isOpen, onClose, onCreated }: NewConversationDialogProps) {
  const [step, setStep] = useState<'type' | 'contacts'>('type');
  const [type, setType] = useState<'DIRECT' | 'GROUP' | 'ANNOUNCEMENT'>('DIRECT');
  const [title, setTitle] = useState('');
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && step === 'contacts') {
      setLoading(true);
      getContactsForConversation()
        .then(setContacts)
        .catch(() => setContacts([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, step]);

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
    if (selected.size === 0) {
      setError('Selecione pelo menos um participante.');
      return;
    }
    if (type !== 'DIRECT' && !title.trim()) {
      setError('Dê um nome ao grupo.');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const conversation = await createConversation({
        type,
        title: type !== 'DIRECT' ? title.trim() : undefined,
        participantUserIds: Array.from(selected),
      });
      onCreated(conversation.id);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Erro ao criar conversa.');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-4 bg-card rounded-2xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">
            {step === 'type' ? 'Nova Conversa' : 'Selecionar Participantes'}
          </h3>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step 1: Choose type */}
        {step === 'type' && (
          <div className="p-4 space-y-2">
            {CONVERSATION_TYPES.map(ct => {
              const Icon = ct.icon;
              return (
                <button
                  key={ct.value}
                  onClick={() => { setType(ct.value); setStep('contacts'); }}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:border-primary/50 hover:bg-primary/5',
                    type === ct.value && 'border-primary bg-primary/5'
                  )}
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{ct.label}</p>
                    <p className="text-xs text-muted-foreground">{ct.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: Select contacts */}
        {step === 'contacts' && (
          <>
            <div className="p-4 space-y-3">
              {/* Group name input */}
              {type !== 'DIRECT' && (
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Nome do grupo..."
                  maxLength={200}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar contatos..."
                  className="w-full h-9 pl-8 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>

              {/* Selected pills */}
              {selected.size > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Array.from(selected).map(id => {
                    const c = contacts.find(x => x.id === id);
                    if (!c) return null;
                    return (
                      <span
                        key={id}
                        className="flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs"
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

            {/* Contacts list */}
            <div className="max-h-64 overflow-y-auto border-t scrollbar-thin">
              {loading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Carregando contatos...</div>
              ) : filteredContacts.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Nenhum contato encontrado.</div>
              ) : (
                filteredContacts.map(c => {
                  const isSelected = selected.has(c.id);
                  const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || 'Usuário';
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleContact(c.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'
                      )}
                    >
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/60 to-primary/30 flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
                        {getInitials(c.firstName, c.lastName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {c.role ? ROLE_LABELS[c.role] || c.role : c.email}
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

            {/* Footer */}
            <div className="p-4 border-t flex items-center justify-between gap-2">
              <button
                onClick={() => { setStep('type'); setSelected(new Set()); setError(''); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ← Voltar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || selected.size === 0}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  selected.size > 0
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {creating ? 'Criando...' : type === 'DIRECT' ? 'Iniciar conversa' : `Criar grupo (${selected.size})`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
