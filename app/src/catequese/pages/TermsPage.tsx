import { useTranslation } from 'react-i18next';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';

export default function TermsPage() {
  const { t } = useTranslation('legal');
  const obligations = t('terms.sections.obligations.items', { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-20 space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-4">{t('terms.title')}</h1>
          <p className="text-muted-foreground">{t('terms.updated')}</p>
        </div>

        <div className="space-y-6 text-sm text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">{t('terms.sections.acceptance.title')}</h2>
            <p>{t('terms.sections.acceptance.text')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">{t('terms.sections.service.title')}</h2>
            <p>{t('terms.sections.service.text')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">{t('terms.sections.obligations.title')}</h2>
            <ul className="list-disc pl-5 space-y-1">
              {obligations.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">{t('terms.sections.liability.title')}</h2>
            <p>{t('terms.sections.liability.text')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">{t('terms.sections.jurisdiction.title')}</h2>
            <p>{t('terms.sections.jurisdiction.text')}</p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
