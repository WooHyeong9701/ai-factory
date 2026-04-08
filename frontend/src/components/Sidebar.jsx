import './Sidebar.css'
import { UTILITY_KINDS } from './UtilityNode'

// ── YouTube Shorts 파이프라인 AI 에이전트 ─────────────────────────────────────
const AI_TEMPLATES = [
  {
    label: '스크립트 작성',
    icon: '✍️',
    role: 'YouTube Shorts용 스크립트를 작성합니다.\n구조: 훅(3초) → 본론 → CTA\n60초 이내 구어체로 작성하세요.',
    return_type: 'text',
  },
  {
    label: '이미지 프롬프트',
    icon: '🖼️',
    role: '스크립트의 각 장면에 어울리는 이미지 생성 프롬프트를 영어로 작성합니다.\n각 프롬프트는 새 줄로 구분하고, 번호를 붙이세요.\n세로형(9:16) 구도에 맞게 작성하세요.',
    return_type: 'bullet',
  },
  {
    label: '자막 생성',
    icon: '💬',
    role: '스크립트를 SRT 형식 자막으로 변환합니다.\n형식: 번호 → 타임코드 → 텍스트\n예시:\n1\n00:00:00,000 --> 00:00:03,000\n자막 내용',
    return_type: 'text',
  },
  {
    label: '제목/설명/태그',
    icon: '🏷️',
    role: 'YouTube Shorts에 최적화된 메타데이터를 작성합니다.\n반드시 아래 형식을 지키세요:\n제목: (50자 이내, 이모지 포함)\n설명: (2-3줄 요약)\n태그: 태그1, 태그2, 태그3',
    return_type: 'text',
  },
  {
    label: '커스텀',
    icon: '⚡',
    role: '',
    return_type: 'text',
  },
]

// ── 유틸리티 노드 ─────────────────────────────────────────────────────────────
const UTILITY_ITEMS = [
  { label: '작업 목록',      icon: '☑',   nodeType: 'taskListNode', kind: null },
  { label: 'TTS (음성)',     icon: '🔊',  nodeType: 'utilityNode',  kind: 'tts' },
  { label: '이미지 생성',   icon: '🎨',  nodeType: 'utilityNode',  kind: 'image_gen' },
  { label: '파일 저장',     icon: '💾',  nodeType: 'utilityNode',  kind: 'file_save' },
  { label: '영상 조합',     icon: '🎬',  nodeType: 'utilityNode',  kind: 'video_compose' },
  { label: 'YouTube 업로드', icon: '▶',   nodeType: 'utilityNode',  kind: 'youtube_upload' },
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
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">노드 팔레트</span>
      </div>
      <div className="sidebar-hint">드래그하여 캔버스에 배치</div>

      {/* AI 에이전트 노드 */}
      <div className="sidebar-section-label">AI 에이전트</div>
      <div className="template-list">
        {AI_TEMPLATES.map((tpl) => (
          <div
            key={tpl.label}
            className="template-item"
            draggable
            onDragStart={(e) => onDragStart(e, {
              nodeType: 'agentNode',
              name: tpl.label,
              role: tpl.role,
              return_type: tpl.return_type,
            })}
          >
            <span className="template-icon">{tpl.icon}</span>
            <span className="template-label">{tpl.label}</span>
          </div>
        ))}
      </div>

      {/* 유틸리티 노드 */}
      <div className="sidebar-section-divider">
        <span>유틸리티 노드</span>
      </div>
      <div className="template-list">
        {UTILITY_ITEMS.map((item) => (
          <div
            key={item.label}
            className={`template-item ${item.nodeType === 'taskListNode' ? 'task-list-item' : ''} ${item.nodeType === 'utilityNode' ? 'utility-item' : ''}`}
            draggable
            style={item.kind ? { '--ut-item-accent': UTILITY_KINDS[item.kind]?.accent } : {}}
            onDragStart={(e) => onDragStart(e, {
              nodeType: item.nodeType,
              name: item.label,
              kind: item.kind,
              defaultConfig: getDefaultConfig(item.kind),
            })}
          >
            <span className="template-icon">{item.icon}</span>
            <span className="template-label">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button className="model-manager-btn" onClick={onOpenModelManager}>
          <span>◈</span>
          모델 관리 / 추가
        </button>
        <div className="sidebar-tip">
          <span className="tip-icon">💡</span>
          <span>노드 핸들에서 드래그하여 연결하세요</span>
        </div>
      </div>
    </aside>
  )
}
