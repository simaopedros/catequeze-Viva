import { useTranslation } from 'react-i18next';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';

const OFFER_KEYS = ['classes', 'attendance', 'sacraments', 'content', 'communication', 'reports'] as const;

export default function AboutPage() {
  const { t } = useTranslation('public');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-20 space-y-8">
        <div>
          <h1 className="mb-4 text-4xl font-semibold tracking-tight text-foreground">{t('about.title')}</h1>
          <p className="text-lg text-muted-foreground">{t('about.intro')}</p>
        </div>

        <section>
          <h2 className="text-2xl font-semibold mb-3">{t('about.mission_title')}</h2>
          <p className="text-muted-foreground">{t('about.mission_text')}</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">{t('about.offer_title')}</h2>
          <ul className="space-y-3 text-muted-foreground">
            {OFFER_KEYS.map(key => (
              <li key={key}>{t(`about.offers.${key}`)}</li>
            ))}
          </ul>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
