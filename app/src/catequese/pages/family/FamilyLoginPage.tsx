import { Link, useSearchParams } from 'react-router';
import CustomLoginForm from '../../../auth/CustomLoginForm';
import { useRedirectIfLoggedIn } from '../../../auth/hooks/useRedirectIfLoggedIn';
import { Church, Sparkles } from 'lucide-react';

/**
 * Login page for the family portal.
 * Simplified — no links to pricing, plans, or staff tools.
 */
export default function FamilyLoginPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  useRedirectIfLoggedIn();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-primary text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Portal da Família
          </div>
          <h1 className="text-2xl font-bold">Entrar</h1>
          <p className="text-sm text-muted-foreground">
            Acede ao teu painel de família.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <CustomLoginForm />
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Não tens conta?{' '}
            <Link
              to={`/criar-conta${token ? `?token=${token}` : ''}`}
              className="text-primary underline underline-offset-2 font-medium"
            >
              Criar conta
            </Link>
          </p>
          {token && (
            <p className="text-xs text-muted-foreground">
              Ao criar conta ou entrar, poderás aceitar o convite recebido.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
