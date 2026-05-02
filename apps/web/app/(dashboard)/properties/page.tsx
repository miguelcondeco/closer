'use client'

import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'

interface Property {
  id: string
  address: string
  property_type: string | null
  typology: string | null
  asking_price_eur: number | null
  status: string
  owners: { full_name: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  in_acquisition: 'Em angariação',
  active: 'Activo',
  reserved: 'Reservado',
  cpcv: 'CPCV',
  sold: 'Vendido',
  cancelled: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  in_acquisition: 'bg-yellow-900 text-yellow-300',
  active: 'bg-green-900 text-green-300',
  reserved: 'bg-blue-900 text-blue-300',
  cpcv: 'bg-purple-900 text-purple-300',
  sold: 'bg-gray-800 text-gray-400',
  cancelled: 'bg-red-900 text-red-300',
}

const TYPE_LABELS: Record<string, string> = {
  apartment: 'Apartamento',
  house: 'Moradia',
  land: 'Terreno',
  commercial: 'Comercial',
  other: 'Outro',
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [owners, setOwners] = useState<{ id: string; full_name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    address: '', district: '', property_type: 'apartment', typology: '',
    area_m2: '', asking_price_eur: '', owner_id: '', status: 'in_acquisition', notes: '',
  })

  async function load() {
    try {
      const [props, ownrs] = await Promise.all([
        api.get<Property[]>('/properties'),
        api.get<{ id: string; full_name: string }[]>('/owners'),
      ])
      setProperties(props)
      setOwners(ownrs)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/properties', {
        ...form,
        area_m2: form.area_m2 ? Number(form.area_m2) : null,
        asking_price_eur: form.asking_price_eur ? Number(form.asking_price_eur) : null,
        owner_id: form.owner_id || null,
      })
      setShowForm(false)
      setForm({ address: '', district: '', property_type: 'apartment', typology: '', area_m2: '', asking_price_eur: '', owner_id: '', status: 'in_acquisition', notes: '' })
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar imóvel?')) return
    await api.delete(`/properties/${id}`)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Imóveis</h1>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
          + Novo imóvel
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-white font-medium mb-4">Novo imóvel</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <Field label="Morada *">
                <input required value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={input} />
              </Field>
              <Field label="Distrito">
                <input value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} className={input} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo">
                  <select value={form.property_type} onChange={e => setForm(f => ({ ...f, property_type: e.target.value }))} className={input}>
                    {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Tipologia">
                  <input value={form.typology} onChange={e => setForm(f => ({ ...f, typology: e.target.value }))} placeholder="T2, T3..." className={input} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Área (m²)">
                  <input type="number" value={form.area_m2} onChange={e => setForm(f => ({ ...f, area_m2: e.target.value }))} className={input} />
                </Field>
                <Field label="Preço pedido (€)">
                  <input type="number" value={form.asking_price_eur} onChange={e => setForm(f => ({ ...f, asking_price_eur: e.target.value }))} className={input} />
                </Field>
              </div>
              <Field label="Proprietário">
                <select value={form.owner_id} onChange={e => setForm(f => ({ ...f, owner_id: e.target.value }))} className={input}>
                  <option value="">— sem proprietário —</option>
                  {owners.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
                </select>
              </Field>
              <Field label="Estado">
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={input}>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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
      ) : properties.length === 0 ? (
        <p className="text-gray-500 text-sm">Nenhum imóvel ainda.</p>
      ) : (
        <div className="border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                {['Morada', 'Tipo', 'Preço', 'Proprietário', 'Estado', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {properties.map(p => (
                <tr key={p.id} className="hover:bg-gray-900/50">
                  <td className="px-4 py-3 text-white">{p.address}</td>
                  <td className="px-4 py-3 text-gray-300">{p.property_type ? TYPE_LABELS[p.property_type] : '—'}{p.typology ? ` ${p.typology}` : ''}</td>
                  <td className="px-4 py-3 text-gray-300">{p.asking_price_eur ? `${p.asking_price_eur.toLocaleString('pt-PT')} €` : '—'}</td>
                  <td className="px-4 py-3 text-gray-300">{p.owners?.full_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[p.status]}`}>{STATUS_LABELS[p.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(p.id)} className="text-gray-600 hover:text-red-400 text-xs">Eliminar</button>
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
  return <div><label className="block text-xs text-gray-400 mb-1">{label}</label>{children}</div>
}
