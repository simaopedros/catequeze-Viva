import { useParams, Link, useNavigate } from 'react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { ArrowLeft, Building2, Users, GraduationCap, User, MessageCircle, MapPin, Phone } from 'lucide-react';
import { AppShell } from '../AppShell';
import { useQuery, listCommunities, listClasses, listHouseholds, createConversation } from 'wasp/client/operations';
import { useCommunityTypeLabels } from '../../i18n/useLabels';

const AVATAR_COLORS = ['bg-blue-100 text-blue-700','bg-green-100 text-green-700','bg-amber-100 text-amber-700','bg-purple-100 text-purple-700','bg-pink-100 text-pink-700'];

export default function CommunityDetailPage() {
  const { t } = useTranslation('common');
  const { t: tp } = useTranslation('parishes');
  const typeLabels = useCommunityTypeLabels();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: communities = [], isLoading: loading } = useQuery(listCommunities, { parishId: '' } as any);
  const community = communities.find((c: any) => c.id === id);

  const { data: classes = [] } = useQuery(listClasses, { communityId: id! } as any);
  const { data: households = [] } = useQuery(listHouseholds, { communityId: id! } as any);

  const [tab, setTab] = useState<'turmas' | 'familias' | 'catequistas'>('turmas');

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
        title: tp('community_chat_title', { name: community.name }),
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
  if (!community) return <AppShell><div className="p-6 text-destructive">{tp('community_not_found')}</div></AppShell>;

  const tabs = [
    { id: 'turmas' as const, label: tp('tab_classes', { count: classes.length }), icon: GraduationCap },
    { id: 'familias' as const, label: tp('tab_families', { count: households.length }), icon: Users },
    { id: 'catequistas' as const, label: tp('tab_catechists', { count: uniqueCatechists.length }), icon: User },
  ];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link to="/app/communities"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{community.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{typeLabels[community.type as keyof typeof typeLabels] || community.type}</Badge>
              {community.coordinatorName && (
                <span className="text-sm text-muted-foreground">{tp('coordinator_label', { name: community.coordinatorName })}</span>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleOpenCommunityChat}>
            <MessageCircle className="mr-1 h-3 w-3" />{tp('chat')}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {community.street && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1 mb-1"><MapPin className="h-3 w-3" />{t('address')}</h3>
              <p className="text-sm">{community.street}{community.number ? `, ${community.number}` : ''}</p>
              <p className="text-xs text-muted-foreground">{community.neighborhood} {community.city}/{community.state}</p>
            </div>
          )}
          {community.phone && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1 mb-1"><Phone className="h-3 w-3" />{tp('contact')}</h3>
              <p className="text-sm">{community.phone}</p>
              {community.email && <p className="text-xs text-muted-foreground">{community.email}</p>}
            </div>
          )}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1 mb-1"><Building2 className="h-3 w-3" />{tp('summary')}</h3>
            <p className="text-sm">{tp('summary_counts', { classes: classes.length, families: households.length, catechists: uniqueCatechists.length })}</p>
          </div>
        </div>

        {community.description && (
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{community.description}</p>
          </div>
        )}

        <div className="flex gap-1 border-b pb-2">
          {tabs.map(tabItem => (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1 ${tab === tabItem.id ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <tabItem.icon className="h-3.5 w-3.5" />
              {tabItem.label}
            </button>
          ))}
        </div>

        {tab === 'turmas' && (
          <div>
            {classes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">{tp('no_classes_in_community')}</p>
            ) : (
              <div className="grid gap-2">
                {classes.map((cls: any) => (
                  <Link key={cls.id} to={`/app/classes/${cls.id}`} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30">
                    <div>
                      <p className="font-medium text-sm">{cls.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cls.stage?.name && `${cls.stage.name} · `}
                        {cls.dayOfWeek && `${cls.dayOfWeek} ${cls.startTime}`}
                        {cls._count?.enrollments ? ` · ${cls._count.enrollments} ${t('enrolled')}` : ''}
                      </p>
                    </div>
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'familias' && (
          <div>
            {households.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">{tp('no_families_in_community')}</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {households.map((h: any) => (
                  <Link key={h.id} to={`/app/families/${h.id}`} className="rounded-lg border p-3 hover:bg-muted/30">
                    <p className="font-medium text-sm">{h.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('families.summary', { catechumens: h._count?.catechumens || 0, guardians: h.guardians?.length || 0 })}
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

        {tab === 'catequistas' && (
          <div>
            {uniqueCatechists.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">{tp('no_catechists_in_community')}</p>
            ) : (
              <div className="grid gap-2">
                {uniqueCatechists.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${AVATAR_COLORS[Math.abs(c.firstName?.charCodeAt(0) || 0) % AVATAR_COLORS.length]}`}>
                      {c.firstName?.[0]}{c.lastName?.[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-muted-foreground">{c.className} · {c.role === 'LEAD' ? tp('lead_catechist') : tp('assistant_catechist')}</p>
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
