import { z } from 'zod';

export const fileUploadEnvSchema = z.object({
  // Legacy AWS (optional)
  AWS_S3_IAM_ACCESS_KEY: z.string().optional(),
  AWS_S3_IAM_SECRET_KEY: z.string().optional(),
  AWS_S3_FILES_BUCKET: z.string().optional(),
  AWS_S3_REGION: z.string().optional(),
  // Bunny.net Storage
  BUNNY_STORAGE_ZONE: z.string().optional(),
  BUNNY_STORAGE_API_KEY: z.string().optional(),
  BUNNY_STORAGE_HOSTNAME: z.string().optional(),
  BUNNY_STORAGE_REGION: z.string().optional(),
});
