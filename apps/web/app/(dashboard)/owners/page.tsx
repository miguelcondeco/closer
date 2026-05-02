'use client'

import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'

interface Owner {
  id: string
  full_name: string
  phone_e164: string | null
  email: string | null
  status: string
  notes: string | null
  created_at: string
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  sold: 'Vendido',
  lost: 'Perdido',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-900 text-green-300',
  inactive: 'bg-gray-800 text-gray-400',
  sold: 'bg-blue-900 text-blue-300',
  lost: 'bg-red-900 text-red-300',
}

export default function OwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ full_name: '', phone_e164: '', email: '', status: 'active', notes: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const data = await api.get<Owner[]>('/owners')
      setOwners(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/owners', form)
      setShowForm(false)
      setForm({ full_name: '', phone_e164: '', email: '', status: 'active', notes: '' })
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar proprietário?')) return
    await api.delete(`/owners/${id}`)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Proprietários</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          + Novo proprietário
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-white font-medium mb-4">Novo proprietário</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <Field label="Nome completo *">
                <input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className={input} />
              </Field>
              <Field label="Telemóvel">
                <input value={form.phone_e164} onChange={e => setForm(f => ({ ...f, phone_e164: e.target.value }))} placeholder="+351..." className={input} />
              </Field>
              <Field label="Email">
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={input} />
              </Field>
              <Field label="Estado">
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={input}>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="sold">Vendido</option>
                  <option value="lost">Perdido</option>
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
      ) : owners.length === 0 ? (
        <p className="text-gray-500 text-sm">Nenhum proprietário ainda.</p>
      ) : (
        <div className="border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                {['Nome', 'Telemóvel', 'Email', 'Estado', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {owners.map(o => (
                <tr key={o.id} className="hover:bg-gray-900/50">
                  <td className="px-4 py-3 text-white">{o.full_name}</td>
                  <td className="px-4 py-3 text-gray-300">{o.phone_e164 ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-300">{o.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[o.status]}`}>
                      {STATUS_LABELS[o.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(o.id)} className="text-gray-600 hover:text-red-400 text-xs">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const input = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  )
}
