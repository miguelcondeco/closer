import type { FastifyPluginAsync } from 'fastify'
import { env } from '../lib/env.js'

const health: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => ({
    status: 'Closer alive',
    env: env.NODE_ENV,
    version: '0.1.0',
  }))
}

export default health
