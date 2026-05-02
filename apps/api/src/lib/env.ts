import { config } from 'dotenv'
import { resolve } from 'path'
import { z } from 'zod'

// Load root .env in development — no-op in Railway (env vars already set)
config({ path: resolve(import.meta.dirname, '../../../../.env') })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  PORT: z.coerce.number().default(3002),
  SENTRY_DSN: z.string().url({ message: 'SENTRY_DSN must be a valid URL' }),
  SUPABASE_URL: z.string().url({ message: 'SUPABASE_URL must be a valid URL' }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, { message: 'SUPABASE_SERVICE_ROLE_KEY is required' }),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  process.stderr.write('❌ Variáveis de ambiente inválidas:\n')
  process.stderr.write(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2) + '\n')
  process.exit(1)
}

export const env = parsed.data
