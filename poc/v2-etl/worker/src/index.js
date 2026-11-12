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
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function validSession(cookieHeader, key) {
  const m = /(?:^|;\s*)(?:__Host-)?cv2_session=([^;]+)/.exec(cookieHeader || '');
  if (!m) return null;
  const [sid, sig, exp] = m[1].split('.');
  if (!sid || !sig || !exp || Number(exp) * 1000 < Date.now()) return null;
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = b64url(await crypto.subtle.sign('HMAC', k, enc.encode(`${sid}.${exp}`)));
  return expected === sig ? sid : null;
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
