import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Zap, Edit2, Users, Target, CheckCircle2, XCircle, Lightbulb, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { rolesApi, targetingApi, type Role, type TargetingPlan } from '../../services/api'
import RoleModal from './RoleModal'

export default function RoleDetail() {
  const { id } = useParams<{ id: string }>()
  const [role, setRole] = useState<Role | null>(null)
  const [plan, setPlan] = useState<TargetingPlan | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>('angles')

  useEffect(() => {
    if (!id) return
    rolesApi.get(id).then(setRole)
    targetingApi.get(id).then(setPlan).catch(() => setPlan(null))
  }, [id])

  const generatePlan = async () => {
    if (!id) return
    setLoadingPlan(true)
    try {
      const p = await targetingApi.generate(id)
      setPlan(p)
    } finally {
      setLoadingPlan(false)
    }
  }

  if (!role) return <div className="p-8 text-gray-400">Loading...</div>

  const toggle = (s: string) => setExpandedSection(expandedSection === s ? null : s)

  const Section = ({ id: sid, title, icon: Icon, children }: { id: string; title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <div className="border-b border-gray-100 last:border-0">
      <button className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors" onClick={() => toggle(sid)}>
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Icon className="w-4 h-4 text-gray-400" />
          {title}
        </div>
        {expandedSection === sid ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
      </button>
      {expandedSection === sid && <div className="px-4 pb-4">{children}</div>}
    </div>
  )

  return (
    <div className="p-8">
      <Link to="/roles" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Roles
      </Link>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Role info */}
        <div className="col-span-2 space-y-4">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{role.title}</h1>
                <p className="text-gray-500 mt-0.5">{role.company}</p>
                {role.location && <p className="text-sm text-gray-400 mt-1">{role.location} · {role.remote_policy}</p>}
              </div>
              <button className="btn-secondary" onClick={() => setShowEdit(true)}>
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{role.description}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Requirements</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{role.requirements}</p>
              </div>
              {role.compensation && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Compensation</p>
                  <p className="text-sm text-gray-700">{role.compensation}</p>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Prospects', value: role.prospect_count, icon: Users },
              { label: 'Contacted', value: role.contacted_count, icon: CheckCircle2 },
              { label: 'Replied', value: role.replied_count, icon: Target },
            ].map(stat => (
              <div key={stat.label} className="card p-4 flex items-center gap-3">
                <stat.icon className="w-5 h-5 text-brand-400" />
                <div>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Prospects link */}
          <Link
            to={`/prospects?role_id=${role.id}`}
            className="card p-4 flex items-center justify-between hover:border-brand-200 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Users className="w-4 h-4 text-gray-400" />
              View all prospects for this role
            </div>
            <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-brand-400 rotate-180 transition-colors" />
          </Link>
        </div>

        {/* Right: Targeting Plan */}
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-sm text-gray-900">Targeting Plan</h2>
              <button
                className="btn-primary text-xs px-3 py-1.5"
                onClick={generatePlan}
                disabled={loadingPlan}
              >
                <Zap className="w-3 h-3" />
                {loadingPlan ? 'Generating...' : plan ? 'Regenerate' : 'Generate'}
              </button>
            </div>

            {!plan ? (
              <div className="p-6 text-center">
                <Target className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Generate a targeting plan to see ideal backgrounds, titles, companies, and outreach angles.</p>
              </div>
            ) : (
              <div>
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Ideal Background</p>
                  <p className="text-xs text-gray-700 leading-relaxed">{plan.ideal_background}</p>
                </div>

                <Section id="titles" title="Target Titles" icon={Users}>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.target_titles.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-brand-50 text-brand-700 text-xs rounded-full">{t}</span>
                    ))}
                  </div>
                </Section>

                <Section id="companies" title="Target Companies" icon={Target}>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.target_companies.map(c => (
                      <span key={c} className="px-2 py-0.5 bg-violet-50 text-violet-700 text-xs rounded-full">{c}</span>
                    ))}
                  </div>
                </Section>

                <Section id="angles" title="Outreach Angles" icon={Lightbulb}>
                  <ul className="space-y-1.5">
                    {plan.outreach_angles.map((a, i) => (
                      <li key={i} className="flex gap-2 text-xs text-gray-700">
                        <span className="text-brand-400 font-bold mt-0.5">→</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section id="exclusions" title="Exclusion Rules" icon={XCircle}>
                  <ul className="space-y-1.5">
                    {plan.exclusion_rules.map((r, i) => (
                      <li key={i} className="flex gap-2 text-xs text-gray-600">
                        <XCircle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section id="search" title="Search Strings" icon={Search}>
                  <p className="text-xs text-gray-400 mb-3">Paste each string directly into LinkedIn People search. Use LinkedIn's sidebar filters for location.</p>
                  <div className="space-y-3">
                    {plan.search_strings.map((s, i) => {
                      const hasComment = s.startsWith('//')
                      const parts = hasComment ? s.split('|') : null
                      const comment = parts ? parts[0].replace('//', '').trim() : null
                      const query = parts ? parts.slice(1).join('|').trim() : s
                      return (
                        <div key={i} className="rounded-lg border border-gray-200 overflow-hidden">
                          {comment && (
                            <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200">
                              <p className="text-xs text-gray-500 font-medium">{comment}</p>
                            </div>
                          )}
                          <div className="flex items-center gap-2 p-2">
                            <code className="flex-1 text-xs text-gray-800 font-mono">{query}</code>
                            <button
                              className="flex-shrink-0 text-xs text-brand-500 hover:text-brand-700 font-medium px-2"
                              onClick={() => navigator.clipboard.writeText(query)}
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Section>
              </div>
            )}
          </div>
        </div>
      </div>

      {showEdit && (
        <RoleModal
          role={role}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); rolesApi.get(id!).then(setRole) }}
        />
      )}
    </div>
  )
}
