import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchModelDetails, streamPull, deleteModel as ollamaDeleteModel } from '../ollamaClient'
import { useI18n } from '../i18n/index'
import './ModelManager.css'

const TAG_MAP = {
  '빠름':   'mmTagFast',
  '초경량': 'mmTagUltraLight',
  '한국어': 'mmTagKorean',
  '추론':   'mmTagReasoning',
  '추천':   'mmTagRecommended',
  '코드':   'mmTagCode',
  '임베딩': 'mmTagEmbedding',
}

// Curated model catalog — uses i18n keys for group, desc, tags
const CATALOG = [
  {
    groupKey: 'mmGroupUltraLight',
    models: [
      { name: 'tinyllama:1.1b', ram: 0.8, descKey: 'mmDescTinyllama', tagKeys: ['mmTagFast'] },
      { name: 'qwen2.5:0.5b', ram: 0.7, descKey: 'mmDescQwen05b', tagKeys: ['mmTagUltraLight'] },
      { name: 'qwen2.5:1.5b', ram: 1.2, descKey: 'mmDescQwen15b', tagKeys: ['mmTagKorean'] },
      { name: 'llama3.2:1b', ram: 1.3, descKey: 'mmDescLlama1b', tagKeys: [] },
      { name: 'deepseek-r1:1.5b', ram: 1.2, descKey: 'mmDescDeepseek15b', tagKeys: ['mmTagReasoning'] },
      { name: 'gemma3:1b', ram: 0.9, descKey: 'mmDescGemma1b', tagKeys: [] },
    ],
  },
  {
    groupKey: 'mmGroupLight',
    models: [
      { name: 'gemma3:4b', ram: 2.5, descKey: 'mmDescGemma4b', tagKeys: ['mmTagRecommended'] },
      { name: 'qwen2.5:3b', ram: 2.0, descKey: 'mmDescQwen3b', tagKeys: ['mmTagKorean'] },
      { name: 'llama3.2:3b', ram: 2.0, descKey: 'mmDescLlama3b', tagKeys: [] },
      { name: 'phi3:mini', ram: 2.3, descKey: 'mmDescPhi3Mini', tagKeys: ['mmTagReasoning'] },
      { name: 'deepseek-r1:7b', ram: 4.4, descKey: 'mmDescDeepseek7b', tagKeys: ['mmTagReasoning'] },
      { name: 'mistral:7b', ram: 4.1, descKey: 'mmDescMistral7b', tagKeys: [] },
    ],
  },
  {
    groupKey: 'mmGroupMedium',
    models: [
      { name: 'llama3.1:8b', ram: 4.7, descKey: 'mmDescLlama8b', tagKeys: [] },
      { name: 'gemma2:9b', ram: 5.5, descKey: 'mmDescGemma9b', tagKeys: [] },
      { name: 'qwen2.5:7b', ram: 4.4, descKey: 'mmDescQwen7b', tagKeys: ['mmTagKorean'] },
      { name: 'deepseek-r1:8b', ram: 4.7, descKey: 'mmDescDeepseek8b', tagKeys: ['mmTagReasoning'] },
      { name: 'gemma3:12b', ram: 7.5, descKey: 'mmDescGemma12b', tagKeys: [] },
      { name: 'codegemma:7b', ram: 4.2, descKey: 'mmDescCodegemma', tagKeys: ['mmTagCode'] },
      { name: 'codellama:7b', ram: 4.1, descKey: 'mmDescCodellama', tagKeys: ['mmTagCode'] },
    ],
  },
  {
    groupKey: 'mmGroupOther',
    models: [
      { name: 'nomic-embed-text', ram: 0.3, descKey: 'mmDescNomicEmbed', tagKeys: ['mmTagEmbedding'] },
    ],
  },
]

function formatBytes(gb) {
  if (gb < 1) return `${Math.round(gb * 1024)}MB`
  return `${gb.toFixed(1)}GB`
}

function RamDot({ ram, available, t }) {
  if (available == null) return null
  const ok = available >= ram + 0.5
  const tight = available >= ram && available < ram + 1.5
  return (
    <span className={`ram-dot ${ok ? 'ok' : tight ? 'tight' : 'bad'}`} title={t('mmRamNeeded', { size: formatBytes(ram) })}>
      {ok ? '🟢' : tight ? '🟡' : '🔴'}
    </span>
  )
}

