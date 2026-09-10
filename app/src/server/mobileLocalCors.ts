type ExpressLike = {
  use: (...args: any[]) => unknown;
  router?: { stack?: any[] };
  _router?: { stack?: any[] };
};

const LOCAL_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function isLocalDevOrigin(origin: unknown, nodeEnv = process.env.NODE_ENV) {
  return (
    nodeEnv !== 'production' &&
    typeof origin === 'string' &&
    LOCAL_ORIGIN_RE.test(origin)
  );
}

export function applyLocalMobileCors(req: any, res: any, next: () => void) {
  const origin = req.headers?.origin;
  if (!isLocalDevOrigin(origin)) {
    next();
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
}

/** serverSetup runs after Wasp mounts routers, so app.use() would miss OPTIONS. */
export function prependMiddleware(app: ExpressLike, path: string, handler: (...args: any[]) => unknown) {
  app.use(path, handler);
  const stack = app.router?.stack ?? app._router?.stack;
  if (!Array.isArray(stack) || stack.length < 2) return;
  const layer = stack.pop();
  const insertAt = stack.findIndex((item) => item?.name === 'router' || item?.name === 'bound dispatch');
  stack.splice(insertAt >= 0 ? insertAt : 0, 0, layer);
}
