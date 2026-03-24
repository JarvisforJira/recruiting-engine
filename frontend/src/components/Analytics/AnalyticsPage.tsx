import { useEffect, useState } from 'react'
import { TrendingUp, Bot, RefreshCw } from 'lucide-react'
import { analyticsApi, type AnalyticsOverview } from '../../services/api'

interface RoleStats {
  role_id: string
  role_title: string
  company: string
  prospects: number
  contacted: number
  replied: number
  reply_rate: number
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [byRole, setByRole] = useState<RoleStats[]>([])
  const [statusBreakdown, setStatusBreakdown] = useState<Record<string, number>>({})
  const [priorityBreakdown, setPriorityBreakdown] = useState<Record<string, number>>({})
  const [insights, setInsights] = useState<string>('')
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      analyticsApi.overview(),
      analyticsApi.byRole(),
      analyticsApi.statusBreakdown(),
      analyticsApi.priorityBreakdown(),
    ]).then(([ov, br, sb, pb]) => {
      setOverview(ov)
      setByRole(br)
      setStatusBreakdown(sb)
      setPriorityBreakdown(pb)
    }).finally(() => setLoading(false))
  }, [])

  const getInsights = async () => {
    setLoadingInsights(true)
    try {
      const r = await analyticsApi.insights()
      setInsights(r.insights)
    } finally {
      setLoadingInsights(false)
    }
  }

  const STATUS_ORDER = ['new', 'queued', 'contacted', 'replied', 'in_conversation', 'converted', 'declined', 'paused', 'not_qualified']
  const STATUS_COLORS: Record<string, string> = {
    new: 'bg-gray-200',
    queued: 'bg-blue-200',
    contacted: 'bg-amber-300',
    replied: 'bg-brand-400',
    in_conversation: 'bg-brand-600',
    converted: 'bg-emerald-400',
    declined: 'bg-red-300',
    paused: 'bg-gray-300',
    not_qualified: 'bg-gray-100',
  }

  const PRIORITY_COLORS: Record<string, string> = {
    high: 'bg-emerald-400',
    medium: 'bg-amber-300',
    low: 'bg-gray-300',
    skip: 'bg-red-300',
    unscored: 'bg-gray-200',
  }

  if (loading) return <div className="p-8 text-gray-400">Loading analytics...</div>

  const totalStatus = Object.values(statusBreakdown).reduce((a, b) => a + b, 0) || 1
  const totalPriority = Object.values(priorityBreakdown).reduce((a, b) => a + b, 0) || 1

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Track what's working and where to focus.</p>
        </div>
        <button className="btn-primary" onClick={getInsights} disabled={loadingInsights}>
          <Bot className="w-4 h-4" />
          {loadingInsights ? 'Analyzing...' : 'Get AI Insights'}
        </button>
      </div>

      {/* Key metrics */}
      {overview && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Active Roles', value: overview.active_roles, color: 'text-brand-600' },
            { label: 'Total Prospects', value: overview.total_prospects, color: 'text-violet-600' },
            { label: 'Reply Rate', value: `${overview.reply_rate}%`, color: 'text-emerald-600' },
            { label: 'Converted', value: overview.total_converted, color: 'text-emerald-600' },
          ].map(m => (
            <div key={m.label} className="card p-5">
              <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
              <p className="text-sm text-gray-500 mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Status breakdown */}
        <div className="card p-5">
          <h2 className="font-semibold text-sm text-gray-700 mb-4">Prospect Status</h2>
          <div className="space-y-2.5">
            {STATUS_ORDER.filter(s => statusBreakdown[s] != null).map(s => (
              <div key={s} className="flex items-center gap-3">
                <span className="w-28 text-xs text-gray-500 capitalize flex-shrink-0">{s.replace(/_/g, ' ')}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${STATUS_COLORS[s] || 'bg-gray-300'}`}
                    style={{ width: `${Math.round((statusBreakdown[s] / totalStatus) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-6 text-right">{statusBreakdown[s]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority breakdown */}
        <div className="card p-5">
          <h2 className="font-semibold text-sm text-gray-700 mb-4">Prospect Priority</h2>
          <div className="space-y-2.5">
            {['high', 'medium', 'low', 'skip', 'unscored'].filter(p => priorityBreakdown[p] != null).map(p => (
              <div key={p} className="flex items-center gap-3">
                <span className="w-20 text-xs text-gray-500 capitalize flex-shrink-0">{p}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${PRIORITY_COLORS[p] || 'bg-gray-300'}`}
                    style={{ width: `${Math.round(((priorityBreakdown[p] || 0) / totalPriority) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-6 text-right">{priorityBreakdown[p] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* By role */}
      {byRole.length > 0 && (
        <div className="card p-5 mb-8">
          <h2 className="font-semibold text-sm text-gray-700 mb-4">Performance by Role</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left py-2 pr-4">Role</th>
                  <th className="text-right py-2 px-3">Prospects</th>
                  <th className="text-right py-2 px-3">Contacted</th>
                  <th className="text-right py-2 px-3">Replied</th>
                  <th className="text-right py-2 pl-3">Reply Rate</th>
                </tr>
              </thead>
              <tbody>
                {byRole.map(r => (
                  <tr key={r.role_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-gray-900">{r.role_title}</p>
                      <p className="text-xs text-gray-400">{r.company}</p>
                    </td>
                    <td className="text-right py-3 px-3 text-gray-700">{r.prospects}</td>
                    <td className="text-right py-3 px-3 text-gray-700">{r.contacted}</td>
                    <td className="text-right py-3 px-3 text-gray-700">{r.replied}</td>
                    <td className="text-right py-3 pl-3">
                      <span className={`font-semibold ${r.reply_rate >= 20 ? 'text-emerald-600' : r.reply_rate >= 10 ? 'text-amber-600' : 'text-gray-500'}`}>
                        {r.reply_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Insights */}
      {insights && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-4 h-4 text-brand-500" />
            <h2 className="font-semibold text-sm text-gray-700">AI Insights</h2>
            <button className="btn-ghost text-xs ml-auto" onClick={getInsights} disabled={loadingInsights}>
              <RefreshCw className={`w-3.5 h-3.5 ${loadingInsights ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{insights}</p>
        </div>
      )}

      {!insights && (
        <div className="card p-8 text-center border-dashed">
          <TrendingUp className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Click "Get AI Insights" for personalized analysis of your outreach performance.</p>
        </div>
      )}
    </div>
  )
}
