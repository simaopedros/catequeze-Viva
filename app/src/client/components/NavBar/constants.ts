import type { TFunction } from 'i18next';
import { DocsUrl } from '../../../shared/common';
import type { NavigationItem } from './NavBar';

export function getMarketingNavigationItems(
  tPublicNav: TFunction<'publicNav'>,
): NavigationItem[] {
  return [
    { name: tPublicNav('resources'), to: '/#recursos' },
    { name: tPublicNav('pricing'), to: '/pricing' },
    { name: tPublicNav('about'), to: '/about' },
    { name: tPublicNav('contact'), to: '/contact' },
  ] as const;
}

export function getDemoNavigationItems(
  tNavigation: TFunction<'navigation'>,
  tCommon: TFunction<'common'>,
): NavigationItem[] {
  return [
    { name: tNavigation('dashboard'), to: '/app' },
    { name: tCommon('documentation'), to: DocsUrl },
  ] as const;
}
