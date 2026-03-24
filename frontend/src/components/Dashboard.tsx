import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Briefcase, MessageSquare, TrendingUp, ArrowRight, Star, Clock } from 'lucide-react'
import { analyticsApi, type AnalyticsOverview } from '../services/api'

interface Stat {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
}

export default function Dashboard() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsApi.overview().then(setOverview).finally(() => setLoading(false))
  }, [])

  const stats = overview
    ? [
        { label: 'Active Roles', value: overview.active_roles, icon: Briefcase, color: 'text-brand-500 bg-brand-50', to: '/roles' },
        { label: 'Total Prospects', value: overview.total_prospects, icon: Users, color: 'text-violet-500 bg-violet-50', to: '/prospects' },
        { label: 'Contacted', value: overview.total_contacted, sub: `${overview.contact_rate}% of prospects`, icon: MessageSquare, color: 'text-amber-500 bg-amber-50', to: '/prospects?status=contacted' },
        { label: 'Reply Rate', value: `${overview.reply_rate}%`, sub: `${overview.total_replied} replies`, icon: TrendingUp, color: 'text-emerald-500 bg-emerald-50', to: '/analytics' },
      ]
    : []

  const quickActions = [
    { label: 'Create a new role', desc: 'Add a position and build a targeting plan', to: '/roles', icon: Briefcase },
    { label: 'Add prospects', desc: 'Paste LinkedIn profiles to score and rank', to: '/prospects', icon: Users },
    { label: 'View daily queue', desc: 'Your prioritized outreach list with messages', to: '/queue', icon: Star },
    { label: 'Follow-up queue', desc: 'Prospects waiting for a follow-up', to: '/queue?tab=followup', icon: Clock },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Your recruiting operations at a glance.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {loading
          ? Array(4).fill(0).map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-8 bg-gray-100 rounded mb-2" />
                <div className="h-4 bg-gray-100 rounded w-2/3" />
              </div>
            ))
          : stats.map((stat) => (
              <Link key={stat.label} to={stat.to} className="card p-5 hover:border-brand-200 hover:shadow-md transition-all group cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-[18px] h-[18px]" />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-200 group-hover:text-brand-400 transition-colors" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
                {stat.sub && <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>}
              </Link>
            ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="card p-5 flex items-center gap-4 hover:border-brand-200 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                <action.icon className="w-5 h-5 text-brand-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{action.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{action.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-400 transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* Status pipeline */}
      {overview && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Pipeline Overview</h2>
          <div className="card p-5">
            <div className="flex items-center gap-2 text-sm">
              {[
                { label: 'Prospects', value: overview.total_prospects, color: 'bg-gray-200', to: '/prospects' },
                { label: 'Contacted', value: overview.total_contacted, color: 'bg-amber-400', to: '/prospects?status=contacted' },
                { label: 'Replied', value: overview.total_replied, color: 'bg-brand-400', to: '/prospects?status=replied' },
                { label: 'Converted', value: overview.total_converted, color: 'bg-emerald-400', to: '/prospects?status=converted' },
              ].map((stage, i) => (
                <div key={stage.label} className="flex items-center gap-2">
                  {i > 0 && <span className="text-gray-300">→</span>}
                  <Link to={stage.to} className="flex items-center gap-1.5 hover:opacity-75 transition-opacity">
                    <span className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                    <span className="text-gray-500">{stage.label}</span>
                    <span className="font-semibold text-gray-900">{stage.value}</span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
