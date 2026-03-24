import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { prospectsApi, type Role } from '../../services/api'

interface Props {
  roles: Role[]
  defaultRoleId?: string
  onClose: () => void
  onSaved: () => void
}

interface ProfileEntry {
  id: string
  raw_profile: string
  linkedin_url: string
}

export default function AddProspectModal({ roles, defaultRoleId, onClose, onSaved }: Props) {
  const [roleId, setRoleId] = useState(defaultRoleId ?? (roles[0]?.id ?? ''))
  const [profiles, setProfiles] = useState<ProfileEntry[]>([
    { id: '1', raw_profile: '', linkedin_url: '' }
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addProfile = () => {
    setProfiles(p => [...p, { id: Date.now().toString(), raw_profile: '', linkedin_url: '' }])
  }

  const removeProfile = (id: string) => {
    setProfiles(p => p.filter(e => e.id !== id))
  }

  const updateProfile = (id: string, field: string, value: string) => {
    setProfiles(p => p.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  const save = async () => {
    const valid = profiles.filter(p => p.raw_profile.trim())
    if (!roleId || valid.length === 0) {
      setError('Select a role and paste at least one profile.')
      return
    }
    setSaving(true)
    setError('')
    try {
      for (const p of valid) {
        await prospectsApi.create({
          role_id: roleId,
          raw_profile: p.raw_profile,
          linkedin_url: p.linkedin_url || undefined,
        })
      }
      onSaved()
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Add Prospects</h2>
            <p className="text-xs text-gray-400 mt-0.5">Paste LinkedIn profile text. Claude will score and rank them.</p>
          </div>
          <button className="btn-ghost p-1.5" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-4">
          <div>
            <label className="label">Role *</label>
            <select className="input" value={roleId} onChange={e => setRoleId(e.target.value)}>
              <option value="">Select a role...</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.title} — {r.company}</option>)}
            </select>
          </div>

          {profiles.map((profile, i) => (
            <div key={profile.id} className="bg-gray-50 rounded-xl p-4 space-y-3 relative">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500">Profile {i + 1}</p>
                {profiles.length > 1 && (
                  <button className="btn-ghost p-1" onClick={() => removeProfile(profile.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
              <div>
                <label className="label">LinkedIn Profile Text *</label>
                <textarea
                  className="textarea"
                  rows={5}
                  placeholder="Paste the full LinkedIn profile text here — name, title, company, experience, education, etc. The more you paste, the better the scoring."
                  value={profile.raw_profile}
                  onChange={e => updateProfile(profile.id, 'raw_profile', e.target.value)}
                />
              </div>
              <div>
                <label className="label">LinkedIn URL (optional)</label>
                <input
                  className="input"
                  placeholder="https://linkedin.com/in/..."
                  value={profile.linkedin_url}
                  onChange={e => updateProfile(profile.id, 'linkedin_url', e.target.value)}
                />
              </div>
            </div>
          ))}

          <button className="btn-secondary w-full" onClick={addProfile}>
            <Plus className="w-4 h-4" /> Add Another Profile
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-100">
          <p className="text-xs text-gray-400">After adding, score them to rank by fit.</p>
          <div className="flex gap-3">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Adding...' : `Add ${profiles.filter(p => p.raw_profile.trim()).length || ''} Prospect${profiles.filter(p => p.raw_profile.trim()).length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
