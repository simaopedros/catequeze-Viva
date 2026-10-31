import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import * as ops from 'wasp/client/operations';
import Page from './RegistrationOperationsPage';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router', () => ({ useParams: () => ({ campaignId: 'campaign' }), Link: ({ children, to }: any) => <a href={to}>{children}</a> }));
beforeEach(() => { vi.mocked(ops.useQuery).mockReset(); });
it('shows aggregate counts and simulated retention without personal data', () => {
  vi.mocked(ops.useQuery).mockImplementation(((op: any, args: any) => {
    expect(args).toEqual({ campaignId: 'campaign' });
    return { data: op === ops.getRegistrationOperationalReport ? { counts: [{ status: 'ENROLLED', count: 3 }] } : { simulated: true, expiredTokens: 2, submissions: 4, protectedSubmissions: 1 }, error: null };
  }) as any);
  render(<Page />);
  expect(screen.getByText('operations.status.ENROLLED: 3')).toBeTruthy();
  expect(screen.getByText('operations.simulation')).toBeTruthy();
  expect(screen.getByText('4')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'operations.export' }).getAttribute('href')).toBe('/app/inscricoes/campaign/exportar');
});
it('reports independent query errors and loading states', () => {
  vi.mocked(ops.useQuery).mockImplementation(((op: any) => op === ops.getRegistrationOperationalReport ? { error: new Error() } : { isLoading: true }) as any);
  render(<Page />);
  expect(screen.getByRole('alert').textContent).toBe('operations.error');
  expect(screen.getByRole('status').textContent).toBe('operations.loading');
});
