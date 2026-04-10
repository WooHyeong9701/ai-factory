import './Sidebar.css'
import { UTILITY_KINDS } from './UtilityNode'
import { useI18n } from '../i18n/index'

// ── YouTube Shorts 파이프라인 AI 에이전트 ─────────────────────────────────────
const AI_TEMPLATES = [
  { labelKey: 'scriptWriter', icon: '✍️', role: 'YouTube Shorts용 스크립트를 작성합니다.\n구조: 훅(3초) → 본론 → CTA\n60초 이내 구어체로 작성하세요.', return_type: 'text' },
  { labelKey: 'imagePrompt',  icon: '🖼️', role: '스크립트의 각 장면에 어울리는 이미지 생성 프롬프트를 영어로 작성합니다.\n각 프롬프트는 새 줄로 구분하고, 번호를 붙이세요.\n세로형(9:16) 구도에 맞게 작성하세요.', return_type: 'bullet' },
  { labelKey: 'subtitle',     icon: '💬', role: '스크립트를 SRT 형식 자막으로 변환합니다.\n형식: 번호 → 타임코드 → 텍스트\n예시:\n1\n00:00:00,000 --> 00:00:03,000\n자막 내용', return_type: 'text' },
  { labelKey: 'metaData',     icon: '🏷️', role: 'YouTube Shorts에 최적화된 메타데이터를 작성합니다.\n반드시 아래 형식을 지키세요:\n제목: (50자 이내, 이모지 포함)\n설명: (2-3줄 요약)\n태그: 태그1, 태그2, 태그3', return_type: 'text' },
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

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">{t('nodePalette')}</span>
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
