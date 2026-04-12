import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { listWorkflows, deleteWorkflow, isConfigured } from '../workflowApi'
import { useI18n } from '../i18n/index'
import './WorkflowManager.css'

export default function WorkflowManager({ onLoad, onClose }) {
  const { t } = useI18n()
  const { getToken } = useAuth()
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading]     = useState(true)
  const [deleting, setDeleting]   = useState(null)
  const [error, setError]         = useState(null)

  const configured = isConfigured()

  const timeAgo = useCallback((ts) => {
    const diff = Date.now() - ts
    const m = Math.floor(diff / 60000)
    if (m < 1) return t('justNow')
    if (m < 60) return t('minutesAgo').replace('{n}', m)
    const h = Math.floor(m / 60)
    if (h < 24) return t('hoursAgo').replace('{n}', h)
    return t('daysAgo').replace('{n}', Math.floor(h / 24))
  }, [t])

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
    if (!window.confirm(t('confirmDeleteWf').replace('{name}', name))) return
    setDeleting(id)
    try {
      const token = await getToken()
      await deleteWorkflow(id, token)
      setWorkflows((wfs) => wfs.filter((w) => w.id !== id))
    } catch {
      alert(t('deleteFailed'))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="wm-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="wm-panel">
        <div className="wm-header">
          <h2 className="wm-title">{t('savedWorkflows')}</h2>
          <button className="wm-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>
          </button>
        </div>

        <div className="wm-body">
          {!configured && (
            <div className="wm-unconfigured">
              <div className="wm-unconf-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg></div>
              <p className="wm-unconf-title">{t('cloudNotConnected')}</p>
              <p className="wm-unconf-desc">{t('cloudNotConnectedDesc')}</p>
            </div>
          )}

          {configured && loading && (
            <div className="wm-loading">
              <span className="wm-spinner" />
              <span>{t('loading')}</span>
            </div>
          )}

          {configured && error && (
            <div className="wm-error">
              <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> {error}</span>
              <button onClick={fetchList}>{t('retry')}</button>
            </div>
          )}

          {configured && !loading && !error && workflows.length === 0 && (
            <div className="wm-empty">
              <div className="wm-empty-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
              <p>{t('noSavedWorkflows')}</p>
              <p className="wm-empty-sub">{t('noSavedSub')}</p>
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
                    title={t('deleteTitle')}
                  >
                    {deleting === wf.id ? '…' : <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>}
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
