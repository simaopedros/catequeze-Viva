import { Link } from 'react-router';
import { Church, Sparkles } from 'lucide-react';

/**
 * Landing page for the family portal (familia.*).
 * Entry is exclusively via invitation — no self-registration.
 */
export default function FamilyLandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-primary text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Portal da Família
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Catequese Viva</h1>
          <p className="text-muted-foreground text-lg">
            Acompanha a jornada de fé dos teus filhos.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-8 shadow-sm space-y-6">
          <Church className="h-12 w-12 text-primary mx-auto" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Entrada por Convite</h2>
            <p className="text-sm text-muted-foreground">
              O portal da família é acedido através de um convite enviado pela tua paróquia.
              Se ainda não recebeste um convite, fala com o teu catequista ou coordenador paroquial.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              to="/entrar"
              className="block w-full rounded-lg bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium text-center hover:bg-primary/90 transition-colors"
            >
              Entrar
            </Link>
            <p className="text-xs text-muted-foreground">
              Já tens um convite?{' '}
              <Link to="/convite" className="text-primary underline underline-offset-2">
                Inserir código
              </Link>
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          És coordenador ou catequista?{' '}
          <a href="https://catequeseviva.com" className="text-primary underline underline-offset-2">
            Acede ao portal principal
          </a>
        </p>
      </div>
    </div>
  );
}
