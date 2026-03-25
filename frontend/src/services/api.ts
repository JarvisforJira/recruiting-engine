import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : '/api',
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Role {
  id: string
  title: string
  company: string
  description: string
  requirements: string
  compensation?: string
  location?: string
  remote_policy?: string
  notes?: string
  status: 'active' | 'paused' | 'filled' | 'cancelled'
  prospect_count: number
  contacted_count: number
  replied_count: number
  created_at: string
  updated_at: string
}

export interface TargetingPlan {
  id: string
  role_id: string
  ideal_background: string
  target_titles: string[]
  target_companies: string[]
  adjacent_profiles: string[]
  exclusion_rules: string[]
  outreach_angles: string[]
  keywords: string[]
  search_strings: string[]
  created_at: string
  updated_at: string
}

export interface Prospect {
  id: string
  role_id: string
  role_title?: string
  raw_profile: string
  name?: string
  linkedin_url?: string
  current_title?: string
  current_company?: string
  location?: string
  status: 'new' | 'queued' | 'contacted' | 'replied' | 'in_conversation' | 'declined' | 'paused' | 'converted' | 'not_qualified'
  priority?: 'high' | 'medium' | 'low' | 'skip'
  score?: number
  score_reasoning?: string
  outreach_angle?: string
  notes?: string
  last_contacted_at?: string
  reply_received_at?: string
  created_at: string
  updated_at: string
}

export interface OutreachMessage {
  id: string
  prospect_id: string
  role_id: string
  message_type: 'connection_note' | 'first_message' | 'follow_up_1' | 'follow_up_2' | 'response_draft'
  subject?: string
  body: string
  angle_used?: string
  sent: boolean
  sent_at?: string
  created_at: string
}

export interface QueueItem {
  prospect: Prospect
  message: OutreachMessage
  priority_rank: number
  reason: string
}

export interface ResponseAssist {
  prospect_id: string
  candidate_message: string
  summary: string
  intent_detected: string
  suggested_response: string
  tone_notes: string
  created_at: string
}

export interface AnalyticsOverview {
  active_roles: number
  total_prospects: number
  total_contacted: number
  total_replied: number
  total_converted: number
  total_declined: number
  reply_rate: number
  contact_rate: number
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export const rolesApi = {
  list: () => api.get<Role[]>('/roles/').then(r => r.data),
  get: (id: string) => api.get<Role>(`/roles/${id}`).then(r => r.data),
  create: (data: Partial<Role>) => api.post<Role>('/roles/', data).then(r => r.data),
  update: (id: string, data: Partial<Role>) => api.patch<Role>(`/roles/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/roles/${id}`).then(r => r.data),
}

// ─── Targeting ────────────────────────────────────────────────────────────────

export const targetingApi = {
  generate: (roleId: string) => api.post<TargetingPlan>(`/targeting/${roleId}/generate`).then(r => r.data),
  get: (roleId: string) => api.get<TargetingPlan>(`/targeting/${roleId}`).then(r => r.data),
}

// ─── Prospects ────────────────────────────────────────────────────────────────

export const prospectsApi = {
  list: (params?: { role_id?: string; status?: string; priority?: string }) =>
    api.get<Prospect[]>('/prospects/', { params }).then(r => r.data),
  get: (id: string) => api.get<Prospect>(`/prospects/${id}`).then(r => r.data),
  create: (data: Partial<Prospect>) => api.post<Prospect>('/prospects/', data).then(r => r.data),
  update: (id: string, data: Partial<Prospect>) => api.patch<Prospect>(`/prospects/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/prospects/${id}`).then(r => r.data),
  score: (id: string) => api.post<Prospect>(`/prospects/${id}/score`).then(r => r.data),
  scoreBatch: (ids: string[]) => api.post('/prospects/score-batch', ids).then(r => r.data),
}

// ─── Outreach ─────────────────────────────────────────────────────────────────

export const outreachApi = {
  generate: (prospectId: string, messageType: string) =>
    api.post<OutreachMessage>('/outreach/generate', { prospect_id: prospectId, message_type: messageType }).then(r => r.data),
  getProspectMessages: (prospectId: string) =>
    api.get<OutreachMessage[]>(`/outreach/prospect/${prospectId}`).then(r => r.data),
  markSent: (messageId: string) =>
    api.post<OutreachMessage>(`/outreach/mark-sent/${messageId}`).then(r => r.data),
  getDailyQueue: (roleId?: string) =>
    api.get<QueueItem[]>('/outreach/daily-queue', { params: roleId ? { role_id: roleId } : {} }).then(r => r.data),
  getFollowUpQueue: (roleId?: string) =>
    api.get<Prospect[]>('/outreach/follow-up-queue', { params: roleId ? { role_id: roleId } : {} }).then(r => r.data),
  generateFollowUp: (prospectId: string) =>
    api.post<OutreachMessage>('/outreach/generate-follow-up', { prospect_id: prospectId }).then(r => r.data),
  responseAssist: (prospectId: string, candidateMessage: string) =>
    api.post<ResponseAssist>('/outreach/response-assist', { prospect_id: prospectId, candidate_message: candidateMessage }).then(r => r.data),
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export const analyticsApi = {
  overview: () => api.get<AnalyticsOverview>('/analytics/overview').then(r => r.data),
  byRole: () => api.get('/analytics/by-role').then(r => r.data),
  statusBreakdown: () => api.get<Record<string, number>>('/analytics/status-breakdown').then(r => r.data),
  priorityBreakdown: () => api.get<Record<string, number>>('/analytics/priority-breakdown').then(r => r.data),
  insights: () => api.get('/analytics/insights').then(r => r.data),
}
