import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarCheck, Clock, Send, Copy, CheckCircle, Zap, ChevronRight } from 'lucide-react'
import { outreachApi, rolesApi, type QueueItem, type Prospect, type Role } from '../../services/api'

export default function QueuePage() {
  const [searchParams] = useSearchParams()
  const defaultTab = searchParams.get('tab') === 'followup' ? 'followup' : 'daily'

  const [tab, setTab] = useState<'daily' | 'followup'>(defaultTab as 'daily' | 'followup')
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [followups, setFollowups] = useState<Prospect[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())
  const [generatingFollowup, setGeneratingFollowup] = useState<string | null>(null)
  const [followupMessages, setFollowupMessages] = useState<Record<string, string>>({})

  const load = async () => {
    setLoading(true)
    try {
      const [q, f] = await Promise.all([
        outreachApi.getDailyQueue(roleFilter || undefined),
        outreachApi.getFollowUpQueue(roleFilter || undefined),
      ])
      setQueue(q)
      setFollowups(f)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { rolesApi.list().then(setRoles) }, [])
  useEffect(() => { load() }, [roleFilter])

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const markSent = async (messageId: string, prospectId: string) => {
    await outreachApi.markSent(messageId)
    setSentIds(prev => new Set([...prev, messageId]))
  }

  const generateFollowup = async (prospectId: string) => {
    setGeneratingFollowup(prospectId)
    try {
      const msg = await outreachApi.generateFollowUp(prospectId)
      setFollowupMessages(prev => ({ ...prev, [prospectId]: msg.body }))
    } finally {
      setGeneratingFollowup(null)
    }
  }

  const priorityColors: Record<number, string> = { 0: 'bg-emerald-500', 1: 'bg-amber-400', 2: 'bg-gray-300' }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Outreach Queue</h1>
          <p className="text-sm text-gray-500 mt-1">Your prioritized list — messages ready to send.</p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            className="input w-auto text-sm py-1.5"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
          <button className="btn-secondary" onClick={load}>
            <Zap className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-100">
        <button
          className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors -mb-px ${tab === 'daily' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('daily')}
        >
          <CalendarCheck className="w-4 h-4" />
          Daily Queue
          {queue.length > 0 && <span className="px-1.5 py-0.5 bg-brand-50 text-brand-700 text-xs rounded-full">{queue.length}</span>}
        </button>
        <button
          className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors -mb-px ${tab === 'followup' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('followup')}
        >
          <Clock className="w-4 h-4" />
          Follow-up Queue
          {followups.length > 0 && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full">{followups.length}</span>}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => <div key={i} className="card p-5 h-32 animate-pulse" />)}
        </div>
      ) : tab === 'daily' ? (
        queue.length === 0 ? (
          <div className="card p-12 text-center">
            <CalendarCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Queue is empty</p>
            <p className="text-sm text-gray-400 mt-1">Add and score prospects to populate your daily queue.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {queue.map((item, i) => {
              const isSent = sentIds.has(item.message.id)
              return (
                <div key={item.prospect.id} className={`card p-5 ${isSent ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-4">
                    {/* Rank */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-2">
                      <span className="text-lg font-bold text-gray-300">#{i + 1}</span>
                      <span className={`w-2 h-2 rounded-full ${priorityColors[item.priority_rank] || 'bg-gray-200'}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <div className="flex items-center gap-2">
                            <Link to={`/prospects/${item.prospect.id}`} className="font-semibold text-gray-900 hover:text-brand-600">
                              {item.prospect.name || 'Unknown'}
                            </Link>
                            <span className="text-xs text-gray-400">{item.prospect.role_title}</span>
                          </div>
                          <p className="text-xs text-gray-500">{item.prospect.current_title} · {item.prospect.current_company}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="btn-ghost text-xs"
                            onClick={() => copy(item.message.body, item.message.id)}
                          >
                            {copiedId === item.message.id ? (
                              <><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Copied</>
                            ) : (
                              <><Copy className="w-3.5 h-3.5" /> Copy</>
                            )}
                          </button>
                          {!isSent && (
                            <button
                              className="btn-secondary text-xs py-1 px-3"
                              onClick={() => markSent(item.message.id, item.prospect.id)}
                            >
                              <Send className="w-3 h-3" /> Mark Sent
                            </button>
                          )}
                          {isSent && (
                            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                              <CheckCircle className="w-3.5 h-3.5" /> Sent
                            </span>
                          )}
                        </div>
                      </div>

                      {item.reason && (
                        <p className="text-xs text-gray-400 mb-2 italic">{item.reason}</p>
                      )}

                      {/* Message */}
                      <div className="bg-gray-50 rounded-lg p-3 mt-2">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            {item.message.message_type.replace(/_/g, ' ')}
                          </span>
                          {item.message.angle_used && (
                            <span className="text-xs text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">{item.message.angle_used}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{item.message.body}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        followups.length === 0 ? (
          <div className="card p-12 text-center">
            <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No follow-ups needed</p>
            <p className="text-sm text-gray-400 mt-1">Prospects contacted 7+ days ago with no reply will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {followups.map(p => (
              <div key={p.id} className="card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link to={`/prospects/${p.id}`} className="font-medium text-gray-900 hover:text-brand-600 text-sm">
                        {p.name || 'Unknown'}
                      </Link>
                      <span className="text-xs text-gray-400">{p.role_title}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{p.current_title} · {p.current_company}</p>
                    {p.last_contacted_at && (
                      <p className="text-xs text-amber-600 mt-1">
                        Last contacted: {new Date(p.last_contacted_at).toLocaleDateString()}
                      </p>
                    )}
                    {followupMessages[p.id] && (
                      <div className="bg-gray-50 rounded-lg p-3 mt-3">
                        <p className="text-xs font-semibold text-gray-400 mb-1.5">Follow-up Message</p>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{followupMessages[p.id]}</p>
                        <button
                          className="btn-ghost text-xs mt-2"
                          onClick={() => copy(followupMessages[p.id], p.id)}
                        >
                          {copiedId === p.id ? <><CheckCircle className="w-3 h-3 text-emerald-500" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      className="btn-secondary text-xs py-1.5 px-3"
                      onClick={() => generateFollowup(p.id)}
                      disabled={generatingFollowup === p.id}
                    >
                      <Zap className="w-3 h-3" />
                      {generatingFollowup === p.id ? 'Generating...' : 'Write Follow-up'}
                    </button>
                    <Link to={`/prospects/${p.id}`} className="btn-ghost text-xs py-1.5 px-2">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
