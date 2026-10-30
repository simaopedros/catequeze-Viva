import { render, screen, waitFor } from '@testing-library/react';
import { vi, it, expect } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
vi.mock('wasp/client/api', () => ({ api: { get: vi.fn().mockResolvedValue({ data: { status: 'open', title: 'Campanha', parishName: 'Paróquia', publicContact: null, opensAt: '2026-01-01T00:00:00Z', closesAt: '2026-02-01T00:00:00Z', timezone: 'UTC', windows: [], stages: [] } }) } }));
import PublicRegistrationPage from './PublicRegistrationPage';
it('apresenta informações sem formulário e sem links externos', async () => {
 const { container } = render(<MemoryRouter initialEntries={['/inscricoes/teste']}><Routes><Route path="/inscricoes/:slug" element={<PublicRegistrationPage />} /></Routes></MemoryRouter>);
 await waitFor(() => expect(screen.getByRole('heading', { name: 'Campanha' })).toBeTruthy());
 expect(screen.getByRole('button')).toBeDisabled();
 expect(container.querySelector('a')).toBeNull(); expect(container.querySelector('form')).toBeNull();
});
