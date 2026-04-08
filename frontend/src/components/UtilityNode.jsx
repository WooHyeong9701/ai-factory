import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import './UtilityNode.css'

export const UTILITY_KINDS = {
  tts: {
    label: 'TTS',
    badge: 'TTS',
    icon: '🔊',
    accent: '#a855f7',
    desc: '텍스트 → 음성 파일',
    configFields: [
      { key: 'provider',     label: '서비스',       type: 'select',   options: ['macOS TTS', 'ElevenLabs', 'OpenAI TTS'] },
      { key: 'api_key',      label: 'API 키',       type: 'password', placeholder: 'ElevenLabs / OpenAI 사용 시' },
      { key: 'voice_id',     label: '보이스 ID',    type: 'text',     placeholder: 'ElevenLabs voice ID' },
      { key: 'output_path',  label: '저장 경로',    type: 'text',     default: './output/audio.mp3' },
    ],
  },
  image_gen: {
    label: '이미지 생성',
    badge: 'IMG',
    icon: '🎨',
    accent: '#ec4899',
    desc: '프롬프트 → 이미지',
    configFields: [
      { key: 'provider',    label: '서비스',       type: 'select',  options: ['Stable Diffusion', 'ComfyUI', 'DALL-E 3'] },
      { key: 'api_url',     label: 'API URL',      type: 'text',    default: 'http://localhost:7860' },
      { key: 'api_key',     label: 'API 키 (선택)', type: 'password', placeholder: 'DALL-E 사용 시' },
      { key: 'count',       label: '최대 이미지 수', type: 'number',  default: '5' },
      { key: 'output_dir',  label: '저장 폴더',    type: 'text',    default: './output/images/' },
    ],
  },
  file_save: {
    label: '파일 저장',
    badge: 'SAVE',
    icon: '💾',
    accent: '#10b981',
    desc: '텍스트 → 파일 저장',
    configFields: [
      { key: 'output_path', label: '저장 경로',  type: 'text', default: './output/subtitles.srt' },
      { key: 'encoding',    label: '인코딩',     type: 'text', default: 'utf-8' },
    ],
  },
  video_compose: {
    label: '영상 조합',
    badge: 'VIDEO',
    icon: '🎬',
    accent: '#f59e0b',
    desc: '이미지 + 음성 → 영상',
    configFields: [
      { key: 'images_dir',    label: '이미지 폴더',       type: 'text',   default: './output/images/' },
      { key: 'audio_path',    label: '음성 파일',         type: 'text',   default: './output/audio.mp3' },
      { key: 'subtitle_path', label: '자막 파일 (선택)',  type: 'text',   default: './output/subtitles.srt' },
      { key: 'bgm_path',      label: 'BGM 파일 (선택)',   type: 'text',   placeholder: './bgm/track.mp3' },
      { key: 'output_path',   label: '출력 경로',         type: 'text',   default: './output/video.mp4' },
      { key: 'resolution',    label: '해상도',            type: 'select', options: ['1080x1920', '720x1280', '1080x1080'] },
      { key: 'fps',           label: 'FPS',               type: 'number', default: '30' },
      { key: 'img_duration',  label: '이미지당 시간(초)', type: 'number', default: '3' },
    ],
  },
  youtube_upload: {
    label: 'YouTube 업로드',
    badge: 'YT',
    icon: '▶',
    accent: '#ef4444',
    desc: '영상 → YouTube',
    configFields: [
      { key: 'video_path',        label: '영상 경로',     type: 'text',   default: './output/video.mp4' },
      { key: 'credentials_path',  label: '인증 파일',     type: 'text',   default: './credentials.json' },
      { key: 'privacy',           label: '공개 설정',     type: 'select', options: ['private', 'unlisted', 'public'] },
      { key: 'category',          label: '카테고리 ID',   type: 'text',   default: '22', placeholder: '22 = 블로그' },
    ],
  },
}

// Preview fields shown on the node card
const PREVIEW_KEYS = ['output_path', 'provider', 'resolution', 'privacy', 'api_url']

function UtilityNode({ data, selected }) {
  const { kind, name, status = 'idle', output, config = {} } = data
  const kd = UTILITY_KINDS[kind] || { label: kind, badge: '?', icon: '⚙', accent: '#5b8df8', desc: '' }

  const previewPairs = PREVIEW_KEYS
    .filter(k => config[k])
    .slice(0, 2)
    .map(k => ({ key: k, val: config[k] }))

  return (
    <div
      className={`utility-node ${selected ? 'selected' : ''} ut-status-${status}`}
      style={{ '--ut-accent': kd.accent }}
    >
      <Handle type="target" position={Position.Top}    className="ut-handle ut-handle-top" />
      <Handle type="source" position={Position.Bottom} className="ut-handle ut-handle-bottom" />

      <div className="ut-inner">
        <div className="ut-glow" />

        <div className="ut-header">
          <div className="ut-status-indicator">
            <span className="ut-status-dot" />
            {status === 'running' && <span className="ut-pulse" />}
          </div>
          <span className="ut-icon">{kd.icon}</span>
          <span className="ut-name">{name || kd.label}</span>
          <span className="ut-badge">{kd.badge}</span>
        </div>

        <div className="ut-body">
          <p className="ut-desc">{kd.desc}</p>
          {previewPairs.length > 0 && (
            <div className="ut-config-preview">
              {previewPairs.map(({ key, val }) => (
                <div key={key} className="ut-cfg-row">
                  <span className="ut-cfg-icon">›</span>
                  <span className="ut-cfg-val">
                    {String(val).length > 24 ? '…' + String(val).slice(-22) : String(val)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {(status === 'running' || status === 'done' || status === 'error') && output && (
          <div className="ut-output">
            <div className="ut-output-label">
              {status === 'running' ? '처리 중...' : status === 'error' ? '오류' : '완료'}
            </div>
            <p className="ut-output-text">
              {output.length > 100 ? output.slice(0, 100) + '…' : output}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(UtilityNode)
