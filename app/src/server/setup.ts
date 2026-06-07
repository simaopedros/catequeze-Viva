import { type ServerSetupFn } from 'wasp/server';
import express from 'express';
import { sessionTimeoutMiddleware } from './middleware/sessionTimeout';

/**
 * Server setup — configures Express middlewares.
 * Adds raw body parsing for document uploads, and increases JSON limit.
 */
export const serverSetup: ServerSetupFn = async ({ app }) => {
  app.use(express.json({ limit: '10mb' }));
  app.use(sessionTimeoutMiddleware);
};
