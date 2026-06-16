import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '../../../client/components/ui/button';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { CreditsPill } from '../CreditsPill';

interface AiHubLayoutProps {
  title: string;
  subtitle?: string;
  creditsLeft?: number | null;
  monthlyAllowance?: number | null;
  children: ReactNode;
}

export function AiHubLayout({ title, subtitle, creditsLeft, monthlyAllowance, children }: AiHubLayoutProps) {
  const { t } = useTranslation('ai');

  return (
    <div className="flex min-h-[80vh] flex-col">
      <div className="flex flex-col gap-3 border-b bg-card px-3 py-3 shrink-0 lg:flex-row lg:items-center lg:justify-between lg:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to="/app/ai-hub">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 truncate text-lg font-bold">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {creditsLeft !== null && creditsLeft !== undefined && (
          <CreditsPill
            creditsLeft={creditsLeft}
            monthlyAllowance={monthlyAllowance ?? undefined}
            onClick={() => window.location.href = '/app/billing'}
          />
        )}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
