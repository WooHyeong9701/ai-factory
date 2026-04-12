import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import './UtilityNode.css'

export const UTILITY_KINDS = {
  tts: {
    label: 'TTS',
    badge: 'TTS',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
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
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19c-4.42 0-8-1.79-8-4s3.58-4 8-4 8 1.79 8 4"/><path d="M12 15V3"/><circle cx="12" cy="3" r="1"/><path d="M7 7l-2 2"/><path d="M17 7l2 2"/></svg>,
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
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
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
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/></svg>,
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
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>,
    accent: '#ef4444',
    desc: '영상 → YouTube',
    configFields: [
      { key: 'video_path',        label: '영상 경로',     type: 'text',   default: './output/video.mp4' },
      { key: 'credentials_path',  label: '인증 파일',     type: 'text',   default: './credentials.json' },
      { key: 'privacy',           label: '공개 설정',     type: 'select', options: ['private', 'unlisted', 'public'] },
      { key: 'category',          label: '카테고리 ID',   type: 'text',   default: '22', placeholder: '22 = 블로그' },
    ],
  },
  branch: {
    label: '분기 처리',
    badge: 'IF',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>,
    accent: '#38bdf8',
    desc: '조건에 따라 흐름 분기',
    configFields: [
      { key: 'condition_type', label: '조건 유형', type: 'select', options: ['포함', '미포함', '길이 이상', '길이 이하', '정규식', '항상 참'], default: '포함' },
      { key: 'condition_value', label: '조건 값', type: 'text', placeholder: '키워드, 숫자, 정규식 등' },
    ],
  },
  loop: {
    label: '반복문',
    badge: 'LOOP',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/></svg>,
    accent: '#f472b6',
    desc: '입력을 N회 반복 실행',
    configFields: [
      { key: 'iterations', label: '반복 횟수', type: 'number', default: '3' },
      { key: 'mode', label: '반복 모드', type: 'select', options: ['same_input', 'chain'], default: 'same_input' },
      { key: 'separator', label: '결과 구분자', type: 'text', default: '\\n---\\n' },
    ],
  },
  api_request: {
    label: 'API 요청',
    badge: 'API',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    accent: '#06b6d4',
    desc: 'URL에서 데이터 가져오기',
    configFields: [
      { key: 'url',       label: 'URL',            type: 'text',   placeholder: 'https://api.github.com/repos/owner/repo/issues' },
      { key: 'method',    label: 'Method',          type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
      { key: 'headers',   label: 'Headers (JSON)',  type: 'text',   placeholder: '{"Authorization": "Bearer ..."}' },
      { key: 'body',      label: 'Body',            type: 'text',   placeholder: '비워두면 이전 노드 출력을 본문으로 사용' },
      { key: 'json_path', label: 'JSON 추출 경로',  type: 'text',   placeholder: '[*].title  또는  data.items[*].name' },
    ],
  },
  webhook_out: {
    label: '웹훅 전송',
    badge: 'HOOK',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    accent: '#8b5cf6',
    desc: '결과를 외부 URL로 전송',
    configFields: [
      { key: 'url',     label: 'Webhook URL',   type: 'text',   placeholder: 'https://hooks.slack.com/services/...' },
      { key: 'method',  label: 'Method',         type: 'select', options: ['POST', 'PUT', 'PATCH'], default: 'POST' },
      { key: 'headers', label: 'Headers (JSON)', type: 'text',   placeholder: '{"Content-Type": "application/json"}' },
      { key: 'body_template', label: 'Body 템플릿', type: 'text', placeholder: '{"text": "{{input}}"} — {{input}}은 입력값으로 대체' },
    ],
  },
}

// Preview fields shown on the node card
const PREVIEW_KEYS = ['url', 'output_path', 'provider', 'resolution', 'privacy', 'api_url']

function UtilityNode({ data, selected }) {
  const { kind, name, status = 'idle', output, config = {} } = data
  const kd = UTILITY_KINDS[kind] || { label: kind, badge: '?', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>, accent: '#a78bfa', desc: '' }

  const previewPairs = PREVIEW_KEYS
    .filter(k => config[k])
    .slice(0, 2)
    .map(k => ({ key: k, val: config[k] }))

  return (
    <div
      className={`utility-node ${selected ? 'selected' : ''} ut-status-${status}`}
      style={{ '--ut-accent': kd.accent }}
    >
      <Handle type="target" position={Position.Left} className="ut-handle ut-handle-left" />
      {kind === 'branch' ? (
        <>
          <Handle type="source" position={Position.Right} id="true" className="ut-handle ut-handle-right ut-branch-true" style={{ top: '35%' }} />
          <Handle type="source" position={Position.Right} id="false" className="ut-handle ut-handle-right ut-branch-false" style={{ top: '65%' }} />
        </>
      ) : (
        <Handle type="source" position={Position.Right} className="ut-handle ut-handle-right" />
      )}

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
          {kind === 'branch' ? (
            <div className="ut-branch-labels">
              <div className="ut-branch-row true">
                <span className="ut-branch-dot true" />
                <span>참 (True)</span>
                {config.condition_type && (
                  <span className="ut-branch-cond">{config.condition_type}: {config.condition_value || '…'}</span>
                )}
              </div>
              <div className="ut-branch-row false">
                <span className="ut-branch-dot false" />
                <span>거짓 (False)</span>
              </div>
            </div>
          ) : kind === 'loop' ? (
            <div className="ut-loop-labels">
              <div className="ut-loop-row">
                <span className="ut-loop-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/></svg></span>
                <span className="ut-loop-count">{config.iterations || 3}x</span>
                <span className="ut-loop-mode">
                  {config.mode === 'chain' ? 'chain' : 'same'}
                </span>
              </div>
            </div>
          ) : (
            previewPairs.length > 0 && (
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
            )
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
