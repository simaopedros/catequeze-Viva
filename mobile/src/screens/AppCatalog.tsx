import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { copy } from '../copy/ptBR';
import { displayPerson } from '../format';
import { useAsync } from '../hooks/useAsync';
import { openWebDestination } from '../lib/openWeb';
import { labelFor } from '../navigation/visible';
import { CalendarScreen, CatalogListScreen } from './CatalogListScreen';
import { CatechismBrowser, PeopleCatechumensScreen } from './PeopleAndReaders';

export function AppCatalog({ dest }: { dest: string }) {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const ws = workspaceId || undefined;

  if (dest === 'catechumens') return <PeopleCatechumensScreen />;
  if (dest === 'catechism') return <CatechismBrowser />;
  if (dest === 'calendar') return <CalendarHost />;

  const spec = SPECS[dest];
  const loader = spec?.loader
    ? () => spec.loader(api, ws)
    : async () => [];
  const { data, loading, error, reload, refreshing } = useAsync(loader, [dest, ws]);

  return (
    <CatalogListScreen
      title={labelFor(dest)}
      payload={data}
      loading={loading}
      error={error}
      onRefresh={() => void reload()}
      refreshing={refreshing}
      mapItem={spec?.mapItem}
      onCreate={spec?.onCreate ? () => spec.onCreate!(router, api, ws) : undefined}
      createLabel={spec?.createLabel}
      onOpen={
        spec?.onOpen
          ? (id, item) => spec.onOpen!(router, api, id, item)
          : spec?.webItem
            ? (_id, item) => void openWebDestination(api, spec.webItem!(item))
            : undefined
      }
    />
  );
}

function CalendarHost() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [date, setDate] = React.useState('');
  const { data, loading, error, reload, refreshing } = useAsync(() => api.calendar(workspaceId || undefined), [workspaceId]);
  return (
    <CalendarScreen
      payload={data}
      loading={loading}
      error={error}
      onRefresh={() => void reload()}
      refreshing={refreshing}
      onOpenMeeting={(id) => router.push(`/(app)/meeting/${id}`)}
      name={name}
      date={date}
      onName={setName}
      onDate={setDate}
      onCreate={async () => {
        await api.createCalendarEvent({ name, date, workspaceId: workspaceId || undefined });
        setName('');
        await reload();
      }}
    />
  );
}

const SPECS: Record<
  string,
  {
    loader: (api: any, ws?: string) => Promise<any>;
    mapItem?: (item: any) => { id: string; title: string; meta?: string };
    onOpen?: (router: any, api: any, id: string, item: any) => void;
    onCreate?: (router: any, api: any, ws?: string) => void;
    createLabel?: string;
    webItem?: (item: any) => string;
  }
> = {
  families: {
    loader: (api, ws) => api.families(ws),
    mapItem: (item) => ({
      id: item.id,
      title: item.name,
      meta: `${item._count?.catechumens ?? item.catechumens?.length ?? 0} catequizandos`,
    }),
    onOpen: (router, _api, id) => router.push(`/(app)/people/families/${id}`),
    onCreate: (router) => router.push('/(app)/people/families/new'),
    createLabel: copy.people.newFamily,
  },
  team: {
    loader: async (api, ws) => {
      if (!ws) return [];
      const data = await api.team(ws);
      return data?.members || data?.items || data?.team || data;
    },
    mapItem: (item) => ({
      id: item.id || item.userId || item.email,
      title: displayPerson(item.user || item) || item.email,
      meta: item.role,
    }),
  },
  family_portal_invites: {
    loader: async (api, ws) => {
      if (!ws) return [];
      const data = await api.familyInvites(ws);
      return data?.invitations || data?.items || data;
    },
    mapItem: (item) => ({ id: item.id, title: item.email, meta: item.role }),
    onCreate: (router) => router.push('/(app)/people/invites'),
    createLabel: copy.people.sendInvite,
  },
  announcements: {
    loader: (api, ws) => api.announcements(ws),
    mapItem: (item) => ({
      id: item.id,
      title: item.title,
      meta: item.acknowledged ? copy.announcements.acknowledged : undefined,
    }),
    onOpen: (router, _api, id) => router.push(`/(app)/announcements/${id}`),
    onCreate: (router) => router.push('/(app)/announcements/new'),
    createLabel: copy.people.create,
  },
  groups: {
    loader: (api) => api.groups(),
    mapItem: (item) => ({ id: item.id, title: item.name, meta: item.kind }),
    onOpen: (router, _api, id) => router.push(`/(app)/groups/${id}`),
  },
  content_library: {
    loader: (api, ws) => api.contentLibrary(ws),
    mapItem: (item) => ({ id: item.id, title: item.title, meta: item.status }),
    webItem: (item) => `/app/content-library/${item.id}`,
    onCreate: (_router, api) => void openWebDestination(api, '/app/content-library/new'),
    createLabel: copy.people.create,
  },
  official_library: {
    loader: (api, ws) => api.officialLibrary(ws),
    mapItem: (item) => ({ id: item.id, title: item.title || item.name, meta: item.kind }),
  },
  directory: {
    loader: (api) => api.directory(),
    mapItem: (item) => ({
      id: String(item.number || item.id),
      title: item.title || `n.º ${item.number}`,
      meta: item.part,
    }),
    onOpen: (router, _api, id) => router.push(`/(app)/content/directory/${id}`),
  },
  sacraments: {
    loader: (api, ws) => api.journeys(ws),
    mapItem: (item) => ({
      id: item.id,
      title: displayPerson(item.catechumenProfile || {}),
      meta: item.template?.name,
    }),
  },
  journey_templates: {
    loader: (api) => api.journeyTemplates(),
    mapItem: (item) => ({ id: item.id, title: item.name, meta: item.sacrament?.name }),
  },
  documents: {
    loader: (api) => api.documents(),
    mapItem: (item) => ({ id: item.id, title: item.name || item.title, meta: item.type }),
  },
  parishes: {
    loader: (api) => api.parishes(),
    mapItem: (item) => ({ id: item.id, title: item.name, meta: item.city }),
  },
  communities: {
    loader: (api, ws) => api.communities(ws),
    mapItem: (item) => ({ id: item.id, title: item.name, meta: item.parish?.name }),
  },
  reports: {
    loader: async (api, ws) => {
      const data = await api.reports(ws);
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.classes)) return data.classes;
      return data ? [data] : [];
    },
    mapItem: (item) => ({
      id: item.id || item.classId || item.name || 'overview',
      title: item.name || item.className || 'Resumo',
      meta: item.attendance != null ? `${Math.round(item.attendance)}%` : undefined,
    }),
  },
  catechetical_years: {
    loader: (api) => api.catecheticalYears(),
    mapItem: (item) => ({ id: item.id, title: item.name }),
  },
  formation: {
    loader: (api, ws) => api.formation(ws),
    mapItem: (item) => ({ id: item.id, title: item.name, meta: item.description }),
  },
  bible: {
    loader: (api) => api.bibleBooks(),
    mapItem: (item) => ({ id: item.id, title: item.name, meta: item.testament }),
    onOpen: (router, _api, id) => router.push(`/(app)/bible/${id}`),
  },
};
