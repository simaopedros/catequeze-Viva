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
  expect((vi.mocked(api.post).mock.calls[0][1] as any).applicants[0]).not.toHaveProperty('sponsor');
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
  const { container } = render(<React.StrictMode><MemoryRouter><RegistrationConfirmationPage /></MemoryRouter></React.StrictMode>);
  expect(window.location.hash).toBe('');
  expect(await screen.findByText('XYZ123')).toBeTruthy();
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(api.post).toHaveBeenCalledWith('/api/public/inscricoes/confirm', { token: 'synthetic' });
  expect(container.querySelector('a')).toBeNull();
  expect(screen.queryByRole('heading', { name: 'Documentos' })).toBeNull();
});
it('mostra mensagem uniforme para confirmação inválida', async () => {
  window.history.replaceState({}, '', '/inscricoes/confirmar#token=synthetic');
  vi.mocked(api.post).mockRejectedValue(new Error());
  render(<MemoryRouter><RegistrationConfirmationPage /></MemoryRouter>);
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
it('valida paróquia do padrinho e envia apenas quando informado', async () => {
  const { user } = await openForm(); await fillPerson(user); await user.click(screen.getByRole('checkbox', { name: /Sábado/ }));
  await user.click(screen.getByText('Padrinho ou madrinha (opcional)'));
  await user.type(screen.getByLabelText('Nome do padrinho ou da madrinha'), 'Pedro');
  await user.click(screen.getByLabelText('É de outra paróquia'));
  await user.click(screen.getByRole('button', { name: 'Enviar inscrição' }));
  expect(await screen.findByText('Informe o nome da paróquia.')).toBeTruthy(); expect(api.post).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText('Nome da paróquia'), 'Paróquia Central');
  vi.mocked(api.post).mockResolvedValueOnce({ data: { protocol: 'P', emailConfirmationRequired: false } } as any);
  await user.click(screen.getByRole('button', { name: 'Enviar inscrição' })); await screen.findByText('P');
  expect((vi.mocked(api.post).mock.calls[0][1] as any).applicants[0].sponsor).toEqual({ role: 'PADRINHO', name: 'Pedro', fromOtherParish: true, parishName: 'Paróquia Central' });
});
it('envia documentos com Bearer em memória e trata expiração', async () => {
  window.history.replaceState({}, '', '/inscricoes/confirmar#token=confirmacao');
  vi.mocked(api.post).mockResolvedValueOnce({ data: { protocol: 'P', uploadSession: { token: 'segredo', expiresAt: '2030-01-01' } } } as any);
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true, status: 200, json: async () => [{ applicationId: 'a', firstName: 'Ana Maria', checklist: [{ type: 'BIRTH_CERTIFICATE', requirement: 'REQUIRED', state: 'MISSING' }] }] } as Response).mockResolvedValueOnce({ ok: false, status: 401 } as Response);
  const storage = vi.spyOn(Storage.prototype, 'setItem'); render(<MemoryRouter><RegistrationConfirmationPage /></MemoryRouter>);
  expect(await screen.findByText('Ana')).toBeTruthy(); expect(screen.getByText(/Isso não impede a inscrição/)).toBeTruthy(); expect(screen.getByText(/Faltando/)).toBeTruthy();
  const input = screen.getByLabelText('Enviar documento');
  fireEvent.change(input, { target: { files: [new File(['x'], 'a.txt', { type: 'text/plain' })] } }); expect(await screen.findByText(/Escolha um arquivo PDF/)).toBeTruthy();
  fireEvent.change(input, { target: { files: [new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'a.pdf', { type: 'application/pdf' })] } }); expect(await screen.findByText(/no máximo 10 MB/)).toBeTruthy();
  fireEvent.change(input, { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } }); expect(await screen.findByText(/Para enviar documentos depois/)).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(2); for (const [url, options] of fetchMock.mock.calls) { expect(String(url)).not.toContain('segredo'); expect(options).toMatchObject({ credentials: 'omit', headers: { Authorization: 'Bearer segredo' } }); }
  expect(window.location.href).not.toContain('segredo'); expect(storage).not.toHaveBeenCalled(); fetchMock.mockRestore(); storage.mockRestore();
});
it('recarrega checklist após envio de arquivo válido', async () => {
 window.history.replaceState({}, '', '/inscricoes/confirmar#token=confirmacao'); vi.mocked(api.post).mockResolvedValueOnce({ data: { protocol: 'P', uploadSession: { token: 'segredo', expiresAt: '2030-01-01' } } } as any);
 const rows = (state: string) => [{ applicationId: 'a', firstName: 'Ana', checklist: [{ type: 'OTHER', requirement: 'OPTIONAL', state }] }];
 const request = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true, status: 200, json: async () => rows('REJECTED') } as Response).mockResolvedValueOnce({ ok: true, status: 200 } as Response).mockResolvedValueOnce({ ok: true, status: 200, json: async () => rows('AWAITING_SECURITY') } as Response);
 render(<MemoryRouter><RegistrationConfirmationPage /></MemoryRouter>); await screen.findByText(/Recusado/); fireEvent.change(screen.getByLabelText('Enviar documento'), { target: { files: [new File(['pdf'], 'a.pdf', { type: 'application/pdf' })] } }); expect(await screen.findByText(/Em análise de segurança/)).toBeTruthy(); expect(request).toHaveBeenCalledTimes(3); expect(request.mock.calls[1][1]).toMatchObject({ method: 'POST', credentials: 'omit', headers: { Authorization: 'Bearer segredo' } }); request.mockRestore();
});
