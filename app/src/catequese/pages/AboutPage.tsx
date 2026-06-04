import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-20 space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-4">Sobre a Catequese Viva</h1>
          <p className="text-lg text-muted-foreground">
            Uma plataforma pastoral completa para a iniciação cristã, conectando dioceses,
            paróquias, catequistas, famílias e catequizandos em uma jornada de fé integrada.
          </p>
        </div>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Nossa Missão</h2>
          <p className="text-muted-foreground">
            Facilitar e fortalecer a missão catequética da Igreja Católica, oferecendo
            ferramentas modernas que permitam aos coordenadores, catequistas e famílias
            acompanhar a formação cristã com excelência, simplicidade e segurança.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">O que oferecemos</h2>
          <ul className="space-y-3 text-muted-foreground">
            <li><strong>Gestão de turmas e catequistas</strong> — organize turmas por etapa, ano catequético e comunidade.</li>
            <li><strong>Controle de presença</strong> — registre presenças, ausências e justificativas com facilidade.</li>
            <li><strong>Acompanhamento sacramental</strong> — configure jornadas sacramentais personalizadas.</li>
            <li><strong>Biblioteca de conteúdo</strong> — crie, revise e publique planos de encontro.</li>
            <li><strong>Comunicação pastoral</strong> — envie mensagens segmentadas para famílias e catequistas.</li>
            <li><strong>Relatórios e indicadores</strong> — acompanhe a saúde da catequese com KPIs.</li>
          </ul>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
