import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase } from '../../lib/supabase.js'
import { requireAuth } from '../../middleware/auth.js'

const leadBody = z.object({
  source: z.enum(['meta_lead_ads', 'manual', 'referral', 'other']).default('manual'),
  full_name: z.string().optional().nullable(),
  phone_e164: z.string().min(1),
  email: z.string().email().optional().nullable(),
  language_detected: z.enum(['pt', 'en', 'fr']).optional().nullable(),
  campaign_name: z.string().optional().nullable(),
  pipeline_stage: z.enum(['new', 'qualified', 'visit_scheduled', 'visit_done', 'proposal', 'cpcv', 'escritura', 'lost']).default('new'),
  notes: z.string().optional().nullable(),
})

const stageBody = z.object({
  pipeline_stage: z.enum(['new', 'qualified', 'visit_scheduled', 'visit_done', 'proposal', 'cpcv', 'escritura', 'lost']),
  reason: z.string().optional().nullable(),
})

export async function leadsRoutes(app: FastifyInstance) {
  const opts = { preHandler: requireAuth }

  app.get('/leads', opts, async (request, reply) => {
    const query = request.query as Record<string, string>
    let q = supabase
      .from('leads')
      .select('*, lead_qualifications(score, summary, created_at)')
      .eq('tenant_id', request.tenantId)
      .order('created_at', { ascending: false })

    if (query.stage) q = q.eq('pipeline_stage', query.stage)

    const { data, error } = await q
    if (error) return reply.status(500).send({ error: error.message })
    return data
  })

  app.post('/leads', opts, async (request, reply) => {
    const parsed = leadBody.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const { data, error } = await supabase
      .from('leads')
      .insert({ ...parsed.data, tenant_id: request.tenantId })
      .select()
      .single()

    if (error) return reply.status(500).send({ error: error.message })
    return reply.status(201).send(data)
  })

  app.get('/leads/:id', opts, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { data, error } = await supabase
      .from('leads')
      .select('*, lead_qualifications(*), messages(id, direction, sender, body, created_at), visits(id, scheduled_at, status, properties(address))')
      .eq('id', id)
      .eq('tenant_id', request.tenantId)
      .single()

    if (error || !data) return reply.status(404).send({ error: 'Not found' })
    return data
  })

  app.patch('/leads/:id', opts, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = leadBody.partial().safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const { data, error } = await supabase
      .from('leads')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', request.tenantId)
      .select()
      .single()

    if (error || !data) return reply.status(404).send({ error: 'Not found' })
    return data
  })

  // Move lead in pipeline + audit log
  app.post('/leads/:id/stage', opts, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = stageBody.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const { data: current } = await supabase
      .from('leads')
      .select('pipeline_stage')
      .eq('id', id)
      .eq('tenant_id', request.tenantId)
      .single()

    if (!current) return reply.status(404).send({ error: 'Not found' })

    await supabase.from('leads').update({
      pipeline_stage: parsed.data.pipeline_stage,
      updated_at: new Date().toISOString(),
    }).eq('id', id).eq('tenant_id', request.tenantId)

    await supabase.from('pipeline_history').insert({
      tenant_id: request.tenantId,
      lead_id: id,
      from_stage: current.pipeline_stage,
      to_stage: parsed.data.pipeline_stage,
      reason: parsed.data.reason ?? null,
    })

    return reply.status(200).send({ ok: true })
  })

  app.delete('/leads/:id', opts, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)
      .eq('tenant_id', request.tenantId)

    if (error) return reply.status(500).send({ error: error.message })
    return reply.status(204).send()
  })
}
