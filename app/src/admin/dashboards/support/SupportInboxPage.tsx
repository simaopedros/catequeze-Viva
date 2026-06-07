import { type AuthUser } from "wasp/auth";
import { useQuery, getContactMessages, markContactMessageRead } from "wasp/client/operations";
import DefaultLayout from "../../layout/DefaultLayout";
import { Bell, Mail, CheckCircle } from 'lucide-react';

const SupportInboxPage = ({ user }: { user: AuthUser }) => {
  const { data: messages = [], isLoading, refetch } = useQuery(getContactMessages);

  const handleMarkRead = async (id: string) => {
    await markContactMessageRead({ id });
    refetch();
  };

  const unreadCount = messages.filter((m: any) => !m.isRead).length;

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Suporte</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Mensagens recebidas do formulário de contacto.
            {unreadCount > 0 && (
              <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {unreadCount} não lida{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center">
            <Bell className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-semibold">Nenhuma mensagem</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-1">
              As mensagens enviadas pelo formulário de contacto público aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg: any) => (
              <div
                key={msg.id}
                className={`rounded-xl border p-5 ${
                  !msg.isRead ? 'bg-primary/5 border-primary/20' : 'bg-card'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm">{msg.name}</span>
                      <span className="text-xs text-muted-foreground">{msg.email}</span>
                      {!msg.isRead && (
                        <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                          Nova
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs text-muted-foreground/60 mt-2">
                      {new Date(msg.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  {!msg.isRead && (
                    <button
                      onClick={() => handleMarkRead(msg.id)}
                      className="text-xs flex items-center gap-1 px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground shrink-0"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Marcar lida
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DefaultLayout>
  );
};

export default SupportInboxPage;
