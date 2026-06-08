import { useTranslation } from 'react-i18next';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';

export default function PrivacyPage() {
  const { t } = useTranslation('legal');
  const collectedItems = t('privacy.sections.collected.items', { returnObjects: true }) as string[];
  const purposeItems = t('privacy.sections.purpose.items', { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-20 space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-4">{t('privacy.title')}</h1>
          <p className="text-muted-foreground">{t('privacy.updated')}</p>
        </div>

        <div className="space-y-6 text-sm text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">{t('privacy.sections.intro.title')}</h2>
            <p>{t('privacy.sections.intro.text')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">{t('privacy.sections.collected.title')}</h2>
            <p>{t('privacy.sections.collected.intro')}</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              {collectedItems.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">{t('privacy.sections.purpose.title')}</h2>
            <p>{t('privacy.sections.purpose.intro')}</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              {purposeItems.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">{t('privacy.sections.minors.title')}</h2>
            <p>{t('privacy.sections.minors.text')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">{t('privacy.sections.rights.title')}</h2>
            <p>{t('privacy.sections.rights.text')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">{t('privacy.sections.dpo.title')}</h2>
            <p><strong>{t('privacy.sections.dpo.email_label')}</strong> {t('privacy.sections.dpo.email')}</p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
