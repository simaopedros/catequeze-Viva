import * as z from 'zod'
import { defineEnvValidationSchema } from 'wasp/env'

import { authEnvSchema } from './auth/env'
import { metaEnvSchema } from './payment/meta/env'
import { stripeEnvSchema } from './payment/stripe/env'
import { fileUploadEnvSchema } from './file-upload/env'
import { plausibleEnvSchema, googleAnalyticsEnvSchema } from './analytics/env'
import { aiEnvSchema } from './server/ai/env'
import { emailEnvSchema } from './server/email/env'

// Operational env vars (connection pooling, job worker control).
// These are consumed at the infrastructure / generated-SDK layer, not by
// application code directly.
export const operationalEnvSchema = z.object({
  RUN_JOBS: z
    .enum(['true', 'false'])
    .optional()
    .default('false'),
  PG_BOSS_NEW_OPTIONS: z
    .string()
    .optional(),
})

// Wasp merges this schema with its built-in env var validations and uses it
// to validate `process.env` at server startup. Access the validated env vars
// with `import { env } from 'wasp/server'` instead of using `process.env` directly.
// https://wasp.sh/docs/project/env-vars#custom-env-var-validations
//
// Plausible/GA env schemas are optional placeholders. Daily stats read
// first-party Postgres data and do not call those providers.
// If you remove a feature (e.g. an analytics or payment provider), make sure
// to also remove its env schema import and `.merge(...)` call below.
export const serverEnvValidationSchema = defineEnvValidationSchema(
  authEnvSchema
    .merge(metaEnvSchema)
    .merge(stripeEnvSchema)
    .merge(aiEnvSchema)
    .merge(fileUploadEnvSchema)
    .merge(plausibleEnvSchema)
    .merge(googleAnalyticsEnvSchema)
    .merge(operationalEnvSchema)
    .merge(emailEnvSchema)
)

