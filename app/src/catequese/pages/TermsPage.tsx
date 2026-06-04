import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-20 space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-4">Termos de Uso</h1>
          <p className="text-muted-foreground">Última atualização: 31 de maio de 2026</p>
        </div>

        <div className="space-y-6 text-sm text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">1. Aceitação dos Termos</h2>
            <p>Ao acessar e usar a plataforma Catequese Viva, você concorda com estes Termos de Uso.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">2. Descrição do Serviço</h2>
            <p>A Catequese Viva é uma plataforma SaaS para gestão de catequese católica: turmas, presença, conteúdo, sacramentos e comunicação pastoral.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">3. Obrigações do Usuário</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Fornecer informações verdadeiras e atualizadas</li>
              <li>Manter a confidencialidade de suas credenciais</li>
              <li>Não compartilhar sua conta com terceiros</li>
              <li>Utilizar a plataforma apenas para fins de catequese e pastoral</li>
              <li>Respeitar as normas da LGPD ao tratar dados de catequizandos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">4. Limitação de Responsabilidade</h2>
            <p>A Catequese Viva não se responsabiliza por conteúdo publicado pelos usuários, decisões pastorais baseadas nos dados da plataforma, ou indisponibilidade temporária.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">5. Foro</h2>
            <p>Fica eleito o foro da Comarca de São Paulo, Brasil, para dirimir quaisquer controvérsias decorrentes destes Termos de Uso.</p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
