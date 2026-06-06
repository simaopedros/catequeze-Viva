import { Heart, User, Church, ArrowRight, Check } from 'lucide-react';
import { useAuth } from 'wasp/client/auth';
import { Button } from '../../../client/components/ui/button';

interface WelcomeStepProps {
  onPersonal: () => void;
  onManager: () => void;
}

export function WelcomeStep({ onPersonal, onManager }: WelcomeStepProps) {
  const { data: user } = useAuth();
  const firstName = user?.firstName || '';

  return (
    <div className="flex flex-col items-center text-center space-y-6 py-4 animate-in fade-in duration-500">
      <div className="rounded-full bg-primary/10 p-4">
        <Heart className="h-10 w-10 text-primary" />
      </div>

      <div className="space-y-1 max-w-md">
        <h2 className="text-2xl font-bold tracking-tight">
          {firstName ? `Olá, ${firstName}!` : 'Bem-vindo(a)!'}
        </h2>
        <p className="text-muted-foreground text-sm">
          Como queres usar o <strong>Catequese Viva</strong>?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-sm">
        {/* Personal Account */}
        <button
          onClick={onPersonal}
          className="flex items-start gap-4 rounded-2xl border-2 border-blue-200 bg-blue-50/50 hover:border-blue-400 hover:bg-blue-50 p-5 text-left transition-all group"
        >
          <div className="rounded-xl bg-blue-100 p-2.5 group-hover:bg-blue-200 transition-colors shrink-0">
            <User className="h-7 w-7 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base">Conta Pessoal</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Para catequistas individuais</p>
            <ul className="mt-2 space-y-0.5">
              {['Espaço pessoal isolado', 'Suas turmas e catequizandos', 'Gerador de encontros com IA'].map(f => (
                <li key={f} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Check className="h-3 w-3 text-blue-500 shrink-0" />{f}
                </li>
              ))}
            </ul>
          </div>
          <ArrowRight className="h-5 w-5 text-blue-400 group-hover:translate-x-1 transition-transform shrink-0 mt-2" />
        </button>

        {/* Manager Account */}
        <button
          onClick={onManager}
          className="flex items-start gap-4 rounded-2xl border-2 border-purple-200 bg-purple-50/50 hover:border-purple-400 hover:bg-purple-50 p-5 text-left transition-all group"
        >
          <div className="rounded-xl bg-purple-100 p-2.5 group-hover:bg-purple-200 transition-colors shrink-0">
            <Church className="h-7 w-7 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base">Conta de Gestão</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Para paróquias e dioceses</p>
            <ul className="mt-2 space-y-0.5">
              {['Multi-catequista', 'Comunicação integrada', 'Gestão completa da catequese'].map(f => (
                <li key={f} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Check className="h-3 w-3 text-purple-500 shrink-0" />{f}
                </li>
              ))}
            </ul>
          </div>
          <ArrowRight className="h-5 w-5 text-purple-400 group-hover:translate-x-1 transition-transform shrink-0 mt-2" />
        </button>
      </div>
    </div>
  );
}
