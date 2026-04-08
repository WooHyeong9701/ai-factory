import { useState, useEffect, useCallback } from 'react'
import { useAuth as _useAuth } from '@clerk/clerk-react'
import './AdminDashboard.css'

const HAS_CLERK = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const noopAuth = { getToken: async () => null }
function useAuth() { return HAS_CLERK ? _useAuth() : noopAuth }

const CF_URL = (import.meta.env.VITE_CF_WORKER_URL || '').replace(/\/$/, '')

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="admin-stat" style={{ '--stat-accent': accent }}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

function MiniChart({ data }) {
  if (!data.length) return (
    <div className="mini-chart">
      <div className="chart-empty">아직 방문 데이터가 없습니다</div>
    </div>
  )

  // Fill 30 days using UTC to match the Worker's day_bucket calculation
  const nowUTC = Date.now()
  const todayBucket = Math.floor(nowUTC / 86400000)
  const filled = []
  for (let i = 29; i >= 0; i--) {
    const bucket = todayBucket - i
    const key = new Date(bucket * 86400000).toISOString().slice(0, 10)
    const found = data.find(r => r.date === key)
    filled.push(found || { date: key, visitors: 0, page_views: 0 })
  }
  const maxPV = Math.max(...filled.map(d => d.page_views), 1)

  return (
    <div className="mini-chart">
      <div className="chart-bars">
        {filled.map((d, i) => (
          <div key={i} className="chart-col" title={`${d.date}: ${d.visitors}명 / ${d.page_views}PV`}>
            <div className="chart-bar-stack">
              {d.page_views > 0 && (
                <div
                  className="chart-bar-pv"
                  style={{ height: `${(d.page_views / maxPV) * 100}%` }}
                />
              )}
              {d.visitors > 0 && (
                <div
                  className="chart-bar"
                  style={{ height: `${(d.visitors / maxPV) * 100}%` }}
                />
              )}
            </div>
            <div className="chart-date">{d.date.slice(5)}</div>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <span className="legend-item"><span className="legend-dot accent" /> 방문자</span>
        <span className="legend-item"><span className="legend-dot pv" /> 페이지뷰</span>
      </div>
    </div>
  )
}

function timeAgo(ts) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1)  return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

export default function AdminDashboard({ onClose }) {
  const { getToken } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const r = await fetch(`${CF_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (r.status === 403) throw new Error('관리자 권한이 없습니다')
      if (!r.ok) throw new Error('통계를 불러올 수 없습니다')
      setStats(await r.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    fetchStats()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fetchStats, onClose])

  return (
    <div className="admin-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-panel">
        <div className="admin-header">
          <h2 className="admin-title">관리자 대시보드</h2>
          <div className="admin-header-actions">
            <button className="admin-refresh" onClick={fetchStats} title="새로고침">↻</button>
            <button className="admin-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="admin-body">
          {loading && (
            <div className="admin-loading">
              <span className="admin-spinner" />
              <span>통계 불러오는 중...</span>
            </div>
          )}

          {error && (
            <div className="admin-error">
              <span>⚠️ {error}</span>
              <button onClick={fetchStats}>다시 시도</button>
            </div>
          )}

          {stats && !loading && (
            <>
              {/* Summary cards */}
              <div className="admin-stats-grid">
                <StatCard label="오늘 방문자" value={stats.today_visitors} accent="#5b8df8" />
                <StatCard label="이번 주" value={stats.week_visitors} accent="#a855f7" />
                <StatCard label="이번 달" value={stats.month_visitors} accent="#06d6a0" />
                <StatCard label="총 방문" value={stats.total_visits} accent="#f59e0b" />
                <StatCard label="총 사용자" value={stats.total_users} accent="#ec4899" />
                <StatCard label="총 워크플로우" value={stats.total_workflows} accent="#10b981" />
              </div>

              {/* Recent visits */}
              <div className="admin-section">
                <h3 className="admin-section-title">최근 방문 기록</h3>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>방문자 ID</th>
                        <th>사용자</th>
                        <th>경로</th>
                        <th>시간</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats.recent_visits || []).map((v, i) => (
                        <tr key={i}>
                          <td className="mono">{v.visitor_id}</td>
                          <td className="mono">{v.user_id || '-'}</td>
                          <td>{v.path}</td>
                          <td className="time-cell">{timeAgo(v.time)}</td>
                        </tr>
                      ))}
                      {(!stats.recent_visits || stats.recent_visits.length === 0) && (
                        <tr><td colSpan={4} className="empty-row">방문 기록 없음</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
