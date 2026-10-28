import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi, it, expect } from 'vitest';
import { BottomNav } from '../catequese/BottomNav';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => ({ classes: 'Turmas', catechumens: 'Catequizandos', catechumens_short: 'Alunos', more: 'Mais', primarySection: 'Navegação principal' } as Record<string, string>)[key] || key }) }));
vi.mock('../client/hooks/useUserContext', () => ({ useUserContext: () => ({ userRole: 'CATECHIST', isAdmin: false }) }));
vi.mock('../client/hooks/useActiveWorkspace', () => ({ useActiveWorkspace: () => ({ workspaceType: 'PARISH' }) }));
vi.mock('../client/hooks/useUnreadNotificationCount', () => ({ useUnreadNotificationCount: () => 0 }));
vi.mock('../catequese/components/SubscriptionGate', () => ({ useWorkspaceSubscriptionAccess: () => ({ userLoaded: true, isBillingManager: false, hasAccess: true }) }));
vi.mock('../shared/navigation', () => ({ getVisibleNavigation: () => ({ bottomBar: [{ iconKey: 'classes', labelKey: 'classes', to: '/app/classes' }, { iconKey: 'catechumens', labelKey: 'catechumens', to: '/app/catechumens' }] }) }));
vi.mock('../catequese/components/BottomSheetNav', () => ({ BottomSheetNav: () => null }));
vi.mock('../client/analytics/marketingAnalytics', () => ({ trackMobileEvent: vi.fn() }));
it('expõe nomes completos para os links e o botão Mais', () => {
  render(<MemoryRouter><BottomNav /></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Turmas' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Catequizandos' })).toHaveTextContent('Alunos');
  expect(screen.getByRole('button', { name: 'Mais' })).toBeInTheDocument();
});