export default function ModelManager({ onClose, onModelsChange }) {
  const { t } = useI18n()
  const ollamaUrl = localStorage.getItem('ollama_url') || 'http://localhost:11434'
  const [installed, setInstalled] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pulling, setPulling] = useState({})
  const [customModel, setCustomModel] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const pullAbortRefs = useRef({})

  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  const fetchInstalled = useCallback(() => {
    setLoading(true)
    fetchModelDetails(ollamaUrl)
      .then((models) => { setInstalled(models); setLoading(false) })
      .catch(() => setLoading(false))
  }, [ollamaUrl])

  useEffect(() => {
    fetchInstalled()
  }, [fetchInstalled])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCloseRef.current() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      Object.values(pullAbortRefs.current).forEach((ctrl) => ctrl?.abort())
    }
  }, [])

  const pullModel = useCallback((modelName) => {
    if (pulling[modelName]) return
    setPulling((p) => ({ ...p, [modelName]: { percent: 0, status: t('mmConnecting') } }))

    const ctrl = new AbortController()
    pullAbortRefs.current[modelName] = ctrl

    ;(async () => {
      try {
        for await (const progress of streamPull(ollamaUrl, modelName, ctrl.signal)) {
          setPulling((p) => ({
            ...p,
            [modelName]: { percent: progress.percent, status: progress.status },
          }))
          if (progress.status === 'success') break
        }
        setPulling((p) => { const n = { ...p }; delete n[modelName]; return n })
        delete pullAbortRefs.current[modelName]
        fetchInstalled()
        onModelsChange?.()
      } catch (err) {
        if (err.name === 'AbortError') return
        setPulling((p) => { const n = { ...p }; delete n[modelName]; return n })
        alert(t('mmDownloadFailed', { msg: err.message }))
      }
    })()
  }, [pulling, fetchInstalled, onModelsChange, ollamaUrl, t])

  const deleteModel = useCallback(async (modelName) => {
    try {
      await ollamaDeleteModel(ollamaUrl, modelName)
    } catch {
      // ignore
    }
    setDeleteConfirm(null)
    fetchInstalled()
    onModelsChange?.()
  }, [fetchInstalled, onModelsChange, ollamaUrl])

  const installedNames = new Set(installed.map((m) => m.name))

  const filteredCatalog = CATALOG.map((group) => ({
    ...group,
    models: group.models.filter(
      (m) =>
        !search ||
        m.name.includes(search.toLowerCase()) ||
        t(m.descKey).includes(search) ||
        m.tagKeys.some((tk) => t(tk).includes(search))
    ),
  })).filter((g) => g.models.length > 0)

  return (
    <div className="mm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mm-panel">
        <div className="mm-header">
          <div className="mm-title">
            <span className="mm-title-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span>
            {t('mmTitle')}
          </div>
          <button className="mm-close" onClick={onClose}>✕</button>
        </div>

        <div className="mm-body">
          <section className="mm-section">
            <h3 className="mm-section-title">{t('mmInstalledTitle', { n: installed.length })}</h3>
            {loading ? (
              <div className="mm-loading">{t('mmLoading')}</div>
            ) : installed.length === 0 ? (
              <div className="mm-empty">{t('mmEmpty')}</div>
            ) : (
              <div className="installed-list">
                {installed.map((m) => (
                  <div key={m.name} className="installed-item">
                    <div className="installed-info">
                      <span className="installed-name">{m.name}</span>
                      <span className="installed-size">{t('mmSizeStored', { size: formatBytes(m.size_gb) })}</span>
                      <span className="installed-ram">RAM ~{formatBytes(m.estimated_ram_gb)}</span>
                    </div>
                    {deleteConfirm === m.name ? (
                      <div className="delete-confirm">
                        <span>{t('mmDeleteQuestion')}</span>
                        <button className="btn-confirm-yes" onClick={() => deleteModel(m.name)}>{t('mmDelete')}</button>
                        <button className="btn-confirm-no" onClick={() => setDeleteConfirm(null)}>{t('mmCancel')}</button>
                      </div>
                    ) : (
                      <button className="btn-delete" onClick={() => setDeleteConfirm(m.name)}><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h12"/><path d="M5 4V2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V4"/><path d="M6.5 7v4M9.5 7v4"/><path d="M3 4l1 9.5a1 1 0 0 0 1 .5h6a1 1 0 0 0 1-.5L13 4"/></svg></button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mm-section">
            <h3 className="mm-section-title">{t('mmAddTitle')}</h3>
            <div className="mm-search-row">
              <input
                className="mm-search"
                placeholder={t('mmSearchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="mm-custom-row">
              <input
                className="mm-custom-input"
                placeholder={t('mmCustomPlaceholder')}
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customModel.trim()) {
                    pullModel(customModel.trim())
                    setCustomModel('')
                  }
                }}
              />
              <button
                className="btn-pull-custom"
                disabled={!customModel.trim() || !!pulling[customModel.trim()]}
                onClick={() => { pullModel(customModel.trim()); setCustomModel('') }}
              >
                {t('mmDownload')}
              </button>
            </div>
          </section>

          <section className="mm-section mm-section--catalog">
            {filteredCatalog.map((group) => (
              <div key={group.groupKey} className="catalog-group">
                <div className="catalog-group-title">{t(group.groupKey)}</div>
                <div className="catalog-grid">
                  {group.models.map((m) => {
                    const isInstalled = installedNames.has(m.name)
                    const isPulling = !!pulling[m.name]
                    const pullInfo = pulling[m.name]

                    return (
                      <div key={m.name} className={`catalog-card ${isInstalled ? 'installed' : ''}`}>
                        <div className="catalog-card-top">
                          <RamDot ram={m.ram} available={null} t={t} />
                          <span className="catalog-name">{m.name}</span>
                          {isInstalled && <span className="catalog-badge-installed">{t('mmInstalled')}</span>}
                          {m.tagKeys.map((tk) => (
                            <span key={tk} className={`catalog-tag tag-${tk}`}>{t(tk)}</span>
                          ))}
                        </div>
                        <p className="catalog-desc">{t(m.descKey)}</p>
                        <div className="catalog-footer">
                          <span className="catalog-ram">~{formatBytes(m.ram)}</span>
                          {isPulling ? (
                            <div className="pull-progress-inline">
                              <div className="pull-bar-track">
                                <div className="pull-bar-fill" style={{ width: `${pullInfo.percent}%` }} />
                              </div>
                              <span className="pull-pct">{pullInfo.percent > 0 ? `${pullInfo.percent}%` : pullInfo.status}</span>
                            </div>
                          ) : isInstalled ? (
                            <span className="catalog-installed-mark">{t('mmInstalledDone')}</span>
                          ) : (
                            <button
                              className="btn-pull"
                              onClick={() => pullModel(m.name)}
                            >
                              {t('mmPullDownload')}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}
