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

// ── 유틸리티 노드 ─────────────────────────────────────────────────────────────
const UTILITY_ITEMS = [
  { labelKey: 'taskList',      icon: '☑',   nodeType: 'taskListNode', kind: null },
  { labelKey: 'tts',           icon: '🔊',  nodeType: 'utilityNode',  kind: 'tts' },
  { labelKey: 'imageGen',      icon: '🎨',  nodeType: 'utilityNode',  kind: 'image_gen' },
  { labelKey: 'fileSave',      icon: '💾',  nodeType: 'utilityNode',  kind: 'file_save' },
  { labelKey: 'videoCompose',  icon: '🎬',  nodeType: 'utilityNode',  kind: 'video_compose' },
  { labelKey: 'youtubeUpload', icon: '▶',   nodeType: 'utilityNode',  kind: 'youtube_upload' },
  { labelKey: 'branch',        icon: '⑃',   nodeType: 'utilityNode',  kind: 'branch' },
  { labelKey: 'loop',          icon: '🔁',  nodeType: 'utilityNode',  kind: 'loop' },
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

export default function Sidebar({ onOpenModelManager }) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const [customTemplates, setCustomTemplates] = useState(loadCustomTemplates)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  // Listen for custom template changes from other components (ConfigPanel)
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
      <div className="sidebar-header">
        <span className="sidebar-title">{t('nodePalette')}</span>
        <button
          className="sidebar-expand-btn"
          onClick={() => setExpanded(v => !v)}
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? '«' : '»'}
        </button>
      </div>
      <div className="sidebar-hint">{t('dragToCanvas')}</div>

      {/* ── Panel 1: 노드 (generic agent) ── */}
      <div className="template-list node-list">
        <div
          className="template-item node-item"
          draggable
          onDragStart={(e) => onDragStart(e, {
            nodeType: 'agentNode',
            name: 'Agent',
            role: '',
            return_type: 'text',
          })}
        >
          <span className="template-icon">⬡</span>
          <span className="template-label">{t('nodeLabel')}</span>
        </div>
      </div>

      {/* ── Panel 2: 커스텀 노드 ── */}
      <div className="sidebar-section-divider">
        <span>{t('customNodes')}</span>
      </div>
      <div className="template-list custom-template-list">
        {customTemplates.length === 0 && (
          <div className="custom-empty">{t('noCustomNodes')}</div>
        )}
        {customTemplates.map((tpl) => (
          <div
            key={tpl.id}
            className="template-item custom-item"
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
            <span className="template-icon">⚡</span>
            <span className="template-label">{tpl.name || 'Custom'}</span>
            {confirmDeleteId === tpl.id ? (
              <span className="custom-delete-confirm">
                <button className="custom-delete-yes" onClick={(e) => { e.stopPropagation(); handleDelete(tpl.id) }}>✓</button>
                <button className="custom-delete-no" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null) }}>✕</button>
              </span>
            ) : (
              <button
                className="custom-delete-btn"
                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(tpl.id) }}
                title={t('delete')}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* ── Panel 3: 유틸리티 노드 ── */}
      <div className="sidebar-section-divider">
        <span>{t('utilityNodes')}</span>
      </div>
      <div className="template-list">
        {UTILITY_ITEMS.map((item) => {
          const label = t(item.labelKey)
          return (
            <div
              key={item.labelKey}
              className={`template-item ${item.nodeType === 'taskListNode' ? 'task-list-item' : ''} ${item.nodeType === 'utilityNode' ? 'utility-item' : ''}`}
              draggable
              style={item.kind ? { '--ut-item-accent': UTILITY_KINDS[item.kind]?.accent } : {}}
              onDragStart={(e) => onDragStart(e, {
                nodeType: item.nodeType,
                name: label,
                kind: item.kind,
                defaultConfig: getDefaultConfig(item.kind),
              })}
            >
              <span className="template-icon">{item.icon}</span>
              <span className="template-label">{label}</span>
            </div>
          )
        })}
      </div>

      <div className="sidebar-footer">
        <button className="model-manager-btn" onClick={onOpenModelManager}>
          <span>◈</span>
          {t('modelManagerBtn')}
        </button>
        <div className="sidebar-tip">
          <span className="tip-icon">💡</span>
          <span>{t('handleDragTip')}</span>
        </div>
      </div>
    </aside>
  )
}
