import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { listWorkflows, deleteWorkflow, isConfigured } from '../workflowApi'
import './WorkflowManager.css'

function timeAgo(ts) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1)  return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

export default function WorkflowManager({ onLoad, onClose }) {
  const { getToken } = useAuth()
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading]     = useState(true)
  const [deleting, setDeleting]   = useState(null)
  const [error, setError]         = useState(null)

  const configured = isConfigured()

  const fetchList = useCallback(async () => {
    if (!configured) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      setWorkflows(await listWorkflows(token))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [configured, getToken])

  useEffect(() => {
    fetchList()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fetchList, onClose])

  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}" 워크플로우를 삭제할까요?`)) return
    setDeleting(id)
    try {
      const token = await getToken()
      await deleteWorkflow(id, token)
      setWorkflows((wfs) => wfs.filter((w) => w.id !== id))
    } catch {
      alert('삭제 실패')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="wm-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="wm-panel">
        <div className="wm-header">
          <h2 className="wm-title">저장된 워크플로우</h2>
          <button className="wm-close" onClick={onClose}>✕</button>
        </div>

        <div className="wm-body">
          {!configured && (
            <div className="wm-unconfigured">
              <div className="wm-unconf-icon">☁️</div>
              <p className="wm-unconf-title">클라우드 저장소가 연결되지 않았습니다</p>
              <p className="wm-unconf-desc">
                Cloudflare Worker를 배포한 후<br />
                <code>VITE_CF_WORKER_URL</code> 환경변수를 설정하세요
              </p>
            </div>
          )}

          {configured && loading && (
            <div className="wm-loading">
              <span className="wm-spinner" />
              <span>불러오는 중...</span>
            </div>
          )}

          {configured && error && (
            <div className="wm-error">
              <span>⚠️ {error}</span>
              <button onClick={fetchList}>다시 시도</button>
            </div>
          )}

          {configured && !loading && !error && workflows.length === 0 && (
            <div className="wm-empty">
              <div className="wm-empty-icon">📂</div>
              <p>저장된 워크플로우가 없습니다</p>
              <p className="wm-empty-sub">현재 워크플로우를 저장하면 여기에 표시됩니다</p>
            </div>
          )}

          {configured && !loading && !error && workflows.length > 0 && (
            <div className="wm-list">
              {workflows.map((wf) => (
                <div key={wf.id} className="wm-item">
                  <button className="wm-item-body" onClick={() => onLoad(wf.id)}>
                    <span className="wm-item-name">{wf.name}</span>
                    <span className="wm-item-time">{timeAgo(wf.updated_at)}</span>
                  </button>
                  <button
                    className="wm-item-delete"
                    onClick={() => handleDelete(wf.id, wf.name)}
                    disabled={deleting === wf.id}
                    title="삭제"
                  >
                    {deleting === wf.id ? '…' : '✕'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
