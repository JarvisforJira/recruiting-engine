import { useState } from 'react'
import { X } from 'lucide-react'
import { rolesApi, type Role } from '../../services/api'

interface Props {
  role?: Role
  onClose: () => void
  onSaved: () => void
}

export default function RoleModal({ role, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    title: role?.title ?? '',
    company: role?.company ?? '',
    description: role?.description ?? '',
    requirements: role?.requirements ?? '',
    compensation: role?.compensation ?? '',
    location: role?.location ?? '',
    remote_policy: role?.remote_policy ?? '',
    notes: role?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.title || !form.company || !form.description || !form.requirements) {
      setError('Title, company, description, and requirements are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (role) {
        await rolesApi.update(role.id, form)
      } else {
        await rolesApi.create(form)
      }
      onSaved()
    } catch {
      setError('Failed to save role. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{role ? 'Edit Role' : 'New Role'}</h2>
          <button className="btn-ghost p-1.5" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Job Title *</label>
              <input className="input" placeholder="e.g. Senior Backend Engineer" value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div>
              <label className="label">Company *</label>
              <input className="input" placeholder="e.g. Acme Corp" value={form.company} onChange={e => set('company', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Job Description *</label>
            <textarea className="textarea" rows={4} placeholder="What does the role involve? What will this person do?" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div>
            <label className="label">Requirements *</label>
            <textarea className="textarea" rows={4} placeholder="Skills, years of experience, tools, education, etc." value={form.requirements} onChange={e => set('requirements', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Compensation</label>
              <input className="input" placeholder="e.g. $130k–$160k" value={form.compensation} onChange={e => set('compensation', e.target.value)} />
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" placeholder="e.g. New York, NY" value={form.location} onChange={e => set('location', e.target.value)} />
            </div>
            <div>
              <label className="label">Remote Policy</label>
              <input className="input" placeholder="e.g. Hybrid, Remote OK" value={form.remote_policy} onChange={e => set('remote_policy', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Internal Notes</label>
            <textarea className="textarea" rows={2} placeholder="Anything else Claude should know when generating targeting or messages..." value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : role ? 'Save Changes' : 'Create Role'}
          </button>
        </div>
      </div>
    </div>
  )
}
