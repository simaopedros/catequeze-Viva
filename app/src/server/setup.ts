import { type ServerSetupFn } from 'wasp/server';
import express from 'express';

/**
 * Server setup — configures Express middlewares.
 * Adds raw body parsing for document uploads, and increases JSON limit.
 */
export const serverSetup: ServerSetupFn = async ({ app }) => {
  // Increase JSON body size limit for base64 file uploads
  app.use(express.json({ limit: '10mb' }));
};
