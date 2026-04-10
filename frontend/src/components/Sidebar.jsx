import { useState } from 'react'
import './Sidebar.css'
import { UTILITY_KINDS } from './UtilityNode'
import { useI18n } from '../i18n/index'

// ── YouTube Shorts 파이프라인 AI 에이전트 ─────────────────────────────────────
const AI_TEMPLATES = [
  { labelKey: 'custom',       icon: '⚡', role: '', return_type: 'text' },
]

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

      {/* AI 에이전트 노드 */}
      <div className="sidebar-section-label">{t('aiAgent')}</div>
      <div className="template-list">
        {AI_TEMPLATES.map((tpl) => {
          const label = t(tpl.labelKey)
          return (
            <div
              key={tpl.labelKey}
              className="template-item"
              draggable
              onDragStart={(e) => onDragStart(e, {
                nodeType: 'agentNode',
                name: label,
                role: tpl.role,
                return_type: tpl.return_type,
              })}
            >
              <span className="template-icon">{tpl.icon}</span>
              <span className="template-label">{label}</span>
            </div>
          )
        })}
      </div>

      {/* 유틸리티 노드 */}
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
