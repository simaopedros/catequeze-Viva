import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import * as ops from 'wasp/client/operations';
import ClassFormationPage from './ClassFormationPage';

vi.mock('react-router', () => ({ useParams: () => ({ campaignId: 'campaign' }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const plan = { id: 'v1', status: 'DRAFT', revision: 2, algorithmVersion: '1', hashShort: 'abc', summary: { classes: 1, allocated: 1, waitlisted: 1, needsReview: 0 }, plannedClasses: [{ id: 'c', offeringId: 'o', occupied: 1, capacity: 1, schedule: { weekday: 1, startTime: '10:00', endTime: '11:00' } }], placements: [{ applicationId: 'a', name: 'Ana', offeringId: 'o', status: 'WAITLISTED', plannedClassId: null, waitlistOrder: 1, reasonCodes: [], locked: false }] };
const refetch = vi.fn().mockResolvedValue({});
beforeEach(() => { vi.clearAllMocks(); vi.mocked(ops.useQuery).mockReturnValue({ data: [plan], isLoading: false, error: null, refetch } as any); });
it('exige motivo e confirmação antes de incluir acima da capacidade', async () => {
  vi.mocked(ops.updateFormationPlacement).mockResolvedValueOnce({} as any);
  render(<ClassFormationPage />);
  fireEvent.change(screen.getByLabelText('formation.target'), { target: { value: 'c' } });
  expect(screen.getByRole('alert')).toBeTruthy();
  expect((screen.getByText('formation.save') as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('formation.reason'), { target: { value: 'FAMILY_REQUEST' } });
  fireEvent.click(screen.getByLabelText('formation.confirmOverCapacity'));
  fireEvent.click(screen.getByText('formation.lock'));
  fireEvent.click(screen.getByText('formation.save'));
  await waitFor(() => expect(ops.updateFormationPlacement).toHaveBeenCalledWith({ planId: 'v1', applicationId: 'a', expectedRevision: 2, plannedClassId: 'c', locked: true, reason: 'FAMILY_REQUEST', confirmOverCapacity: true }));
});
it('recarrega a prévia quando ocorre conflito de revisão', async () => {
  vi.mocked(ops.updateFormationPlacement).mockRejectedValueOnce({ statusCode: 409 });
  render(<ClassFormationPage />);
  fireEvent.change(screen.getByLabelText('formation.reason'), { target: { value: 'OTHER' } });
  fireEvent.click(screen.getByText('formation.save'));
  await screen.findByText('formation.stale');
  expect(refetch).toHaveBeenCalled();
});
it('recalcula e seleciona a nova versão', async () => {
  vi.mocked(ops.generateFormationPreview).mockResolvedValueOnce({ id: 'v2' } as any);
  render(<ClassFormationPage />);
  fireEvent.click(screen.getByText('formation.recalculate'));
  await screen.findByText('formation.generated');
  expect(ops.generateFormationPreview).toHaveBeenCalledWith({ campaignId: 'campaign' });
  expect(refetch).toHaveBeenCalled();
});
