import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase } from '../../lib/supabase.js'
import { requireAuth } from '../../middleware/auth.js'

const ownerBody = z.object({
  full_name: z.string().min(1),
  phone_e164: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  nif: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive', 'sold', 'lost']).default('active'),
  notes: z.string().optional().nullable(),
})

export async function ownersRoutes(app: FastifyInstance) {
  const opts = { preHandler: requireAuth }

  app.get('/owners', opts, async (request, reply) => {
    const { data, error } = await supabase
      .from('owners')
      .select('*')
      .eq('tenant_id', request.tenantId)
      .order('created_at', { ascending: false })

    if (error) return reply.status(500).send({ error: error.message })
    return data
  })

  app.post('/owners', opts, async (request, reply) => {
    const parsed = ownerBody.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const { data, error } = await supabase
      .from('owners')
      .insert({ ...parsed.data, tenant_id: request.tenantId })
      .select()
      .single()

    if (error) return reply.status(500).send({ error: error.message })
    return reply.status(201).send(data)
  })

  app.get('/owners/:id', opts, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { data, error } = await supabase
      .from('owners')
      .select('*, properties(*)')
      .eq('id', id)
      .eq('tenant_id', request.tenantId)
      .single()

    if (error || !data) return reply.status(404).send({ error: 'Not found' })
    return data
  })

  app.patch('/owners/:id', opts, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = ownerBody.partial().safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const { data, error } = await supabase
      .from('owners')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', request.tenantId)
      .select()
      .single()

    if (error || !data) return reply.status(404).send({ error: 'Not found' })
    return data
  })

  app.delete('/owners/:id', opts, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { error } = await supabase
      .from('owners')
      .delete()
      .eq('id', id)
      .eq('tenant_id', request.tenantId)

    if (error) return reply.status(500).send({ error: error.message })
    return reply.status(204).send()
  })
}
