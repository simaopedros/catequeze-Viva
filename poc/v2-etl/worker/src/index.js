// Worker de TESTE da PoC DEM-20261111-01. Roda só no workerd local (wrangler dev), nunca publicado.
//   GET  /noop             -> linha de base de latência
//   POST /argon2/verify    -> {hash, password} verifica hash argon2id do Wasp em WASM
//   GET  /v1/me            -> valida o cookie de sessão emitido pela API (HMAC)
// O Workers proíbe compilar WASM em tempo de execução (hash-wasm falha com "Wasm code generation
// disallowed by embedder"), então o módulo .wasm é importado de forma estática.
import Argon2 from '@phi-ag/argon2';
import wasm from '@phi-ag/argon2/argon2.wasm';

let argon2;
const getArgon2 = async () => (argon2 ||= new Argon2(await WebAssembly.instantiate(wasm)));

const enc = new TextEncoder();
const fromB64url = (s) => {
  try { return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0)); } catch { return null; }
};

// Comparação do HMAC em tempo constante: crypto.subtle.verify, não "===" entre strings.
async function validSession(cookieHeader, key) {
  const m = /(?:^|;\s*)(?:__Host-)?cv2_session=([^;]+)/.exec(cookieHeader || '');
  if (!m) return null;
  const [sid, sig, exp] = m[1].split('.');
  if (!sid || !sig || !exp || Number(exp) * 1000 < Date.now()) return null;
  const sigBytes = fromB64url(sig);
  if (!sigBytes) return null;
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  return (await crypto.subtle.verify('HMAC', k, sigBytes, enc.encode(`${sid}.${exp}`))) ? sid : null;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/noop') return new Response('ok');
    if (url.pathname === '/argon2/verify' && req.method === 'POST') {
      const { hash, password } = await req.json();
      const a = await getArgon2();
      return Response.json({ ok: a.tryVerify(hash, password).success });
    }
    if (url.pathname === '/v1/me') {
      const sid = await validSession(req.headers.get('cookie'), env.SESSION_SIGNING_KEY);
      return sid ? Response.json({ sessao: 'valida' }) : Response.json({ erro: 'nao_autenticado' }, { status: 401 });
    }
    return new Response('not found', { status: 404 });
  },
};
