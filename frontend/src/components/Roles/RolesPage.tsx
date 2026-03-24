import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Briefcase, Users, MessageSquare, TrendingUp, ChevronRight } from 'lucide-react'
import { rolesApi, type Role } from '../../services/api'
import RoleModal from './RoleModal'

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const load = () => rolesApi.list().then(setRoles).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700',
    paused: 'bg-amber-50 text-amber-700',
    filled: 'bg-blue-50 text-blue-700',
    cancelled: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Roles</h1>
          <p className="text-sm text-gray-500 mt-1">Manage open positions and their targeting strategies.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> New Role
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : roles.length === 0 ? (
        <div className="card p-12 text-center">
          <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No roles yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first role to get started.</p>
          <button className="btn-primary mt-4" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> Create Role
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => (
            <Link
              key={role.id}
              to={`/roles/${role.id}`}
              className="card p-5 flex items-center gap-5 hover:border-brand-200 hover:shadow-md transition-all group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900">{role.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[role.status]}`}>
                    {role.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{role.company}</p>
                {role.location && <p className="text-xs text-gray-400 mt-0.5">{role.location} {role.remote_policy && `· ${role.remote_policy}`}</p>}
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Users className="w-3.5 h-3.5" />
                  <span>{role.prospect_count} prospects</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{role.contacted_count} contacted</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{role.replied_count} replied</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-400 transition-colors ml-2" />
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <RoleModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}
