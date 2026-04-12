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

const UTILITY_ITEMS = [
  { labelKey: 'taskList',      icon: '☑',   nodeType: 'taskListNode', kind: null },
  { labelKey: 'tts',           icon: '🔊',  nodeType: 'utilityNode',  kind: 'tts' },
  { labelKey: 'imageGen',      icon: '🎨',  nodeType: 'utilityNode',  kind: 'image_gen' },
  { labelKey: 'fileSave',      icon: '💾',  nodeType: 'utilityNode',  kind: 'file_save' },
  { labelKey: 'videoCompose',  icon: '🎬',  nodeType: 'utilityNode',  kind: 'video_compose' },
  { labelKey: 'youtubeUpload', icon: '▶',   nodeType: 'utilityNode',  kind: 'youtube_upload' },
  { labelKey: 'branch',        icon: '⑃',   nodeType: 'utilityNode',  kind: 'branch' },
  { labelKey: 'loop',          icon: '🔁',  nodeType: 'utilityNode',  kind: 'loop' },
  { labelKey: 'apiRequest',    icon: '🌐',  nodeType: 'utilityNode',  kind: 'api_request' },
  { labelKey: 'webhookOut',    icon: '📤',  nodeType: 'utilityNode',  kind: 'webhook_out' },
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
            <span className="sb-node-icon">⬡</span>
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
                <span className="sb-item-icon">⚡</span>
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
                  style={item.kind ? { '--ut-accent': UTILITY_KINDS[item.kind]?.accent } : {}}
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
            <span>◈</span> {t('modelManagerBtn')}
          </button>
          <button className="sb-market-btn" onClick={onOpenMarketplace} title={t('mp_title')}>
            🏪
          </button>
        </div>
      </div>
    </aside>
  )
}
