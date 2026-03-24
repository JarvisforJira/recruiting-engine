import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Star, Zap, ChevronRight, Filter } from 'lucide-react'
import { prospectsApi, rolesApi, type Prospect, type Role } from '../../services/api'
import AddProspectModal from './AddProspectModal'

const PRIORITY_BADGE: Record<string, string> = {
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
  skip: 'badge-skip',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  queued: 'Queued',
  contacted: 'Contacted',
  replied: 'Replied',
  in_conversation: 'In Conversation',
  declined: 'Declined',
  paused: 'Paused',
  converted: 'Converted',
  not_qualified: 'Not Qualified',
}

export default function ProspectsPage() {
  const [searchParams] = useSearchParams()
  const roleIdFilter = searchParams.get('role_id') ?? ''

  const [prospects, setProspects] = useState<Prospect[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [scoringIds, setScoringIds] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState({ role_id: roleIdFilter, status: '', priority: '' })

  const load = () => {
    const params: Record<string, string> = {}
    if (filters.role_id) params.role_id = filters.role_id
    if (filters.status) params.status = filters.status
    if (filters.priority) params.priority = filters.priority
    prospectsApi.list(params).then(setProspects).finally(() => setLoading(false))
  }

  useEffect(() => { rolesApi.list().then(setRoles) }, [])
  useEffect(() => { load() }, [filters])

  const scoreAll = async () => {
    const unscored = prospects.filter(p => !p.score)
    const ids = unscored.map(p => p.id)
    setScoringIds(new Set(ids))
    for (const id of ids) {
      try {
        const scored = await prospectsApi.score(id)
        setProspects(prev => prev.map(p => p.id === id ? scored : p))
      } finally {
        setScoringIds(prev => { const s = new Set(prev); s.delete(id); return s })
      }
    }
  }

  const scoreOne = async (id: string) => {
    setScoringIds(prev => new Set([...prev, id]))
    try {
      const scored = await prospectsApi.score(id)
      setProspects(prev => prev.map(p => p.id === id ? scored : p))
    } finally {
      setScoringIds(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  const unscored = prospects.filter(p => !p.score).length

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Prospects</h1>
          <p className="text-sm text-gray-500 mt-1">{prospects.length} total{unscored > 0 && ` · ${unscored} unscored`}</p>
        </div>
        <div className="flex gap-2">
          {unscored > 0 && (
            <button className="btn-secondary" onClick={scoreAll}>
              <Zap className="w-4 h-4" /> Score All ({unscored})
            </button>
          )}
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Add Prospect
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">Filter:</span>
        </div>
        <select
          className="input w-auto text-sm py-1.5"
          value={filters.role_id}
          onChange={e => setFilters(f => ({ ...f, role_id: e.target.value }))}
        >
          <option value="">All Roles</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
        </select>
        <select
          className="input w-auto text-sm py-1.5"
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          className="input w-auto text-sm py-1.5"
          value={filters.priority}
          onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
        >
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="skip">Skip</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array(5).fill(0).map((_, i) => <div key={i} className="card p-4 h-16 animate-pulse" />)}
        </div>
      ) : prospects.length === 0 ? (
        <div className="card p-12 text-center">
          <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No prospects yet</p>
          <p className="text-sm text-gray-400 mt-1">Add prospects by pasting LinkedIn profiles.</p>
          <button className="btn-primary mt-4" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Add Prospect
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {prospects.map(p => (
            <div key={p.id} className="card p-4 flex items-center gap-4 hover:border-brand-200 transition-all group">
              {/* Score badge */}
              <div className="w-12 text-center flex-shrink-0">
                {scoringIds.has(p.id) ? (
                  <div className="w-10 h-10 mx-auto rounded-full border-2 border-brand-200 border-t-brand-500 animate-spin" />
                ) : p.score != null ? (
                  <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center text-sm font-bold
                    ${p.score >= 70 ? 'bg-emerald-50 text-emerald-700' : p.score >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.score}
                  </div>
                ) : (
                  <button
                    className="w-10 h-10 mx-auto rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center hover:border-brand-300 transition-colors"
                    onClick={() => scoreOne(p.id)}
                    title="Score this prospect"
                  >
                    <Zap className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-400" />
                  </button>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 text-sm">{p.name || 'Unknown'}</p>
                  {p.priority && (
                    <span className={PRIORITY_BADGE[p.priority]}>{p.priority}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {p.current_title || '—'}{p.current_company ? ` · ${p.current_company}` : ''}
                </p>
                {p.score_reasoning && (
                  <p className="text-xs text-gray-400 mt-1 truncate">{p.score_reasoning}</p>
                )}
              </div>

              <div className="flex-shrink-0 text-right">
                <p className="text-xs text-gray-400">{p.role_title}</p>
                <p className={`text-xs mt-0.5 font-medium ${
                  p.status === 'replied' || p.status === 'in_conversation' ? 'text-brand-600' :
                  p.status === 'contacted' ? 'text-amber-600' :
                  p.status === 'converted' ? 'text-emerald-600' :
                  'text-gray-400'
                }`}>{STATUS_LABELS[p.status] || p.status}</p>
              </div>

              <Link to={`/prospects/${p.id}`} className="ml-2">
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-400 transition-colors" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddProspectModal
          roles={roles}
          defaultRoleId={filters.role_id}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load() }}
        />
      )}
    </div>
  )
}
