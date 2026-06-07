import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useAction } from 'wasp/client/operations';
import { listWorkspaces, acceptInvitation } from 'wasp/client/operations';
import { Button } from '../../client/components/ui/button';
import { User, Church, Building2, Plus, ArrowRight, Sparkles, Mail, Check } from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  subtitle?: string;
  type: 'PERSONAL' | 'PARISH' | 'DIOCESE' | 'COMMUNITY';
  role: string;
  plan: string;
  isPersonal: boolean;
  membershipStatus?: 'ACTIVE' | 'INVITED';
  membershipId?: string;
}

const PLAN_NAMES: Record<string, string> = {
  catechist_free: 'Catequista Grátis',
  catechist_pro: 'Catequista Pro',
  catechist_ai: 'Catequista IA',
  parish: 'Paróquia',
  diocese: 'Diocese',
  community: 'Comunidade',
};

export default function WorkspaceSelectorPage() {
  const { data: workspaces = [], refetch } = useQuery(listWorkspaces);
  const acceptAction = useAction(acceptInvitation);
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);

  const personal = workspaces.find((w: Workspace) => w.isPersonal);
  const pendingInvitations = workspaces.filter((w: Workspace) => !w.isPersonal && w.membershipStatus === 'INVITED');
  const parishWorkspaces = workspaces.filter((w: Workspace) => !w.isPersonal && w.membershipStatus !== 'INVITED');

  const handleEnter = (workspaceId: string) => {
    localStorage.setItem('catequese-viva-active-workspace', workspaceId);
    window.dispatchEvent(new CustomEvent('workspace-changed', { detail: workspaceId }));
    navigate('/app');
  };

  const handleAccept = async (membershipId: string) => {
    setAccepting(membershipId);
    try {
      await acceptAction({ membershipId });
      await refetch();
    } catch (e: any) {
      // ignore — error is shown by the wasp framework
    } finally {
      setAccepting(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-primary text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Catequese Viva
          </div>
          <h1 className="text-2xl font-bold">Selecionar Espaço</h1>
          <p className="text-muted-foreground text-sm">
            Escolha o workspace onde deseja trabalhar
          </p>
        </div>

        {/* Personal Workspace */}
        <div>
          <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider px-1 mb-2">
            Meu Espaço
          </h3>
          {personal ? (
            <button
              onClick={() => handleEnter(personal.id)}
              className="w-full rounded-2xl border-2 border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10 transition-all p-5 text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg">{personal.name}</h2>
                <p className="text-sm text-muted-foreground">{personal.subtitle}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {PLAN_NAMES[personal.plan] || personal.plan}
                  </span>
                  <span className="text-xs text-muted-foreground">· Espaço individual</span>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-primary/60 group-hover:translate-x-1 transition-transform mt-2" />
            </div>
          </button>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-muted-foreground/30 p-6 text-center text-muted-foreground">
              <p className="text-sm">Espaço pessoal será criado ao completar o onboarding.</p>
            </div>
          )}
        </div>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider px-1 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Convites Pendentes
            </h3>
            {pendingInvitations.map((ws: Workspace) => (
              <div
                key={ws.id}
                className="rounded-2xl border-2 border-warning/30 bg-warning/5 p-5 flex items-center gap-4"
              >
                <div className="rounded-xl bg-warning/10 p-3">
                  <Church className="h-6 w-6 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-lg">{ws.name}</h2>
                  <p className="text-sm text-muted-foreground">Você foi convidado(a) como {ws.role}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAccept(ws.membershipId!)}
                  disabled={accepting === ws.membershipId}
                  className="gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  {accepting === ws.membershipId ? 'Aceitando...' : 'Aceitar'}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Parish / Diocese / Community Workspaces */}
        {parishWorkspaces.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider px-1">
              Paróquias, Dioceses e Comunidades
            </h3>
            {parishWorkspaces.map((ws: Workspace) => (
              <button
                key={ws.id}
                onClick={() => handleEnter(ws.id)}
                className="w-full rounded-2xl border-2 border-muted bg-card hover:border-primary/50 hover:shadow-sm transition-all p-5 text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className={`rounded-xl p-3 group-hover:bg-opacity-80 transition-colors ${
                    ws.type === 'DIOCESE' ? 'bg-secondary/10' : ws.type === 'COMMUNITY' ? 'bg-success/10' : 'bg-accent/10'
                  }`}>
                    {ws.type === 'DIOCESE' ? (
                      <Building2 className="h-6 w-6 text-secondary" />
                    ) : ws.type === 'COMMUNITY' ? (
                      <Building2 className="h-6 w-6 text-success" />
                    ) : (
                      <Church className="h-6 w-6 text-accent" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-lg">{ws.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        ws.type === 'DIOCESE' ? 'bg-secondary/10 text-secondary' : ws.type === 'COMMUNITY' ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'
                      }`}>
                        {PLAN_NAMES[ws.plan] || ws.plan}
                      </span>
                      <span className="text-xs text-muted-foreground">{ws.role}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform mt-2" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty state: no workspaces at all */}
        {!personal && pendingInvitations.length === 0 && parishWorkspaces.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-warning/50 bg-warning/5 p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Nenhum workspace encontrado. Complete o onboarding ou crie uma paroquia.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => navigate('/app/onboarding')}
                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-9 px-4 text-sm font-medium"
              >
                Ir para Onboarding
              </button>
              <button
                onClick={() => navigate('/app/parishes?new=true')}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background h-9 px-4 text-sm font-medium"
              >
                Criar Paroquia
              </button>
            </div>
          </div>
        )}

        {/* Create new parish button (if plan allows) */}
        <button
          onClick={() => navigate('/app/parishes?new=true')}
          className="w-full rounded-2xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/40 hover:bg-accent/50 transition-all p-4 text-center text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-medium">Criar nova paróquia</span>
        </button>
      </div>
    </div>
  );
}
