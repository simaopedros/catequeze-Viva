import { Button } from '../../../client/components/ui/button';
import { Eye, Check } from 'lucide-react';

interface ViewerDetailsProps {
  onComplete: () => void;
}

export function ViewerDetails({ onComplete }: ViewerDetailsProps) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Eye className="h-5 w-5 text-primary" />Liderança Pastoral
      </h2>
      <p className="text-sm text-muted-foreground">
        Terás acesso de visualização às turmas, presenças e relatórios da paróquia, sem permissão para editar.
      </p>
      <div className="flex justify-end">
        <Button onClick={onComplete}>
          <Check className="mr-2 h-4 w-4" />Confirmar e entrar
        </Button>
      </div>
    </div>
  );
}
