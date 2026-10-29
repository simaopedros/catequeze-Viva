import { describe, expect, it } from 'vitest';
import { getClientIpFromRequest } from '../server/security/clientIp';

describe('C-16: cabeçalhos não confiáveis não trocam a chave de IP', () => {
  it.each(['cf-connecting-ip', 'x-forwarded-for', 'x-real-ip'])(
    'ignora %s fornecido pelo cliente', (header) => {
      for (const forged of ['198.51.100.77', '198.51.100.78']) {
        expect(getClientIpFromRequest({
          ip: '192.0.2.10', socket: { remoteAddress: '192.0.2.20' },
          headers: { [header]: forged },
        })).toBe('192.0.2.10');
      }
    },
  );
  it('usa o socket sem IP resolvido, mesmo com cabeçalhos forjados', () => {
    expect(getClientIpFromRequest({
      socket: { remoteAddress: '::ffff:192.0.2.20' },
      headers: { 'cf-connecting-ip': '198.51.100.77', 'x-forwarded-for': '198.51.100.78' },
    })).toBe('192.0.2.20');
  });
  it('preserva o IP legítimo resolvido pelo proxy, independentemente do papel', () => {
    expect(getClientIpFromRequest({
      ip: '::ffff:203.0.113.50', socket: { remoteAddress: '172.18.0.2' },
      headers: { 'x-forwarded-for': '203.0.113.50' },
    })).toBe('203.0.113.50');
  });
  it('preserva IPv6 e trata requisições sem endereço', () => {
    expect(getClientIpFromRequest({ ip: '2001:db8::1' })).toBe('2001:db8::1');
    expect(getClientIpFromRequest(null)).toBe('unknown');
    expect(getClientIpFromRequest({ headers: { 'cf-connecting-ip': '198.51.100.77' } })).toBe('unknown');
  });
});
