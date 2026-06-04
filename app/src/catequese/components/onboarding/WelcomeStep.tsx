import { Heart, ArrowRight } from 'lucide-react';
import { useAuth } from 'wasp/client/auth';
import { Button } from '../../../client/components/ui/button';

interface WelcomeStepProps {
  onStart: () => void;
}

export function WelcomeStep({ onStart }: WelcomeStepProps) {
  const { data: user } = useAuth();
  const firstName = user?.firstName || '';

  return (
    <div className="flex flex-col items-center text-center space-y-6 py-8 animate-in fade-in duration-500">
      <div className="rounded-full bg-primary/10 p-6">
        <Heart className="h-12 w-12 text-primary" />
      </div>

      <div className="space-y-2 max-w-md">
        <h2 className="text-2xl font-bold tracking-tight">
          {firstName ? `Olá, ${firstName}! 👋` : 'Bem-vindo(a)! 👋'}
        </h2>
        <p className="text-muted-foreground">
          O <strong>Catequese Viva</strong> é a plataforma que ajuda paróquias, catequistas e famílias a viver a catequese de forma organizada e conectada.
        </p>
        <p className="text-sm text-muted-foreground">
          Vamos configurar o teu espaço em <strong>~2 minutos</strong>. É rápido!
        </p>
      </div>

      <Button onClick={onStart} size="lg" className="gap-2">
        Começar
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
