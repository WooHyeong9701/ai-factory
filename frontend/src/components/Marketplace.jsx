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
  { key: 'all',         icon: '🌐' },
  { key: 'content',     icon: '✍️' },
  { key: 'dev',         icon: '💻' },
  { key: 'data',        icon: '📊' },
  { key: 'marketing',   icon: '📢' },
  { key: 'education',   icon: '📚' },
  { key: 'automation',  icon: '⚙️' },
  { key: 'creative',    icon: '🎨' },
  { key: 'general',     icon: '📦' },
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
          <span>❤️ {data.like_count || 0}</span>
          <span>📥 {data.fork_count || 0}</span>
          <span>👁️ {data.view_count || 0}</span>
          <span>🧩 {data.node_count || 0} {t('nodes')}</span>
        </div>

        <div className="mp-detail-actions">
          <button
            className={`mp-like-btn ${data.liked ? 'liked' : ''}`}
            onClick={handleLike}
            disabled={!isSignedIn}
            title={!isSignedIn ? t('mp_loginToLike') : ''}
          >
            {data.liked ? '❤️' : '🤍'} {data.liked ? t('mp_liked') : t('mp_like')}
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
        <h2>🌐 {t('mp_shareTitle')}</h2>
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
            <h1>🏪 {t('mp_title')}</h1>
            <span className="mp-header-count">{total} {t('mp_workflows')}</span>
          </div>
          <button className="mp-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="mp-tabs">
          <button className={`mp-tab ${tab === 'browse' ? 'active' : ''}`} onClick={() => setTab('browse')}>
            🌐 {t('mp_browse')}
          </button>
          {isSignedIn && (
            <button className={`mp-tab ${tab === 'mine' ? 'active' : ''}`} onClick={() => setTab('mine')}>
              📤 {t('mp_myShared')}
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
              <div className="mp-sort">
                {SORT_OPTIONS.map(s => (
                  <button
                    key={s}
                    className={`mp-sort-btn ${sort === s ? 'active' : ''}`}
                    onClick={() => { setSort(s); setPage(1) }}
                  >
                    {s === 'popular' ? '🔥' : s === 'recent' ? '🕐' : '📥'} {t(`mp_sort_${s}`)}
                  </button>
                ))}
              </div>
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
                            {wf.liked ? '❤️' : '🤍'} {wf.like_count || 0}
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
                <span className="mp-empty-icon">📤</span>
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
                        <span>❤️ {wf.like_count}</span>
                        <span>📥 {wf.fork_count}</span>
                        <span>👁️ {wf.view_count}</span>
                        <span>{timeAgo(wf.updated_at, t)}</span>
                      </div>
                    </div>
                    <button className="mp-mine-delete" onClick={() => handleDeleteMine(wf.id)}>
                      🗑️
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
