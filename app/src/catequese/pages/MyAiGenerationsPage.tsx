import { useState } from 'react';
import { Link } from 'react-router';
import { AppShell } from '../AppShell';
import { useQuery } from 'wasp/client/operations';
import { listMyAiGenerations } from 'wasp/client/operations';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { Input } from '../../client/components/ui/input';
import { Sparkles, Search, FileText, Calendar, Clock, ArrowRight } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  IN_REVIEW: 'Em revisão',
  APPROVED: 'Aprovado',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Arquivado',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  PUBLISHED: 'bg-blue-100 text-blue-700',
  ARCHIVED: 'bg-red-100 text-red-700',
};

export default function MyAiGenerationsPage() {
  const { data: items, isLoading } = useQuery(listMyAiGenerations);
  const [search, setSearch] = useState('');

  const filtered = (items || []).filter((item: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.theme?.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-violet-500" />
              Minhas Gerações IA
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Histórico de encontros, atividades e conteúdos gerados com inteligência artificial
            </p>
          </div>
          <Link to="/app/ai-planner">
            <Button variant="outline" size="sm">
              <Sparkles className="mr-1 h-4 w-4" />
              Novo Encontro
            </Button>
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou tema..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="font-medium">Nenhuma geração IA encontrada</p>
            <p className="text-sm mt-1">
              {items?.length
                ? 'Nenhum resultado para esta busca.'
                : 'Gere seu primeiro encontro de catequese com IA!'}
            </p>
            {!items?.length && (
              <Link to="/app/ai-planner" className="inline-block mt-4">
                <Button>
                  <Sparkles className="mr-1 h-4 w-4" />
                  Criar Encontro com IA
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item: any) => (
              <Link
                key={item.id}
                to={`/app/content-library/${item.id}`}
                className="block rounded-xl border bg-card p-4 hover:border-primary/50 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <Badge className={`text-[10px] ${STATUS_COLORS[item.status] || 'bg-gray-100'}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </Badge>
                    </div>
                    {item.theme && (
                      <p className="text-sm text-muted-foreground truncate">{item.theme}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                      {item.estimatedTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.estimatedTime} min
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
