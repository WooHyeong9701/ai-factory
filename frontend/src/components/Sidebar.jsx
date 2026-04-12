import { useState, useEffect, useCallback } from 'react'
import './Sidebar.css'
import { UTILITY_KINDS } from './UtilityNode'
import { useI18n } from '../i18n/index'

const STORAGE_KEY = 'custom_node_templates'

export function loadCustomTemplates() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch { return [] }
}

export function saveCustomTemplate(tpl) {
  const list = loadCustomTemplates()
  list.push({ ...tpl, id: Date.now().toString() })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  return list
}

export function deleteCustomTemplate(id) {
  const list = loadCustomTemplates().filter((t) => t.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  return list
}

/* ── SVG Icons ── */
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)

const IconSpeaker = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 010 7.07" />
    <path d="M19.07 4.93a10 10 0 010 14.14" />
  </svg>
)

const IconBrush = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.37 2.63L14 7l-1.59-1.59a2 2 0 00-2.82 0L8 7l9 9 1.59-1.59a2 2 0 000-2.82L17 10l4.37-4.37a2.12 2.12 0 10-3-3z" />
    <path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7" />
  </svg>
)

const IconSave = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
)

const IconFilm = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="2.18" />
    <line x1="7" y1="2" x2="7" y2="22" />
    <line x1="17" y1="2" x2="17" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="2" y1="7" x2="7" y2="7" />
    <line x1="2" y1="17" x2="7" y2="17" />
    <line x1="17" y1="7" x2="22" y2="7" />
    <line x1="17" y1="17" x2="22" y2="17" />
  </svg>
)

const IconUpload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

const IconBranch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="3" x2="6" y2="15" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M18 9a9 9 0 01-9 9" />
  </svg>
)

const IconRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </svg>
)

const IconGlobe = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>
)

const IconSend = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)

const IconHexagon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16.05V7.95a2 2 0 00-1-1.73l-7-4.03a2 2 0 00-2 0l-7 4.03a2 2 0 00-1 1.73v8.1a2 2 0 001 1.73l7 4.03a2 2 0 002 0l7-4.03a2 2 0 001-1.73z" />
  </svg>
)

const IconZap = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

const IconGrid = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
)

const IconCube = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
)

const UTILITY_ITEMS = [
  { labelKey: 'taskList',      icon: <IconCheck />,   nodeType: 'taskListNode', kind: null },
  { labelKey: 'tts',           icon: <IconSpeaker />, nodeType: 'utilityNode',  kind: 'tts' },
  { labelKey: 'imageGen',      icon: <IconBrush />,   nodeType: 'utilityNode',  kind: 'image_gen' },
  { labelKey: 'fileSave',      icon: <IconSave />,    nodeType: 'utilityNode',  kind: 'file_save' },
  { labelKey: 'videoCompose',  icon: <IconFilm />,    nodeType: 'utilityNode',  kind: 'video_compose' },
  { labelKey: 'youtubeUpload', icon: <IconUpload />,  nodeType: 'utilityNode',  kind: 'youtube_upload' },
  { labelKey: 'branch',        icon: <IconBranch />,  nodeType: 'utilityNode',  kind: 'branch' },
  { labelKey: 'loop',          icon: <IconRefresh />, nodeType: 'utilityNode',  kind: 'loop' },
  { labelKey: 'apiRequest',    icon: <IconGlobe />,   nodeType: 'utilityNode',  kind: 'api_request' },
  { labelKey: 'webhookOut',    icon: <IconSend />,    nodeType: 'utilityNode',  kind: 'webhook_out' },
]

function getDefaultConfig(kind) {
  if (!kind) return {}
  const kd = UTILITY_KINDS[kind]
  if (!kd) return {}
  const config = {}
  kd.configFields.forEach(f => {
    if (f.default !== undefined) config[f.key] = f.default
  })
  return config
}

function onDragStart(event, template) {
  event.dataTransfer.setData('application/reactflow-node', JSON.stringify(template))
  event.dataTransfer.effectAllowed = 'move'
}

