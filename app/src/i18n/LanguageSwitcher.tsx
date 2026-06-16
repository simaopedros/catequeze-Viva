import { useTranslation } from 'react-i18next';
import { useLocale, SupportedLocale } from './useLocale';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../client/components/ui/dropdown-menu';
import { Button } from '../client/components/ui/button';

interface LanguageSwitcherProps {
  variant?: 'default' | 'inline';
}

export function LanguageSwitcher({ variant = 'default' }: LanguageSwitcherProps) {
  const { t } = useTranslation('common');
  const { currentLocale, setLocale, supportedLocales, getLocaleLabel } = useLocale();

  if (variant === 'inline') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-1.5 text-xs">
            <Globe className="h-3.5 w-3.5" />
            <span>{getLocaleLabel(currentLocale as SupportedLocale)}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {supportedLocales.map((locale) => (
            <DropdownMenuItem
              key={locale}
              onClick={() => setLocale(locale)}
              className={currentLocale === locale ? 'font-semibold' : ''}
            >
              {getLocaleLabel(locale)}
              {currentLocale === locale && (
                <span className="ml-auto text-xs text-muted-foreground">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Globe className="h-4 w-4" />
          <span className="hidden md:inline">{getLocaleLabel(currentLocale as SupportedLocale)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {supportedLocales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => setLocale(locale)}
            className={currentLocale === locale ? 'font-semibold' : ''}
          >
            {getLocaleLabel(locale)}
            {currentLocale === locale && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
