import { useState } from 'react';
import { User, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '../../../client/components/ui/button';
import { Input } from '../../../client/components/ui/input';
import { useAuth } from 'wasp/client/auth';

interface PersonalSetupProps {
  onComplete: (details: { className?: string }) => void;
  loading: boolean;
}

export function PersonalSetup({ onComplete, loading }: PersonalSetupProps) {
  const { data: user } = useAuth();
  const [className, setClassName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ className: className.trim() || undefined });
  };

  return (
    <div className="flex flex-col items-center text-center space-y-5 py-4 animate-in fade-in duration-500">
      <div className="rounded-full bg-primary/10 p-4">
        <User className="h-10 w-10 text-primary" />
      </div>

      <div className="space-y-1 max-w-md">
        <h2 className="text-2xl font-bold">Conta Pessoal</h2>
        <p className="text-muted-foreground text-sm">
          O teu espaço individual de catequese está quase pronto!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-left space-y-2">
          <p className="text-sm font-medium text-primary flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> O que está incluído:
          </p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Espaço pessoal isolado</li>
            <li>• {user?.subscriptionPlan === 'catechist_free' ? '2 turmas e 30 catequizandos' : 'Turmas ilimitadas'}</li>
            <li>• Gerador de encontros com IA</li>
            <li>• Calendário litúrgico</li>
          </ul>
        </div>

        <div className="text-left">
          <label className="text-sm font-medium">Nome da primeira turma (opcional)</label>
          <Input
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="Ex: Catequese 1º Ano"
            className="mt-1"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Podes criar depois em Turmas se preferires.
          </p>
        </div>

        <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Criando espaço...</>
          ) : (
            <>Entrar no meu espaço <ArrowRight className="h-4 w-4" /></>
          )}
        </Button>
      </form>
    </div>
  );
}
