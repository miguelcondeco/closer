import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase } from '../../lib/supabase.js'
import { requireAuth } from '../../middleware/auth.js'

const propertyBody = z.object({
  owner_id: z.string().uuid().optional().nullable(),
  address: z.string().min(1),
  district: z.string().optional().nullable(),
  municipality: z.string().optional().nullable(),
  parish: z.string().optional().nullable(),
  property_type: z.enum(['apartment', 'house', 'land', 'commercial', 'other']).optional().nullable(),
  typology: z.string().optional().nullable(),
  area_m2: z.number().positive().optional().nullable(),
  asking_price_eur: z.number().positive().optional().nullable(),
  ami_listing_fee_eur: z.number().positive().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(['in_acquisition', 'active', 'reserved', 'cpcv', 'sold', 'cancelled']).default('in_acquisition'),
  notes: z.string().optional().nullable(),
})

export async function propertiesRoutes(app: FastifyInstance) {
  const opts = { preHandler: requireAuth }

  app.get('/properties', opts, async (request, reply) => {
    const { data, error } = await supabase
      .from('properties')
      .select('*, owners(id, full_name)')
      .eq('tenant_id', request.tenantId)
      .order('created_at', { ascending: false })

    if (error) return reply.status(500).send({ error: error.message })
    return data
  })

  app.post('/properties', opts, async (request, reply) => {
    const parsed = propertyBody.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const { data, error } = await supabase
      .from('properties')
      .insert({ ...parsed.data, tenant_id: request.tenantId })
      .select()
      .single()

    if (error) return reply.status(500).send({ error: error.message })
    return reply.status(201).send(data)
  })

  app.get('/properties/:id', opts, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { data, error } = await supabase
      .from('properties')
      .select('*, owners(id, full_name, phone_e164, email)')
      .eq('id', id)
      .eq('tenant_id', request.tenantId)
      .single()

    if (error || !data) return reply.status(404).send({ error: 'Not found' })
    return data
  })

  app.patch('/properties/:id', opts, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = propertyBody.partial().safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const { data, error } = await supabase
      .from('properties')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', request.tenantId)
      .select()
      .single()

    if (error || !data) return reply.status(404).send({ error: 'Not found' })
    return data
  })

  app.delete('/properties/:id', opts, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id)
      .eq('tenant_id', request.tenantId)

    if (error) return reply.status(500).send({ error: error.message })
    return reply.status(204).send()
  })
}
