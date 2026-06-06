import { Link, useLocation } from 'react-router';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '../../client/utils';

interface BreadcrumbItem {
  label: string;
  to?: string;
}

// Map route segments to human-readable labels
const ROUTE_LABELS: Record<string, string> = {
  app: 'Painel',
  classes: 'Turmas',
  catechumens: 'Catequizandos',
  families: 'Famílias',
  'content-library': 'Biblioteca',
  'ai-planner': 'Gerador IA',
  'my-ai-generations': 'Minhas Gerações IA',
  activities: 'Atividades',
  calendar: 'Calendário',
  bible: 'Bíblia',
  catechism: 'Catecismo',
  directory: 'Diretório',
  messages: 'Mensagens',
  'sacramental-journeys': 'Sacramentos',
  documents: 'Documentos',
  reports: 'Relatórios',
  settings: 'Configurações',
  billing: 'Assinatura',
  parishes: 'Paróquias',
  communities: 'Comunidades',
  consents: 'Consentimentos',
  'catechetical-years': 'Anos Catequéticos',
  admin: 'Administração',
  users: 'Usuários',
  new: 'Novo',
  edit: 'Editar',
  import: 'Importar',
  print: 'Imprimir',
  meetings: 'Encontros',
  attendance: 'Presença',
  members: 'Membros',
  onboarding: 'Boas-vindas',
};

export function Breadcrumbs() {
  const location = useLocation();

  // Skip breadcrumbs on root app route
  if (location.pathname === '/app' || location.pathname === '/app/') {
    return null;
  }

  const segments = location.pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = segments.map((seg, i) => {
    const to = '/' + segments.slice(0, i + 1).join('/');
    // Check if last segment is an ID (UUID or numeric)
    const isId = /^[0-9a-f]{8,}|^\d+$/i.test(seg);
    return {
      label: isId ? '#' + seg.substring(0, 8) : (ROUTE_LABELS[seg] || seg),
      to: i < segments.length - 1 ? to : undefined,
    };
  });

  if (items.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground px-1 py-2 overflow-x-auto" aria-label="Breadcrumb">
      <Link to="/app" className="hover:text-foreground transition-colors flex-shrink-0">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          {item.to ? (
            <Link
              to={item.to}
              className="hover:text-foreground transition-colors truncate max-w-[160px]"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium truncate max-w-[160px]">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
