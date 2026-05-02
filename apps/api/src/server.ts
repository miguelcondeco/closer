import * as Sentry from '@sentry/node'
import Fastify, { type FastifyRequest } from 'fastify'
import { env } from './lib/env.js'
import { logger } from './lib/logger.js'
import health from './routes/health.js'
import { metaLeadAdsRoutes } from './routes/webhooks/meta-lead-ads.js'
import { ownersRoutes } from './routes/owners/index.js'
import { propertiesRoutes } from './routes/properties/index.js'
import { leadsRoutes } from './routes/leads/index.js'

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

// Capture raw body buffer for HMAC verification (Meta signature check)
server.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
  try {
    const parsed = JSON.parse((body as Buffer).toString())
    ;(_req as FastifyRequest & { rawBody?: Buffer }).rawBody = body as Buffer
    done(null, parsed)
  } catch (e) {
    done(e as Error, undefined)
  }
})

server.register(health)
server.register(metaLeadAdsRoutes)
server.register(ownersRoutes)
server.register(propertiesRoutes)
server.register(leadsRoutes)

server.listen({ port: env.PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    Sentry.captureException(err)
    logger.error({ err }, 'Server failed to start')
    process.exit(1)
  }
})
