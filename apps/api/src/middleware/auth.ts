import type { FastifyReply, FastifyRequest } from 'fastify'
import { supabase } from '../lib/supabase.js'
import { logger } from '../lib/logger.js'

declare module 'fastify' {
  interface FastifyRequest {
    tenantId: string
    userId: string
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing authorization token' })
  }

  const token = authHeader.slice(7)

  // Verify token with Supabase and get the user
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return reply.status(401).send({ error: 'Invalid or expired token' })
  }

  // Look up user's tenant
  const { data: userRow } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .eq('is_active', true)
    .single()

  if (!userRow) {
    logger.warn({ userId: user.id }, 'Authenticated user has no tenant mapping')
    return reply.status(403).send({ error: 'User not provisioned in any tenant' })
  }

  request.tenantId = userRow.tenant_id
  request.userId = user.id
}
