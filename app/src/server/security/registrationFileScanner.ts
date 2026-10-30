import net from 'node:net';
import { logger } from '../logger';

export type RegistrationScanResult = 'clean' | 'infected' | 'unavailable';
export interface RegistrationFileScanner { scan(buffer: Buffer, mimeType: string): Promise<RegistrationScanResult> }

export function createClamdScanner(host: string, port: number, timeoutMs = 3000): RegistrationFileScanner {
  return { scan: (buffer) => new Promise(resolve => {
    const socket = net.createConnection({ host, port });
    let response = '';
    let finished = false;
    const finish = (result: RegistrationScanResult) => { if (!finished) { finished = true; socket.destroy(); resolve(result); } };
    socket.setTimeout(timeoutMs, () => finish('unavailable'));
    socket.on('error', () => finish('unavailable'));
    socket.on('connect', () => {
      socket.write('zINSTREAM\0');
      for (let offset = 0; offset < buffer.length; offset += 65536) {
        const chunk = buffer.subarray(offset, offset + 65536);
        const length = Buffer.alloc(4); length.writeUInt32BE(chunk.length);
        socket.write(length); socket.write(chunk);
      }
      socket.write(Buffer.alloc(4));
    });
    socket.on('data', data => {
      response += data.toString('utf8');
      if (response.length > 4096) return finish('unavailable');
      if (response.includes('\0') || response.includes('\n')) {
        const line = response.split(/[\0\n]/, 1)[0];
        finish(/^stream: OK$/.test(line) ? 'clean' : /^stream: .+ FOUND$/.test(line) ? 'infected' : 'unavailable');
      }
    });
    socket.on('end', () => finish('unavailable'));
  }) };
}

if (process.env.REGISTRATION_DOCUMENT_SCAN === 'skip') logger.warn('registration_document_scan_skipped', { reason: 'homologation_only' });
export function registrationFileScanner(): RegistrationFileScanner {
  if (process.env.REGISTRATION_DOCUMENT_SCAN === 'skip') return { scan: async () => 'clean' };
  const host = process.env.CLAMAV_HOST;
  const port = Number(process.env.CLAMAV_PORT || 3310);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) return { scan: async () => 'unavailable' };
  return createClamdScanner(host, port);
}
