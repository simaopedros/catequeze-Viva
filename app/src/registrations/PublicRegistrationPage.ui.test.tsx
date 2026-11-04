import React from 'react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { public_pt_BR as publicTranslations } from '../i18n/resources_pt_BR';
void i18n.use(initReactI18next).init({ lng: 'pt-BR', resources: { 'pt-BR': { public: publicTranslations } }, interpolation: { escapeValue: false } });
import { act, render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
vi.hoisted(() => { vi.stubEnv('REACT_APP_TURNSTILE_SITE_KEY', 'test-site-key'); });
vi.mock('wasp/client/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
import { api } from 'wasp/client/api';
import PublicRegistrationPage from './PublicRegistrationPage';
import RegistrationConfirmationPage from './RegistrationConfirmationPage';

const campaign = { status: 'open', title: 'Campanha', parishName: 'Paróquia', publicContact: null, windows: [{ id: 'w1', label: 'Sábado', startTime: '09:00', endTime: '10:00' }, { id: 'w2', label: 'Domingo', startTime: '10:00', endTime: '11:00' }], stages: [{ offeringId: 'minor', name: 'Crianças', audience: 'MINOR' }, { offeringId: 'adult', name: 'Adultos', audience: 'ADULT' }, { offeringId: 'both', name: 'Todos', audience: 'BOTH' }] };
beforeEach(() => {
  vi.mocked(api.get).mockImplementation(async (url: string) => ({ data: url.endsWith('/form-token') ? { formToken: 'form-token' } : campaign }) as any);
  vi.mocked(api.post).mockReset();
  document.querySelector('script[data-registration-turnstile]')?.remove();
  window.turnstile = { render: vi.fn((_el, options) => { (options.callback as (token: string) => void)('captcha'); return 'widget'; }), remove: vi.fn(), reset: vi.fn() };
});
async function openForm() {
  const user = userEvent.setup();
  const rendered = render(<MemoryRouter initialEntries={['/inscricoes/teste']}><Routes><Route path="/inscricoes/:slug" element={<PublicRegistrationPage />} /></Routes></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Campanha' });
  expect(document.querySelector('script[data-registration-turnstile]')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Fazer inscrição' }));
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  return { user, ...rendered };
}
async function fillPerson(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nome do responsável'), 'Maria Teste');
  await user.type(screen.getByLabelText('Relação com os inscritos'), 'Mãe');
  await user.type(screen.getByLabelText('Nome', { exact: true }), 'Ana');
  await user.type(screen.getByLabelText('Sobrenome'), 'Teste');
  fireEvent.change(screen.getByLabelText('Data de nascimento'), { target: { value: '2015-01-01' } });
  await user.selectOptions(screen.getByLabelText('Etapa desejada'), 'minor');
  await user.click(screen.getByRole('checkbox', { name: /Autorizo a participação/ }));
}
it('envia sem e-mail, exige janela oferecida e mostra protocolo', async () => {
  const local = vi.spyOn(Storage.prototype, 'getItem');
  const write = vi.spyOn(Storage.prototype, 'setItem');
  vi.mocked(api.post).mockResolvedValue({ data: { protocol: 'ABC123', emailConfirmationRequired: false } } as any);
  const { user, container } = await openForm();
  expect(container.querySelector('a')).toBeNull();
  expect(document.querySelector('script[data-registration-turnstile]')).toHaveAttribute('src', expect.stringContaining('challenges.cloudflare.com'));
  expect(container.querySelector('[aria-hidden="true"] input')).toHaveAttribute('tabindex', '-1');
  expect(screen.queryByRole('option', { name: 'Adultos' })).toBeNull();
  await fillPerson(user);
  await user.click(screen.getByRole('button', { name: 'Enviar inscrição' }));
  expect(await screen.findByText('Confira este campo.')).toBeTruthy();
  expect(api.post).not.toHaveBeenCalled();
  await user.click(screen.getByRole('checkbox', { name: /Domingo/ }));
  await user.click(screen.getByRole('checkbox', { name: /Sábado/ }));
  expect(screen.getByText(/Domingo.*\(1\)/)).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Enviar inscrição' }));
  expect(await screen.findByText('ABC123')).toBeTruthy();
  expect(vi.mocked(api.post).mock.calls[0][1]).toMatchObject({ mode: 'FAMILY', contactEmail: '', applicants: [{ windows: ['w2', 'w1'] }] });
  expect(local).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
  local.mockRestore(); write.mockRestore();
});
it('filtra ofertas para adulto e apresenta limite 429', async () => {
  const { user } = await openForm();
  await user.click(screen.getByLabelText('Inscrever a mim (adulto)'));
  expect(screen.queryByRole('option', { name: 'Crianças' })).toBeNull();
  expect(screen.getByRole('option', { name: 'Adultos' })).toBeTruthy();
  await user.type(screen.getByLabelText('Nome', { exact: true }), 'Joao');
  await user.type(screen.getByLabelText('Sobrenome'), 'Teste');
  fireEvent.change(screen.getByLabelText('Data de nascimento'), { target: { value: '1990-01-01' } });
  await user.selectOptions(screen.getByLabelText('Etapa desejada'), 'adult');
  await user.click(screen.getByRole('checkbox', { name: /Sábado/ }));
  await user.click(screen.getByRole('checkbox', { name: /Aceito participar/ }));
  vi.mocked(api.post).mockRejectedValue({ response: { status: 429 } });
  await user.click(screen.getByRole('button', { name: 'Enviar inscrição' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Tente novamente mais tarde.');
});
it('confirma uma única vez, limpa fragmento e mostra protocolo', async () => {
  window.history.replaceState({}, '', '/inscricoes/confirmar#token=synthetic');
  vi.mocked(api.post).mockResolvedValue({ data: { protocol: 'XYZ123' } } as any);
  const { container } = render(<React.StrictMode><RegistrationConfirmationPage /></React.StrictMode>);
  expect(window.location.hash).toBe('');
  expect(await screen.findByText('XYZ123')).toBeTruthy();
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(api.post).toHaveBeenCalledWith('/api/public/inscricoes/confirm', { token: 'synthetic' });
  expect(container.querySelector('a')).toBeNull();
});
it('mostra mensagem uniforme para confirmação inválida', async () => {
  window.history.replaceState({}, '', '/inscricoes/confirmar#token=synthetic');
  vi.mocked(api.post).mockRejectedValue(new Error());
  render(<RegistrationConfirmationPage />);
  expect(await screen.findByText(/Link inválido ou expirado/)).toBeTruthy();
});
it('reutiliza a chave ao reenviar o mesmo conteúdo após falha de rede', async () => {
  const { user } = await openForm();
  await fillPerson(user);
  await user.click(screen.getByRole('checkbox', { name: /Sábado/ }));
  vi.mocked(api.post).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ data: { protocol: 'RETRY123', emailConfirmationRequired: false } } as any);
  await user.click(screen.getByRole('button', { name: 'Enviar inscrição' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível enviar');
  const options = vi.mocked(window.turnstile!.render).mock.calls[0][1];
  act(() => (options.callback as (token: string) => void)('new-captcha'));
  await user.click(screen.getByRole('button', { name: 'Enviar inscrição' }));
  expect(await screen.findByText('RETRY123')).toBeTruthy();
  expect((vi.mocked(api.post).mock.calls[0][1] as any).requestKey).toBe((vi.mocked(api.post).mock.calls[1][1] as any).requestKey);
});
