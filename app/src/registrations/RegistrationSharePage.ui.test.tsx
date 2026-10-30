import { render, screen } from '@testing-library/react';
import { vi, it, expect } from 'vitest';
vi.mock('qrcode.react', () => ({ QRCodeCanvas: ({ value }: { value: string }) => <div data-testid="qr">{value}</div> }));
vi.mock('../client/hooks/useActiveParish', () => ({ useActiveParish: () => ({ activeParishId: 'test' }) }));
import { ShareCard } from './RegistrationSharePage';
it('mostra apenas a URL no QR e não oferece link no rascunho', () => {
 const c = { id: 'interno', title: 'Campanha', parishName: 'Paróquia', status: 'OPEN', opensAt: new Date('2026-01-01'), closesAt: new Date('2026-02-01'), timezone: 'America/Sao_Paulo', url: 'https://example.test/inscricoes/campanha' };
 const { rerender, container } = render(<ShareCard campaign={c} />);
 expect(screen.getByTestId('qr').textContent).toBe(c.url); expect(container.querySelector('a')).toBeNull();
 rerender(<ShareCard campaign={{ ...c, status: 'DRAFT', url: null }} />); expect(screen.queryByTestId('qr')).toBeNull();
});
