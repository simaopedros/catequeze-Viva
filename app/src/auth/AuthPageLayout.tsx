import { ReactNode } from "react";
import { useTranslation } from 'react-i18next';
import { AuthHeader } from "./AuthHeader";

export function AuthPageLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation('auth');
  return (
    <div className="flex min-h-screen flex-col bg-surface-subtle">
      <AuthHeader />
      <div className="flex flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-[28rem]">
          <div className="bg-card text-card-foreground px-4 py-8 shadow-elevation-md sm:rounded-xl border border-border sm:px-10">
            {children}
          </div>
        </div>
      </div>
      <footer className="border-t py-3 text-center text-xs text-muted-foreground">
        {t('footer_copyright', { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}
