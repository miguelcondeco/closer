import * as Sentry from '@sentry/node'
import Fastify from 'fastify'
import { env } from './lib/env.js'
import { logger } from './lib/logger.js'
import health from './routes/health.js'

Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV,
  tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 0,
})

const server = Fastify({
  logger: {
    level: env.LOG_LEVEL,
  },
})

server.register(health)

server.listen({ port: env.PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    Sentry.captureException(err)
    logger.error({ err }, 'Server failed to start')
    process.exit(1)
  }
})
