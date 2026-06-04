import { useParams, Link, useNavigate } from 'react-router';
import { useState } from 'react';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { ArrowLeft, Building2, Users, GraduationCap, User, MessageCircle, MapPin, Phone, Mail } from 'lucide-react';
import { AppShell } from '../AppShell';
import { useQuery, listCommunities, listClasses, listHouseholds, createConversation } from 'wasp/client/operations';
import { COMMUNITY_TYPE_LABELS } from '../../shared/constants';

const AVATAR_COLORS = ['bg-blue-100 text-blue-700','bg-green-100 text-green-700','bg-amber-100 text-amber-700','bg-purple-100 text-purple-700','bg-pink-100 text-pink-700'];

export default function CommunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: communities = [], isLoading: loading } = useQuery(listCommunities, { parishId: '' } as any);
  const community = communities.find((c: any) => c.id === id);

  const { data: classes = [] } = useQuery(listClasses, { communityId: id! } as any);
  const { data: households = [] } = useQuery(listHouseholds, { communityId: id! } as any);

  const [tab, setTab] = useState<'turmas' | 'familias' | 'catequistas'>('turmas');

  // Filter catechists from classes
  const catechistsFromClasses = new Map<string, any>();
  classes.forEach((cls: any) => {
    cls.catechists?.forEach((cc: any) => {
      if (!catechistsFromClasses.has(cc.user?.id)) {
        catechistsFromClasses.set(cc.user?.id, { ...cc.user, role: cc.role, className: cls.name });
      }
    });
  });
  const uniqueCatechists = Array.from(catechistsFromClasses.values());

  const handleOpenCommunityChat = async () => {
    try {
      const conv = await createConversation({
        type: 'GROUP',
        title: `Comunidade: ${community.name}`,
        communityId: id!,
        participantUserIds: uniqueCatechists.map((c: any) => c.id),
      });
      navigate(`/app/messages?c=${conv.id}`);
    } catch (e: any) {
      // silently fail
    }
  };

  if (loading) {
    return <AppShell><div className="max-w-4xl mx-auto py-6 space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="grid gap-4 md:grid-cols-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted" />)}</div>
    </div></AppShell>;
  }
  if (!community) return <AppShell><div className="p-6 text-destructive">Comunidade não encontrada.</div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link to="/app/communities"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{community.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{COMMUNITY_TYPE_LABELS[community.type] || community.type}</Badge>
              {community.coordinatorName && (
                <span className="text-sm text-muted-foreground">Coordenador: {community.coordinatorName}</span>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleOpenCommunityChat}>
            <MessageCircle className="mr-1 h-3 w-3" />Chat
          </Button>
        </div>

        {/* Info cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {community.street && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1 mb-1"><MapPin className="h-3 w-3" />Endereço</h3>
              <p className="text-sm">{community.street}{community.number ? `, ${community.number}` : ''}</p>
              <p className="text-xs text-muted-foreground">{community.neighborhood} {community.city}/{community.state}</p>
            </div>
          )}
          {community.phone && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1 mb-1"><Phone className="h-3 w-3" />Contato</h3>
              <p className="text-sm">{community.phone}</p>
              {community.email && <p className="text-xs text-muted-foreground">{community.email}</p>}
            </div>
          )}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1 mb-1"><Building2 className="h-3 w-3" />Resumo</h3>
            <p className="text-sm">{classes.length} turmas · {households.length} famílias · {uniqueCatechists.length} catequistas</p>
          </div>
        </div>

        {/* Description */}
        {community.description && (
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{community.description}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b pb-2">
          {[
            { id: 'turmas', label: `Turmas (${classes.length})`, icon: GraduationCap },
            { id: 'familias', label: `Famílias (${households.length})`, icon: Users },
            { id: 'catequistas', label: `Catequistas (${uniqueCatechists.length})`, icon: User },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1 ${tab === t.id ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Turmas */}
        {tab === 'turmas' && (
          <div>
            {classes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhuma turma nesta comunidade.</p>
            ) : (
              <div className="grid gap-2">
                {classes.map((cls: any) => (
                  <Link key={cls.id} to={`/app/classes/${cls.id}`} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30">
                    <div>
                      <p className="font-medium text-sm">{cls.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cls.stage?.name && `${cls.stage.name} · `}
                        {cls.dayOfWeek && `${cls.dayOfWeek} ${cls.startTime}`}
                        {cls._count?.enrollments ? ` · ${cls._count.enrollments} inscritos` : ''}
                      </p>
                    </div>
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Familias */}
        {tab === 'familias' && (
          <div>
            {households.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhuma família nesta comunidade.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {households.map((h: any) => (
                  <Link key={h.id} to={`/app/families/${h.id}`} className="rounded-lg border p-3 hover:bg-muted/30">
                    <p className="font-medium text-sm">{h.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {h._count?.catechumens || 0} catequizandos · {h.guardians?.length || 0} responsáveis
                    </p>
                    {h.catechumens?.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {h.catechumens.slice(0, 3).map((c: any) => (
                          <span key={c.id} className="text-[10px] bg-muted px-2 py-0.5 rounded-full">{c.firstName}</span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Catequistas */}
        {tab === 'catequistas' && (
          <div>
            {uniqueCatechists.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhum catequista vinculado às turmas desta comunidade.</p>
            ) : (
              <div className="grid gap-2">
                {uniqueCatechists.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${AVATAR_COLORS[Math.abs(c.firstName?.charCodeAt(0) || 0) % AVATAR_COLORS.length]}`}>
                      {c.firstName?.[0]}{c.lastName?.[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-muted-foreground">{c.className} · {c.role === 'LEAD' ? 'Responsável' : 'Auxiliar'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
