import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import PublicationConfirmation from './PublicationConfirmation';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

it('exige aprovação explícita e avisa sobre capacidade excedida', () => {
  const confirm = vi.fn();
  render(<PublicationConfirmation excess={2} busy={false} onConfirm={confirm} />);
  const button = screen.getByRole('button', { name: 'publication.confirm' }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  expect(screen.getByRole('alert').textContent).toBe('publication.excess');
  fireEvent.click(screen.getByLabelText('publication.approval'));
  fireEvent.click(button);
  expect(confirm).toHaveBeenCalledOnce();
});

it('impede confirmação enquanto há operação em andamento', () => {
  render(<PublicationConfirmation excess={0} busy onConfirm={vi.fn()} />);
  fireEvent.click(screen.getByLabelText('publication.approval'));
  expect((screen.getByRole('button', { name: 'publication.confirm' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByRole('alert')).toBeNull();
});
