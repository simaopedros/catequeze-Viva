import { useAuth } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { PublicNavbar } from "../../catequese/PublicNavbar";
import { PublicFooter } from "../../catequese/PublicFooter";
import { FileQuestion, ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";

export function NotFoundPage() {
  const { data: user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="inline-flex rounded-full bg-muted p-4">
            <FileQuestion className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-6xl font-bold tracking-tight">404</h1>
            <p className="text-lg text-muted-foreground">
              Página não encontrada. O conteúdo que procura pode ter sido movido ou removido.
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button asChild>
              <WaspRouterLink to={user ? routes.AppDashboardRoute.to : routes.LandingPageRoute.to}>
                Ir para o início
              </WaspRouterLink>
            </Button>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
