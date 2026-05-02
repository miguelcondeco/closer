import { createHmac, timingSafeEqual } from 'crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'

// Returns a preHandler that verifies X-Hub-Signature-256 against the given secret.
// The secret comes from tenant_integrations (per-tenant), not from env.
export function createMetaSignatureVerifier(appSecret: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['x-hub-signature-256']

    if (!signature || typeof signature !== 'string') {
      return reply.status(401).send({ error: 'Missing X-Hub-Signature-256' })
    }

    const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody
    if (!rawBody) {
      return reply.status(400).send({ error: 'No raw body available' })
    }

    const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex')

    const sigBuffer = Buffer.from(signature)
    const expBuffer = Buffer.from(expected)

    if (sigBuffer.length !== expBuffer.length || !timingSafeEqual(sigBuffer, expBuffer)) {
      return reply.status(401).send({ error: 'Invalid signature' })
    }
  }
}
