import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { exportRegistrationApplications } from 'wasp/client/operations';
import Page from './RegistrationExportPage';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router', () => ({ useParams: () => ({ campaignId: 'campaign' }), Link: ({ children }: any) => <span>{children}</span> }));
beforeEach(() => { vi.mocked(exportRegistrationApplications).mockReset(); });
it('exports selected fields with the chosen purpose', async () => {
  vi.mocked(exportRegistrationApplications).mockResolvedValueOnce({ csv: 'data', count: 1 } as any);
  URL.createObjectURL = vi.fn(() => 'blob:test'); URL.revokeObjectURL = vi.fn();
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  render(<Page />); fireEvent.click(screen.getByLabelText('export.field.firstName'));
  fireEvent.change(screen.getByLabelText('export.purpose'), { target: { value: 'INSTITUTIONAL_REPORT' } });
  fireEvent.click(screen.getByText('export.download'));
  await waitFor(() => expect(exportRegistrationApplications).toHaveBeenCalledWith({ campaignId: 'campaign', fields: ['applicationId', 'status', 'firstName'], purpose: 'INSTITUTIONAL_REPORT' }));
  expect(await screen.findByText('export.success')).toBeTruthy(); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test'); click.mockRestore();
});
it('requires a field and reports errors', async () => {
  vi.mocked(exportRegistrationApplications).mockRejectedValueOnce(new Error()); render(<Page />);
  fireEvent.click(screen.getByLabelText('export.field.applicationId')); fireEvent.click(screen.getByLabelText('export.field.status'));
  expect((screen.getByText('export.download') as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByLabelText('export.field.status')); fireEvent.click(screen.getByText('export.download'));
  expect(await screen.findByText('export.error')).toBeTruthy();
});
