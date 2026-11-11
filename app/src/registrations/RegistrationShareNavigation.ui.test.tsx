import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import * as ops from 'wasp/client/operations';
import { public_pt_BR_core as pt } from '../i18n/resources_pt_BR_core';
import RegistrationShareNavigation from './RegistrationShareNavigation';

vi.mock('../client/hooks/useActiveParish', () => ({ useActiveParish: () => ({ activeParishId: 'p' }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => {
  let value: any = pt;
  for (const part of key.split('.')) value = value?.[part];
  return value ?? key;
} }) }));

let campaigns: unknown[];
let rooms: unknown;
let availability: unknown;

beforeEach(() => {
  campaigns = [];
  rooms = undefined;
  availability = undefined;
  vi.mocked(ops.useQuery).mockImplementation(((op: unknown) => ({
    data: op === ops.getRegistrationCampaignShare ? campaigns : op === ops.listRooms ? rooms : op === ops.getCatechistAvailability ? availability : [],
    refetch: vi.fn(), error: null,
  })) as any);
});

function renderNavigation() {
  return render(<MemoryRouter><RegistrationShareNavigation /></MemoryRouter>);
}

it('não renderiza navegação quando não há atalhos', () => {
  const { container } = renderNavigation();
  expect(container).toBeEmptyDOMElement();
});

it('mostra apenas Salas quando não há campanhas', () => {
  rooms = { rooms: [{ id: 'r' }] };
  renderNavigation();
  expect(screen.getAllByRole('link')).toHaveLength(1);
  expect(screen.getByRole('link', { name: 'Salas e capacidade' })).toHaveAttribute('href', '/app/salas');
});

it('mostra Inscrições quando há campanha', () => {
  campaigns = [{ id: 'c', status: 'DRAFT' }];
  renderNavigation();
  expect(screen.getByRole('link', { name: 'Inscrições' })).toHaveAttribute('href', '/app/inscricoes');
});
