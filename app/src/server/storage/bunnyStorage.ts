/**
 * Bunny.net Storage HTTP API client.
 * https://docs.bunny.net/docs/storage-api
 */

export type BunnyConfig = {
  zone: string;
  apiKey: string;
  hostname: string;
};

export function getBunnyConfig(): BunnyConfig | null {
  const zone = process.env.BUNNY_STORAGE_ZONE;
  const apiKey = process.env.BUNNY_STORAGE_API_KEY;
  if (!zone || !apiKey) return null;

  return {
    zone,
    apiKey,
    hostname: process.env.BUNNY_STORAGE_HOSTNAME || 'storage.bunnycdn.com',
  };
}

export function isBunnyStorageConfigured(): boolean {
  return getBunnyConfig() !== null;
}

function objectUrl(config: BunnyConfig, key: string): string {
  const encodedPath = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `https://${config.hostname}/${config.zone}/${encodedPath}`;
}

export async function bunnyPutObject(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  const config = getBunnyConfig();
  if (!config) throw new Error('Bunny Storage não configurado.');

  const res = await fetch(objectUrl(config, key), {
    method: 'PUT',
    headers: {
      AccessKey: config.apiKey,
      'Content-Type': contentType,
    },
    body: buffer,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Bunny PUT falhou (${res.status}): ${text}`);
  }
}

export async function bunnyGetObject(
  key: string,
): Promise<{ buffer: Buffer; contentType: string | null }> {
  const config = getBunnyConfig();
  if (!config) throw new Error('Bunny Storage não configurado.');

  const res = await fetch(objectUrl(config, key), {
    method: 'GET',
    headers: { AccessKey: config.apiKey },
  });

  if (res.status === 404) {
    throw new Error('Object not found');
  }
  if (!res.ok) {
    throw new Error(`Bunny GET falhou (${res.status})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: res.headers.get('content-type'),
  };
}

export async function bunnyHeadObject(key: string): Promise<boolean> {
  const config = getBunnyConfig();
  if (!config) return false;

  try {
    const res = await fetch(objectUrl(config, key), {
      method: 'HEAD',
      headers: { AccessKey: config.apiKey },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function bunnyDeleteObject(key: string): Promise<void> {
  const config = getBunnyConfig();
  if (!config) throw new Error('Bunny Storage não configurado.');

  const res = await fetch(objectUrl(config, key), {
    method: 'DELETE',
    headers: { AccessKey: config.apiKey },
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`Bunny DELETE falhou (${res.status})`);
  }
}

/** Health probe — GET on zone root (Bunny often rejects HEAD on storage API). */
export async function bunnyStorageHealthCheck(): Promise<boolean> {
  const config = getBunnyConfig();
  if (!config) return false;

  try {
    const res = await fetch(`https://${config.hostname}/${config.zone}/`, {
      method: 'GET',
      headers: { AccessKey: config.apiKey },
    });
    // 200/404 = zone reachable; 401/403 = bad credentials
    if (res.status === 401 || res.status === 403) return false;
    return res.status < 500;
  } catch {
    return false;
  }
}
