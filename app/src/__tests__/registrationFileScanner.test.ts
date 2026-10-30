import { describe, expect, it } from 'vitest';
import net from 'node:net';
import { createClamdScanner, registrationFileScanner } from '../server/security/registrationFileScanner';

describe('registration file scanner', () => {
  it.each([['stream: OK\0', 'clean'], ['stream: Test FOUND\0', 'infected'], ['stream: ERROR\0', 'unavailable']])('interpreta resposta do clamd', async (reply, expected) => {
    let received = Buffer.alloc(0);
    const server = net.createServer(socket => socket.on('data', chunk => { received = Buffer.concat([received, Buffer.from(chunk)]); if (received.includes(Buffer.alloc(4))) socket.end(reply); }));
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address(); if (!address || typeof address === 'string') throw new Error('address');
      expect(await createClamdScanner('127.0.0.1', address.port).scan(Buffer.from('test'), 'application/pdf')).toBe(expected);
      expect(received.subarray(0, 10).toString()).toBe('zINSTREAM\0');
      expect(received.readUInt32BE(10)).toBe(4);
      expect(received.subarray(14, 18).toString()).toBe('test');
    } finally { server.close(); }
  });
  it('mantém quarentena quando não há scanner', async () => {
    const host = process.env.CLAMAV_HOST; const mode = process.env.REGISTRATION_DOCUMENT_SCAN;
    delete process.env.CLAMAV_HOST; delete process.env.REGISTRATION_DOCUMENT_SCAN;
    try { expect(await registrationFileScanner().scan(Buffer.from('x'), 'application/pdf')).toBe('unavailable'); }
    finally { if (host === undefined) delete process.env.CLAMAV_HOST; else process.env.CLAMAV_HOST = host; if (mode === undefined) delete process.env.REGISTRATION_DOCUMENT_SCAN; else process.env.REGISTRATION_DOCUMENT_SCAN = mode; }
  });
});
