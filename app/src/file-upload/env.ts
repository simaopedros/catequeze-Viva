import { z } from 'zod';
export const fileUploadEnvSchema = z.object({
  AWS_S3_IAM_ACCESS_KEY: z.string().optional(),
  AWS_S3_IAM_SECRET_KEY: z.string().optional(),
  AWS_S3_FILES_BUCKET: z.string().optional(),
  AWS_S3_REGION: z.string().optional(),
});
