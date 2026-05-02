'use client'

import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'

interface Lead {
  id: string
  full_name: string | null
  phone_e164: string
  email: string | null
  source: string
  pipeline_stage: string
  created_at: string
  lead_qualifications: { score: string }[]
}

const STAGE_LABELS: Record<string, string> = {
  new: 'Novo',
  qualified: 'Qualificado',
  visit_scheduled: 'Visita marcada',
  visit_done: 'Visita feita',
  proposal: 'Proposta',
  cpcv: 'CPCV',
  escritura: 'Escritura',
  lost: 'Perdido',
}

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-gray-800 text-gray-300',
  qualified: 'bg-blue-900 text-blue-300',
  visit_scheduled: 'bg-yellow-900 text-yellow-300',
  visit_done: 'bg-orange-900 text-orange-300',
  proposal: 'bg-purple-900 text-purple-300',
  cpcv: 'bg-indigo-900 text-indigo-300',
  escritura: 'bg-green-900 text-green-300',
  lost: 'bg-red-900 text-red-300',
}

const SCORE_COLORS: Record<string, string> = {
  Hot: 'bg-red-900 text-red-300',
  Warm: 'bg-orange-900 text-orange-300',
  Cold: 'bg-blue-900 text-blue-300',
  'Time-waster': 'bg-gray-800 text-gray-400',
}

const SOURCE_LABELS: Record<string, string> = {
  meta_lead_ads: 'Meta Ads',
  manual: 'Manual',
  referral: 'Referral',
  other: 'Outro',
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ full_name: '', phone_e164: '', email: '', source: 'manual', notes: '' })

  async function load() {
    try {
      const data = await api.get<Lead[]>('/leads')
      setLeads(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/leads', form)
      setShowForm(false)
      setForm({ full_name: '', phone_e164: '', email: '', source: 'manual', notes: '' })
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar lead?')) return
    await api.delete(`/leads/${id}`)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Leads</h1>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
          + Novo lead
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-white font-medium mb-4">Novo lead</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <Field label="Nome">
                <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className={input} />
              </Field>
              <Field label="Telemóvel *">
                <input required value={form.phone_e164} onChange={e => setForm(f => ({ ...f, phone_e164: e.target.value }))} placeholder="+351..." className={input} />
              </Field>
              <Field label="Email">
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={input} />
              </Field>
              <Field label="Fonte">
                <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className={input}>
                  <option value="manual">Manual</option>
                  <option value="referral">Referral</option>
                  <option value="other">Outro</option>
                </select>
              </Field>
              <Field label="Notas">
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={input} />
              </Field>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-600 text-gray-300 text-sm py-2 rounded-lg hover:bg-gray-800">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg disabled:opacity-50">{saving ? 'A guardar...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">A carregar...</p>
      ) : leads.length === 0 ? (
        <p className="text-gray-500 text-sm">Nenhum lead ainda.</p>
      ) : (
        <div className="border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                {['Nome', 'Telemóvel', 'Fonte', 'Score', 'Estado', 'Data', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {leads.map(l => {
                const score = l.lead_qualifications?.[0]?.score
                return (
                  <tr key={l.id} className="hover:bg-gray-900/50">
                    <td className="px-4 py-3 text-white">{l.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{l.phone_e164}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{SOURCE_LABELS[l.source]}</td>
                    <td className="px-4 py-3">
                      {score ? (
                        <span className={`text-xs px-2 py-1 rounded-full ${SCORE_COLORS[score]}`}>{score}</span>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${STAGE_COLORS[l.pipeline_stage]}`}>
                        {STAGE_LABELS[l.pipeline_stage]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(l.created_at).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(l.id)} className="text-gray-600 hover:text-red-400 text-xs">Eliminar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const input = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500'
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs text-gray-400 mb-1">{label}</label>{children}</div>
}
