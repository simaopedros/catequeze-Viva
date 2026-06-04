import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-20 space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-4">Política de Privacidade</h1>
          <p className="text-muted-foreground">Última atualização: 31 de maio de 2026</p>
        </div>

        <div className="space-y-6 text-sm text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">1. Introdução</h2>
            <p>A Catequese Viva está comprometida com a proteção dos dados pessoais de seus usuários, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). Esta política explica como coletamos, usamos e protegemos suas informações.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">2. Dados coletados</h2>
            <p>Coletamos apenas os dados estritamente necessários para a prestação dos serviços:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Nome, email e telefone dos usuários (catequistas, coordenadores, responsáveis)</li>
              <li>Nome e data de nascimento dos catequizandos</li>
              <li>Registros de presença em encontros catequéticos</li>
              <li>Documentos sacramentais enviados pelas famílias</li>
              <li>Consentimentos de uso de imagem e comunicação</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">3. Finalidade do tratamento</h2>
            <p>Os dados são utilizados exclusivamente para:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Gestão da catequese paroquial (turmas, presença, sacramentos)</li>
              <li>Comunicação pastoral entre coordenadores, catequistas e famílias</li>
              <li>Geração de relatórios pastorais anonimizados</li>
              <li>Cumprimento de obrigações legais e canônicas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">4. Proteção de dados de menores</h2>
            <p>Dados de crianças e adolescentes recebem proteção especial: coleta mínima, consentimento parental obrigatório, acesso restrito e não compartilhamento com terceiros.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">5. Seus direitos (LGPD)</h2>
            <p>Acessar, corrigir, exportar ou solicitar exclusão dos seus dados. Para exercer esses direitos, acesse as Configurações no aplicativo ou entre em contato pelo email contato@catequeseviva.com.br.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">6. Contato do DPO</h2>
            <p><strong>Email:</strong> privacidade@catequeseviva.com.br</p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
