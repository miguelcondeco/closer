import type { FastifyInstance } from 'fastify'
import { logger } from '../../lib/logger.js'
import { supabase } from '../../lib/supabase.js'
import { createMetaSignatureVerifier } from '../../middleware/verify-meta-signature.js'

interface MetaLeadgenValue {
  leadgen_id: string
  page_id: string
  form_id?: string
  ad_id?: string
  campaign_id?: string
  campaign_name?: string
  created_time?: number
  field_data?: Array<{ name: string; values: string[] }>
}

interface MetaWebhookEntry {
  id: string
  changes: Array<{
    value: MetaLeadgenValue
    field: string
  }>
}

interface MetaWebhookBody {
  object: string
  entry: MetaWebhookEntry[]
}

interface TenantIntegrationRow {
  credentials: Record<string, string>
}

export async function metaLeadAdsRoutes(app: FastifyInstance) {
  // GET — Meta webhook verification handshake (:tenantToken identifies the tenant)
  app.get<{ Params: { tenantToken: string } }>(
    '/webhooks/meta-lead-ads/:tenantToken',
    async (request, reply) => {
      const { tenantToken } = request.params
      const query = request.query as Record<string, string>
      const mode = query['hub.mode']
      const token = query['hub.verify_token']
      const challenge = query['hub.challenge']

      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('webhook_token', tenantToken)
        .eq('is_active', true)
        .single()

      if (!tenant) {
        return reply.status(404).send({ error: 'Tenant not found' })
      }

      const { data: integration } = await supabase
        .from('tenant_integrations')
        .select('credentials')
        .eq('tenant_id', tenant.id)
        .eq('provider', 'meta')
        .eq('is_active', true)
        .single<TenantIntegrationRow>()

      const verifyToken = integration?.credentials?.verify_token

      if (mode === 'subscribe' && token === verifyToken) {
        logger.info({ tenantToken }, 'Meta webhook verified')
        return reply.status(200).send(challenge)
      }

      return reply.status(403).send({ error: 'Forbidden' })
    },
  )

  // POST — incoming lead event
  app.post<{ Params: { tenantToken: string } }>(
    '/webhooks/meta-lead-ads/:tenantToken',
    async (request, reply) => {
      const { tenantToken } = request.params

      // Look up tenant and their Meta credentials
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('webhook_token', tenantToken)
        .eq('is_active', true)
        .single()

      if (!tenant) {
        return reply.status(404).send({ error: 'Tenant not found' })
      }

      const { data: integration } = await supabase
        .from('tenant_integrations')
        .select('credentials')
        .eq('tenant_id', tenant.id)
        .eq('provider', 'meta')
        .eq('is_active', true)
        .single<TenantIntegrationRow>()

      const appSecret = integration?.credentials?.app_secret
      if (!appSecret) {
        logger.warn({ tenantToken }, 'No Meta app_secret configured for tenant')
        return reply.status(403).send({ error: 'Meta integration not configured' })
      }

      // Verify signature now that we have the tenant's secret
      await createMetaSignatureVerifier(appSecret)(request, reply)
      if (reply.sent) return

      const body = request.body as MetaWebhookBody

      if (body.object !== 'page') {
        return reply.status(200).send({ ok: true })
      }

      for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
          if (change.field !== 'leadgen') continue

          const value = change.value
          const metaLeadId = value.leadgen_id

          const fields: Record<string, string> = {}
          for (const f of value.field_data ?? []) {
            fields[f.name] = f.values[0] ?? ''
          }

          const fullName = fields['full_name'] ?? fields['name'] ?? null
          const phone = fields['phone_number'] ?? fields['phone'] ?? null
          const email = fields['email'] ?? null

          if (!phone) {
            logger.warn({ metaLeadId, tenantId: tenant.id }, 'Lead has no phone, skipping')
            continue
          }

          const { error } = await supabase.from('leads').upsert(
            {
              tenant_id: tenant.id,
              meta_lead_id: metaLeadId,
              source: 'meta_lead_ads',
              full_name: fullName,
              phone_e164: phone,
              email,
              campaign_id: value.campaign_id ?? null,
              campaign_name: value.campaign_name ?? null,
              raw_payload: value,
              pipeline_stage: 'new',
            },
            { onConflict: 'tenant_id,meta_lead_id', ignoreDuplicates: true },
          )

          if (error) {
            logger.error({ error, metaLeadId, tenantId: tenant.id }, 'Failed to upsert lead')
          } else {
            logger.info({ metaLeadId, phone, tenantId: tenant.id }, 'Lead ingested')
          }
        }
      }

      return reply.status(200).send({ ok: true })
    },
  )
}
