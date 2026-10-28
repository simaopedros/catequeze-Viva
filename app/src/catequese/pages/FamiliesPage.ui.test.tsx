import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { listHouseholds, listCommunities } from 'wasp/client/operations';
import { renderPage, stubUseQuery } from '../../__tests__/ui/hierarchyTestUtils';
import FamiliesPage from './FamiliesPage';
import { common_pt_BR_core as common } from '../../i18n/resources_pt_BR_core';

const context = vi.hoisted(() => ({ role: 'ASSISTANT_CATECHIST', isAdmin: false }));
vi.mock('../../client/hooks/useUserContext', () => ({ useUserContext: () => ({ userRole: context.role, isAdmin: context.isAdmin, parishId: 'parish-1' }) }));
vi.mock('../../client/hooks/useActiveParish', () => ({ useActiveParish: () => ({ activeParishId: 'parish-1' }) }));
vi.mock('../components/FamilyPortalInviteBanner', () => ({ FamilyPortalInviteBanner: () => null }));
vi.mock('react-i18next', () => ({ useTranslation: (ns: string) => ({ t: (key: string) => ns === 'navigation' ? key : key.split('.').reduce((obj: any, part: string) => obj?.[part], common as any) ?? key }) }));

describe('FamiliesPage creation actions', () => {
  beforeEach(() => { context.role = 'ASSISTANT_CATECHIST'; context.isAdmin = false; });
  it('allows an assistant catechist to create from the header and empty state', async () => {
    stubUseQuery([[listHouseholds, { items: [], nextCursor: null }], [listCommunities, []]]);
    renderPage(<FamiliesPage />);
    expect(screen.getByRole('link', { name: 'Nova família' })).toHaveAttribute('href', '/app/families/new');
    expect(screen.getByRole('link', { name: common.families.register })).toHaveAttribute('href', '/app/families/new');
  });
  it('shows disabled actions and accessible visible hints in the empty state', () => {
    context.role = 'PASTORAL_VIEWER';
    stubUseQuery([[listHouseholds, { items: [], nextCursor: null }], [listCommunities, []]]);
    renderPage(<FamiliesPage />);
    for (const name of ['Nova família', common.families.register]) {
      const button = screen.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAccessibleDescription('Peça a um coordenador');
    }
    expect(screen.getAllByText('Peça a um coordenador')).toHaveLength(2);
  });
  it('shows the disabled header action when families exist', async () => {
    context.role = 'GUARDIAN';
    stubUseQuery([[listHouseholds, { items: [{ id: '1', name: 'Família Exemplo', guardians: [] }], nextCursor: null }], [listCommunities, []]]);
    renderPage(<FamiliesPage />);
    expect(await screen.findByText('Família Exemplo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nova família' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Nova família' })).toHaveAccessibleDescription('Peça a um coordenador');
  });
});
