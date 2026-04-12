import { useState, useEffect, useCallback, useRef } from 'react'
import { useI18n } from '../i18n/index'
import {
  browseMarketplace,
  toggleLike,
  forkWorkflow,
  getSharedWorkflow,
  deleteSharedWorkflow,
  getMyShared,
} from '../marketplaceApi'
import './Marketplace.css'

const CATEGORIES = [
  { key: 'all',         icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
  { key: 'content',     icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg> },
  { key: 'dev',         icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> },
  { key: 'data',        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { key: 'marketing',   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  { key: 'education',   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
  { key: 'automation',  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
  { key: 'creative',    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19c-4.42 0-8-1.79-8-4s3.58-4 8-4 8 1.79 8 4"/><path d="M12 15V3"/><circle cx="12" cy="3" r="1"/><path d="M7 7l-2 2"/><path d="M17 7l2 2"/></svg> },
  { key: 'general',     icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 16 21 21 3 21 3 16"/><path d="M3 8l9-5 9 5"/><line x1="12" y1="3" x2="12" y2="21"/></svg> },
]

const SORT_OPTIONS = ['popular', 'recent', 'most_forked']

function timeAgo(ts, t) {
  const diff = Date.now() - ts
  if (diff < 60000) return t('justNow')
  if (diff < 3600000) return t('minutesAgo', { n: Math.floor(diff / 60000) })
  if (diff < 86400000) return t('hoursAgo', { n: Math.floor(diff / 3600000) })
  return t('daysAgo', { n: Math.floor(diff / 86400000) })
}

/* ── Workflow detail modal ─────────────────────────────────────────────── */
function WorkflowDetail({ wf, getToken, onClose, onImport, isSignedIn, t }) {
  const [data, setData] = useState(wf)
  const [liking, setLiking] = useState(false)

  const handleLike = async () => {
    if (!isSignedIn || !getToken || liking) return
    setLiking(true)
    try {
      const tk = await getToken()
      const res = await toggleLike(data.id, tk)
      setData(prev => ({
        ...prev,
        liked: res.liked,
        like_count: prev.like_count + (res.liked ? 1 : -1),
      }))
    } catch { /* ignore */ }
    setLiking(false)
  }

  const handleImport = async () => {
    try {
      const tk = isSignedIn && getToken ? await getToken() : null
      const full = await getSharedWorkflow(data.id, tk)
      if (isSignedIn && tk) {
        await forkWorkflow(data.id, tk)
      }
      onImport(full)
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div className="mp-detail-overlay" onClick={onClose}>
      <div className="mp-detail" onClick={e => e.stopPropagation()}>
        <button className="mp-detail-close" onClick={onClose}>✕</button>

        <div className="mp-detail-header">
          <h2>{data.name}</h2>
          <div className="mp-detail-meta">
            <span className="mp-detail-author">
              {data.user_avatar && <img src={data.user_avatar} alt="" className="mp-avatar-sm" />}
              {data.user_name || t('mp_anonymous')}
            </span>
            <span className="mp-detail-time">{timeAgo(data.created_at, t)}</span>
          </div>
        </div>

        <p className="mp-detail-desc">{data.description || t('mp_noDescription')}</p>

        <div className="mp-detail-tags">
          {(data.tags || []).map(tag => (
            <span key={tag} className="mp-tag">#{tag}</span>
          ))}
        </div>

        <div className="mp-detail-stats">
          <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> {data.like_count || 0}</span>
          <span>📥 {data.fork_count || 0}</span>
          <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> {data.view_count || 0}</span>
          <span>🧩 {data.node_count || 0} {t('nodes')}</span>
        </div>

        <div className="mp-detail-actions">
          <button
            className={`mp-like-btn ${data.liked ? 'liked' : ''}`}
            onClick={handleLike}
            disabled={!isSignedIn}
            title={!isSignedIn ? t('mp_loginToLike') : ''}
          >
            {data.liked ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>} {data.liked ? t('mp_liked') : t('mp_like')}
          </button>
          <button className="mp-import-btn" onClick={handleImport}>
            📥 {t('mp_import')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Share dialog ──────────────────────────────────────────────────────── */
export function ShareDialog({ nodes, edges, workflowId, workflowName, userName, userAvatar, token, getToken, onClose, onPublished, t }) {
  const [name, setName] = useState(workflowName || '')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [tagsInput, setTagsInput] = useState('')
  const [publishing, setPublishing] = useState(false)
  const nameRef = useRef(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  const handlePublish = async () => {
    if (!name.trim() || publishing) return
    setPublishing(true)
    try {
      const tags = tagsInput.split(',').map(s => s.trim()).filter(Boolean)
      const { publishWorkflow } = await import('../marketplaceApi')
      await publishWorkflow({
        workflow_id: workflowId || '',
        name: name.trim(),
        description: description.trim(),
        category,
        tags,
        user_name: userName || '',
        user_avatar: userAvatar || '',
        nodes,
        edges,
      }, token || (getToken ? await getToken() : null))
      onPublished?.()
      onClose()
    } catch (e) {
      alert(e.message)
    }
    setPublishing(false)
  }

  return (
    <div className="mp-share-overlay" onClick={onClose}>
      <div className="mp-share" onClick={e => e.stopPropagation()}>
        <h2>{t('mp_shareTitle')}</h2>
        <p className="mp-share-sub">{t('mp_shareSub')}</p>

        <label>{t('mp_wfName')}</label>
        <input
          ref={nameRef}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('mp_wfNamePlaceholder')}
          maxLength={80}
        />

        <label>{t('mp_description')}</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={t('mp_descPlaceholder')}
          rows={4}
          maxLength={500}
        />

        <label>{t('mp_category')}</label>
        <div className="mp-share-cats">
          {CATEGORIES.filter(c => c.key !== 'all').map(c => (
            <button
              key={c.key}
              className={`mp-cat-chip ${category === c.key ? 'active' : ''}`}
              onClick={() => setCategory(c.key)}
            >
              {c.icon} {t(`mp_cat_${c.key}`)}
            </button>
          ))}
        </div>

        <label>{t('mp_tags')}</label>
        <input
          value={tagsInput}
          onChange={e => setTagsInput(e.target.value)}
          placeholder={t('mp_tagsPlaceholder')}
        />

        <div className="mp-share-info">
          🧩 {nodes.length} {t('nodes')} · {edges.length} {t('connections')}
        </div>

        <div className="mp-share-actions">
          <button className="mp-cancel-btn" onClick={onClose}>{t('cancel')}</button>
          <button
            className="mp-publish-btn"
            onClick={handlePublish}
            disabled={!name.trim() || publishing}
          >
            {publishing ? t('mp_publishing') : `🚀 ${t('mp_publish')}`}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Marketplace component ────────────────────────────────────────── */
export default function Marketplace({ onClose, onImport, isSignedIn, token, getToken }) {
  const { t } = useI18n()
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('popular')
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedWf, setSelectedWf] = useState(null)
  const [tab, setTab] = useState('browse') // browse | mine
  const [myWorkflows, setMyWorkflows] = useState([])
  const [myLoading, setMyLoading] = useState(false)
  const searchTimerRef = useRef(null)

  const fetchData = useCallback(async (opts = {}) => {
    setLoading(true)
    try {
      const tk = isSignedIn && getToken ? await getToken() : null
      const res = await browseMarketplace({
        sort: opts.sort ?? sort,
        category: opts.category ?? category,
        q: opts.q ?? search,
        page: opts.page ?? page,
      }, tk)
      setWorkflows(res.workflows || [])
      setTotalPages(res.pages || 1)
      setTotal(res.total || 0)
    } catch { setWorkflows([]) }
    setLoading(false)
  }, [sort, category, search, page, isSignedIn, getToken])

  useEffect(() => { fetchData() }, [sort, category, search, page])

  const fetchMyWorkflows = useCallback(async () => {
    if (!isSignedIn || !getToken) return
    setMyLoading(true)
    try {
      const tk = await getToken()
      const res = await getMyShared(tk)
      setMyWorkflows(res.workflows || [])
    } catch { setMyWorkflows([]) }
    setMyLoading(false)
  }, [isSignedIn, getToken])

  useEffect(() => {
    if (tab === 'mine') fetchMyWorkflows()
  }, [tab])

  const handleSearch = (val) => {
    setSearchInput(val)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setSearch(val)
      setPage(1)
    }, 400)
  }

  const handleLike = async (wf, e) => {
    e.stopPropagation()
    if (!isSignedIn || !getToken) return
    try {
      const tk = await getToken()
      const res = await toggleLike(wf.id, tk)
      setWorkflows(prev => prev.map(w =>
        w.id === wf.id ? { ...w, liked: res.liked, like_count: w.like_count + (res.liked ? 1 : -1) } : w
      ))
    } catch { /* ignore */ }
  }

  const handleImport = async (fullWf) => {
    onImport(fullWf)
    onClose()
  }

  const handleDeleteMine = async (id) => {
    if (!confirm(t('mp_confirmDelete'))) return
    try {
      const tk = await getToken()
      await deleteSharedWorkflow(id, tk)
      setMyWorkflows(prev => prev.filter(w => w.id !== id))
    } catch (e) { alert(e.message) }
  }

  const selectedWfRef = useRef(selectedWf)
  selectedWfRef.current = selectedWf

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedWfRef.current) {
          setSelectedWf(null)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="mp-overlay">
      <div className="mp-container">
        {/* Header */}
        <div className="mp-header">
          <div className="mp-header-left">
            <h1>{t('mp_title')}</h1>
            <span className="mp-header-count">{total} {t('mp_workflows')}</span>
          </div>
          <button className="mp-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="mp-tabs">
          <button className={`mp-tab ${tab === 'browse' ? 'active' : ''}`} onClick={() => setTab('browse')}>
            {t('mp_browse')}
          </button>
          {isSignedIn && (
            <button className={`mp-tab ${tab === 'mine' ? 'active' : ''}`} onClick={() => setTab('mine')}>
              {t('mp_myShared')}
            </button>
          )}
        </div>

        {tab === 'browse' ? (
          <>
            {/* Search + Sort */}
            <div className="mp-toolbar">
              <div className="mp-search-wrap">
                <span className="mp-search-icon">🔍</span>
                <input
                  className="mp-search"
                  value={searchInput}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder={t('mp_searchPlaceholder')}
                />
                {searchInput && (
                  <button className="mp-search-clear" onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}>✕</button>
                )}
              </div>
              <select
                className="mp-sort-select"
                value={sort}
                onChange={e => { setSort(e.target.value); setPage(1) }}
              >
                {SORT_OPTIONS.map(s => (
                  <option key={s} value={s}>{t(`mp_sort_${s}`)}</option>
                ))}
              </select>
            </div>

            {/* Categories */}
            <div className="mp-categories">
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  className={`mp-cat-btn ${category === c.key ? 'active' : ''}`}
                  onClick={() => { setCategory(c.key); setPage(1) }}
                >
                  {c.icon} {t(`mp_cat_${c.key}`)}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="mp-grid-wrap">
              {loading ? (
                <div className="mp-loading">
                  <div className="mp-spinner" />
                  <p>{t('loading')}</p>
                </div>
              ) : workflows.length === 0 ? (
                <div className="mp-empty">
                  <span className="mp-empty-icon">📭</span>
                  <p>{t('mp_noResults')}</p>
                </div>
              ) : (
                <div className="mp-grid">
                  {workflows.map(wf => (
                    <div key={wf.id} className="mp-card" onClick={() => setSelectedWf(wf)}>
                      <div className="mp-card-top">
                        <span className="mp-card-cat">{CATEGORIES.find(c => c.key === wf.category)?.icon || '📦'}</span>
                        <span className="mp-card-nodes">🧩 {wf.node_count}</span>
                      </div>
                      <h3 className="mp-card-name">{wf.name}</h3>
                      <p className="mp-card-desc">{wf.description || t('mp_noDescription')}</p>
                      <div className="mp-card-tags">
                        {(wf.tags || []).slice(0, 3).map(tag => (
                          <span key={tag} className="mp-tag-sm">#{tag}</span>
                        ))}
                      </div>
                      <div className="mp-card-footer">
                        <div className="mp-card-author">
                          {wf.user_avatar && <img src={wf.user_avatar} alt="" className="mp-avatar-xs" />}
                          <span>{wf.user_name || t('mp_anonymous')}</span>
                        </div>
                        <div className="mp-card-stats">
                          <button
                            className={`mp-heart ${wf.liked ? 'liked' : ''}`}
                            onClick={e => handleLike(wf, e)}
                            title={!isSignedIn ? t('mp_loginToLike') : ''}
                          >
                            {wf.liked ? <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>} {wf.like_count || 0}
                          </button>
                          <span className="mp-fork-count">📥 {wf.fork_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mp-pagination">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</button>
                <span>{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>→</button>
              </div>
            )}
          </>
        ) : (
          /* My shared tab */
          <div className="mp-mine-wrap">
            {myLoading ? (
              <div className="mp-loading"><div className="mp-spinner" /><p>{t('loading')}</p></div>
            ) : myWorkflows.length === 0 ? (
              <div className="mp-empty">
                <span className="mp-empty-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></span>
                <p>{t('mp_noShared')}</p>
                <p className="mp-empty-sub">{t('mp_noSharedSub')}</p>
              </div>
            ) : (
              <div className="mp-mine-list">
                {myWorkflows.map(wf => (
                  <div key={wf.id} className="mp-mine-item">
                    <div className="mp-mine-info">
                      <h3>{wf.name}</h3>
                      <p>{wf.description}</p>
                      <div className="mp-mine-stats">
                        <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> {wf.like_count}</span>
                        <span>📥 {wf.fork_count}</span>
                        <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> {wf.view_count}</span>
                        <span>{timeAgo(wf.updated_at, t)}</span>
                      </div>
                    </div>
                    <button className="mp-mine-delete" onClick={() => handleDeleteMine(wf.id)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Detail modal */}
        {selectedWf && (
          <WorkflowDetail
            wf={selectedWf}
            getToken={getToken}
            onClose={() => setSelectedWf(null)}
            onImport={handleImport}
            isSignedIn={isSignedIn}
            t={t}
          />
        )}
      </div>
    </div>
  )
}
