import { type ServerSetupFn } from 'wasp/server';
import { sessionTimeoutMiddleware } from './middleware/sessionTimeout';
import { logger } from './logger';

/**
 * Server setup — configures Express middlewares.
 *
 * 413 FIX: Wasp's express.json() runs with default 100kb limit inside the
 * operations router, and it runs BEFORE our middleware because Wasp mounts
 * routes before calling serverSetup.
 *
 * Strategy: intercept the HTTP 'request' event before Express processes it,
 * read the entire body with a 50mb limit, set req._body = true so Express's
 * own json parser skips, then forward to Express for normal handling.
 */
export const serverSetup: ServerSetupFn = async ({ app, server }) => {
  const MAX_BODY = 50 * 1024 * 1024; // 50MB

  // Intercept HTTP requests BEFORE Express to pre-parse large JSON bodies
  const originalEmit = server.emit.bind(server);
  server.emit = function (event: string, ...args: any[]) {
    if (event !== 'request') return originalEmit(event, ...args);

    const [req, res] = args;
    const contentType = (req.headers?.['content-type'] || '') as string;

    // Only intercept JSON requests
    if (!contentType.includes('application/json')) {
      return originalEmit(event, ...args);
    }

    // Read body before Express ever sees the request
    const chunks: Buffer[] = [];
    let totalSize = 0;
    let bodyError: Error | null = null;

    req.on('data', (chunk: Buffer) => {
      totalSize += chunk.length;
      if (totalSize > MAX_BODY) {
        bodyError = new Error('Payload too large');
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('error', (err: Error) => {
      bodyError = err;
    });

    req.on('end', () => {
      if (bodyError) {
        logger.warn(`[setup] Body parse error: ${bodyError.message}`);
        res.statusCode = bodyError.message === 'Payload too large' ? 413 : 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: bodyError.message }));
        return;
      }

      try {
        (req as any).body = JSON.parse(Buffer.concat(chunks).toString());
      } catch {
        (req as any).body = {};
      }
      (req as any)._body = true;

      // Forward to Express — its json parser will see _body=true and skip
      originalEmit(event, req, res);
    });

    return true; // Signal that we handled the event
  };

  app.use(sessionTimeoutMiddleware);
};
