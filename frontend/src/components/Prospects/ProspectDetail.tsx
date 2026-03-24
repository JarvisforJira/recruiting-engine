import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Zap, MessageSquare, Send, CheckCircle, RefreshCw, Bot } from 'lucide-react'
import { prospectsApi, outreachApi, type Prospect, type OutreachMessage } from '../../services/api'

const MESSAGE_TYPES = [
  { key: 'connection_note', label: 'Connection Note' },
  { key: 'first_message', label: 'First Message' },
  { key: 'follow_up_1', label: 'Follow-up 1' },
  { key: 'follow_up_2', label: 'Follow-up 2' },
]

const STATUS_OPTIONS = [
  'new', 'queued', 'contacted', 'replied', 'in_conversation', 'declined', 'paused', 'converted', 'not_qualified'
]

export default function ProspectDetail() {
  const { id } = useParams<{ id: string }>()
  const [prospect, setProspect] = useState<Prospect | null>(null)
  const [messages, setMessages] = useState<OutreachMessage[]>([])
  const [scoring, setScoring] = useState(false)
  const [generatingType, setGeneratingType] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'messages' | 'assist'>('messages')
  const [candidateMsg, setCandidateMsg] = useState('')
  const [assist, setAssist] = useState<{ summary: string; intent_detected: string; suggested_response: string; tone_notes: string } | null>(null)
  const [assisting, setAssisting] = useState(false)

  const load = async () => {
    if (!id) return
    const [p, m] = await Promise.all([prospectsApi.get(id), outreachApi.getProspectMessages(id)])
    setProspect(p)
    setMessages(m)
  }

  useEffect(() => { load() }, [id])

  const score = async () => {
    if (!id) return
    setScoring(true)
    try { const p = await prospectsApi.score(id); setProspect(p) }
    finally { setScoring(false) }
  }

  const generateMessage = async (type: string) => {
    if (!id) return
    setGeneratingType(type)
    try {
      const msg = await outreachApi.generate(id, type)
      setMessages(prev => [msg, ...prev.filter(m => m.message_type !== type)])
    } finally {
      setGeneratingType(null)
    }
  }

  const markSent = async (msgId: string) => {
    const updated = await outreachApi.markSent(msgId)
    setMessages(prev => prev.map(m => m.id === msgId ? updated : m))
    const p = await prospectsApi.get(id!)
    setProspect(p)
  }

  const updateStatus = async (status: string) => {
    if (!id) return
    const p = await prospectsApi.update(id, { status: status as Prospect['status'] })
    setProspect(p)
  }

  const getAssist = async () => {
    if (!id || !candidateMsg.trim()) return
    setAssisting(true)
    try {
      const r = await outreachApi.responseAssist(id, candidateMsg)
      setAssist(r)
      const p = await prospectsApi.get(id)
      setProspect(p)
    } finally {
      setAssisting(false)
    }
  }

  if (!prospect) return <div className="p-8 text-gray-400">Loading...</div>

  const priorityColors: Record<string, string> = { high: 'text-emerald-600', medium: 'text-amber-600', low: 'text-gray-500', skip: 'text-red-500' }

  return (
    <div className="p-8">
      <Link to="/prospects" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Prospects
      </Link>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Prospect info */}
        <div className="col-span-1 space-y-4">
          <div className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h1 className="font-semibold text-gray-900">{prospect.name || 'Unknown'}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{prospect.current_title}</p>
                <p className="text-sm text-gray-400">{prospect.current_company}</p>
              </div>
              {prospect.score != null && (
                <div className={`text-lg font-bold ${prospect.score >= 70 ? 'text-emerald-600' : prospect.score >= 40 ? 'text-amber-600' : 'text-gray-400'}`}>
                  {prospect.score}
                </div>
              )}
            </div>

            {prospect.priority && (
              <p className={`text-sm font-semibold mb-3 ${priorityColors[prospect.priority]}`}>
                {prospect.priority.charAt(0).toUpperCase() + prospect.priority.slice(1)} Priority
              </p>
            )}

            {prospect.score_reasoning && (
              <p className="text-xs text-gray-500 leading-relaxed mb-3">{prospect.score_reasoning}</p>
            )}

            {prospect.outreach_angle && (
              <div className="bg-brand-50 rounded-lg p-3 mb-3">
                <p className="text-xs font-semibold text-brand-600 mb-1">Best Outreach Angle</p>
                <p className="text-xs text-brand-700">{prospect.outreach_angle}</p>
              </div>
            )}

            <button
              className="btn-secondary w-full text-sm"
              onClick={score}
              disabled={scoring}
            >
              <Zap className="w-3.5 h-3.5" />
              {scoring ? 'Scoring...' : prospect.score ? 'Rescore' : 'Score Prospect'}
            </button>
          </div>

          {/* Status */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Status</p>
            <select
              className="input"
              value={prospect.status}
              onChange={e => updateStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
            {prospect.linkedin_url && (
              <a href={prospect.linkedin_url} target="_blank" rel="noreferrer" className="text-xs text-brand-500 hover:underline mt-3 block">
                View on LinkedIn →
              </a>
            )}
          </div>

          {/* Role */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Role</p>
            <Link to={`/roles/${prospect.role_id}`} className="text-sm text-brand-600 hover:underline">
              {prospect.role_title}
            </Link>
          </div>
        </div>

        {/* Right: Messages + Assist */}
        <div className="col-span-2 space-y-4">
          <div className="card overflow-hidden">
            <div className="flex border-b border-gray-100">
              <button
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'messages' ? 'text-brand-600 border-b-2 border-brand-500' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('messages')}
              >
                <span className="flex items-center justify-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Messages
                </span>
              </button>
              <button
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'assist' ? 'text-brand-600 border-b-2 border-brand-500' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('assist')}
              >
                <span className="flex items-center justify-center gap-2">
                  <Bot className="w-4 h-4" /> Response Assist
                </span>
              </button>
            </div>

            {activeTab === 'messages' && (
              <div className="p-5 space-y-4">
                {/* Generate buttons */}
                <div className="flex gap-2 flex-wrap">
                  {MESSAGE_TYPES.map(mt => (
                    <button
                      key={mt.key}
                      className="btn-secondary text-xs py-1.5 px-3"
                      onClick={() => generateMessage(mt.key)}
                      disabled={generatingType === mt.key}
                    >
                      {generatingType === mt.key ? (
                        <><RefreshCw className="w-3 h-3 animate-spin" /> Generating...</>
                      ) : (
                        <><Zap className="w-3 h-3" /> {mt.label}</>
                      )}
                    </button>
                  ))}
                </div>

                {/* Message list */}
                {messages.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No messages yet. Generate one above.</p>
                ) : (
                  <div className="space-y-3">
                    {messages.map(msg => (
                      <div key={msg.id} className={`rounded-xl border p-4 ${msg.sent ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              {msg.message_type.replace(/_/g, ' ')}
                            </span>
                            {msg.angle_used && (
                              <span className="text-xs text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">{msg.angle_used}</span>
                            )}
                          </div>
                          {msg.sent ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-600">
                              <CheckCircle className="w-3.5 h-3.5" /> Sent
                            </span>
                          ) : (
                            <button
                              className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium"
                              onClick={() => markSent(msg.id)}
                            >
                              <Send className="w-3 h-3" /> Mark as Sent
                            </button>
                          )}
                        </div>
                        {msg.subject && <p className="text-xs font-medium text-gray-600 mb-1">Subject: {msg.subject}</p>}
                        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{msg.body}</p>
                        {msg.message_type === 'connection_note' && (
                          <p className="text-xs text-gray-400 mt-2">{msg.body.length} / 300 characters</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'assist' && (
              <div className="p-5 space-y-4">
                <div>
                  <label className="label">Paste what the candidate said</label>
                  <textarea
                    className="textarea"
                    rows={4}
                    placeholder="Paste their LinkedIn reply, email, or message here..."
                    value={candidateMsg}
                    onChange={e => setCandidateMsg(e.target.value)}
                  />
                </div>
                <button
                  className="btn-primary"
                  onClick={getAssist}
                  disabled={assisting || !candidateMsg.trim()}
                >
                  <Bot className="w-4 h-4" />
                  {assisting ? 'Analyzing...' : 'Analyze & Draft Response'}
                </button>

                {assist && (
                  <div className="space-y-3">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Summary</p>
                      <p className="text-sm text-gray-700">{assist.summary}</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="bg-brand-50 rounded-lg p-3 flex-1">
                        <p className="text-xs font-semibold text-brand-600 mb-1">Intent</p>
                        <p className="text-sm text-brand-700 capitalize">{assist.intent_detected.replace(/_/g, ' ')}</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 flex-1">
                        <p className="text-xs font-semibold text-amber-600 mb-1">Tone Notes</p>
                        <p className="text-sm text-amber-700">{assist.tone_notes}</p>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Suggested Response</p>
                      <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{assist.suggested_response}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Raw profile */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Raw Profile</p>
            <p className="text-xs text-gray-500 whitespace-pre-line leading-relaxed max-h-32 overflow-auto">{prospect.raw_profile}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
