import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi, it, expect } from 'vitest';
import ClassesPage from '../catequese/pages/ClassesPage';

const data = vi.hoisted(() => ({ items: [] as any[] }));
vi.mock('wasp/client/operations', () => ({ listClasses: vi.fn(), useQuery: () => ({ data: { items: data.items, nextCursor: null }, isLoading: false }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../client/hooks/useActiveWorkspace', () => ({ useActiveWorkspace: () => ({ workspaceId: 'p', isPersonal: false }) }));
vi.mock('../client/hooks/useUserContext', () => ({ useUserContext: () => ({ userRole: 'CATECHIST', isAdmin: false }) }));
vi.mock('../client/hooks/usePlanCatalog', () => ({ usePlanCatalog: () => ({ getBySlug: () => ({ limits: { maxClasses: 100 } }) }) }));
vi.mock('../i18n/useLabels', () => ({ useClassFilters: () => [], useClassStatusMap: () => ({ CONCLUDED: { label: 'Concluída' } }) }));
vi.mock('../i18n/useLocale', () => ({ useLocale: () => ({ currentLocale: 'pt-BR' }) }));
vi.mock('../catequese/components/PlanLimitBanner', () => ({ PlanLimitBanner: () => null }));
it('apresenta estado vazio quando não há turmas', async () => {
  data.items = [];
  render(<MemoryRouter><ClassesPage /></MemoryRouter>);
  expect(await screen.findByText('no_classes_desc')).toBeInTheDocument();
});
it('identifica a ação de consulta de uma turma concluída', async () => {
  data.items = [{ id: '1', name: 'Turma exemplo', status: 'CONCLUDED', _count: { enrollments: 0 }, catechists: [], meetings: [] }];
  render(<MemoryRouter><ClassesPage /></MemoryRouter>);
  expect(await screen.findByText('Turma exemplo')).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: /consult_records/ }).length).toBeGreaterThan(0);
});