export default function Sidebar({ onOpenModelManager, onOpenMarketplace }) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const [customTemplates, setCustomTemplates] = useState(loadCustomTemplates)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  useEffect(() => {
    const handler = () => setCustomTemplates(loadCustomTemplates())
    window.addEventListener('custom-templates-changed', handler)
    return () => window.removeEventListener('custom-templates-changed', handler)
  }, [])

  const handleDelete = useCallback((id) => {
    const updated = deleteCustomTemplate(id)
    setCustomTemplates(updated)
    setConfirmDeleteId(null)
    window.dispatchEvent(new Event('custom-templates-changed'))
  }, [])

  return (
    <aside className={`sidebar ${expanded ? 'expanded' : ''}`}>
      {/* ── 상단 고정 ── */}
      <div className="sb-top">
        <div className="sb-header">
          <span className="sb-title">{t('nodePalette')}</span>
          <button
            className="sb-expand-btn"
            onClick={() => setExpanded(v => !v)}
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '«' : '»'}
          </button>
        </div>

        {/* 노드 박스 — 항상 상단 고정 */}
        <div className="sb-node-box">
          <div
            className="sb-node-item"
            draggable
            onDragStart={(e) => onDragStart(e, {
              nodeType: 'agentNode',
              name: 'Agent',
              role: '',
              return_type: 'text',
            })}
          >
            <span className="sb-node-icon"><IconHexagon /></span>
            <span className="sb-node-label">{t('nodeLabel')}</span>
          </div>
        </div>
      </div>

      {/* ── 스크롤 영역 (커스텀 + 유틸리티) ── */}
      <div className="sb-scroll">
        {/* 커스텀 노드 */}
        <section className="sb-section">
          <div className="sb-section-header">{t('customNodes')}</div>
          <div className={`sb-items ${expanded ? 'sb-grid' : ''}`}>
            {customTemplates.length === 0 ? (
              <div className="sb-empty">{t('noCustomNodes')}</div>
            ) : customTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="sb-item sb-item--custom"
                draggable
                onDragStart={(e) => onDragStart(e, {
                  nodeType: 'agentNode',
                  name: tpl.name,
                  role: tpl.role,
                  return_type: tpl.return_type,
                  model: tpl.model,
                  temperature: tpl.temperature,
                  top_p: tpl.top_p,
                  top_k: tpl.top_k,
                  max_tokens: tpl.max_tokens,
                  repeat_penalty: tpl.repeat_penalty,
                  seed: tpl.seed,
                })}
              >
                <span className="sb-item-icon"><IconZap /></span>
                <span className="sb-item-label">{tpl.name || 'Custom'}</span>
                {confirmDeleteId === tpl.id ? (
                  <span className="sb-del-confirm">
                    <button className="sb-del-yes" onClick={(e) => { e.stopPropagation(); handleDelete(tpl.id) }}>✓</button>
                    <button className="sb-del-no" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null) }}>✕</button>
                  </span>
                ) : (
                  <button
                    className="sb-del-btn"
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(tpl.id) }}
                    title={t('delete')}
                  >×</button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 유틸리티 노드 */}
        <section className="sb-section">
          <div className="sb-section-header">{t('utilityNodes')}</div>
          <div className={`sb-items ${expanded ? 'sb-grid' : ''}`}>
            {UTILITY_ITEMS.map((item) => {
              const label = t(item.labelKey)
              const isTask = item.nodeType === 'taskListNode'
              const isUtil = item.nodeType === 'utilityNode'
              return (
                <div
                  key={item.labelKey}
                  className={`sb-item ${isTask ? 'sb-item--task' : ''} ${isUtil ? 'sb-item--util' : ''}`}
                  draggable
                  onDragStart={(e) => onDragStart(e, {
                    nodeType: item.nodeType,
                    name: label,
                    kind: item.kind,
                    defaultConfig: getDefaultConfig(item.kind),
                  })}
                >
                  <span className="sb-item-icon">{item.icon}</span>
                  <span className="sb-item-label">{label}</span>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* ── 하단 고정 ── */}
      <div className="sb-bottom">
        <div className="sb-bottom-row">
          <button className="sb-model-btn" onClick={onOpenModelManager}>
            <IconCube /> {t('modelManagerBtn')}
          </button>
          <button className="sb-market-btn" onClick={onOpenMarketplace} title={t('mp_title')}>
            <IconGrid />
          </button>
        </div>
      </div>
    </aside>
  )
}
