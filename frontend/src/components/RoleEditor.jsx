import { useState, useEffect, useRef } from 'react'
import './RoleEditor.css'

export default function RoleEditor({ nodeName, value, onSave, onClose }) {
  const [draft, setDraft] = useState(value)
  const textareaRef = useRef(null)

  useEffect(() => {
    textareaRef.current?.focus()
    const len = textareaRef.current?.value.length
    textareaRef.current?.setSelectionRange(len, len)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        onSave(draft)
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [draft, onSave, onClose])

  const handleSave = () => {
    onSave(draft)
    onClose()
  }

  const charCount = draft.length

  return (
    <div className="re-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="re-panel">
        <div className="re-header">
          <div className="re-title">
            <span className="re-title-icon">✎</span>
            <span>역할 편집</span>
            {nodeName && <span className="re-node-name">— {nodeName}</span>}
          </div>
          <div className="re-header-right">
            <span className="re-shortcut">⌘+Enter 저장 · Esc 닫기</span>
            <button className="re-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="re-body">
          <textarea
            ref={textareaRef}
            className="re-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`이 에이전트의 역할과 행동 방식을 자세히 작성하세요.

예시:
당신은 시니어 소프트웨어 아키텍트입니다.
전달받은 기획서를 분석하여 개발 태스크 목록을 작성합니다.

출력 형식:
## 1단계: [단계명]
- [ ] 세부작업 (예상 소요시간)
...

우선순위 높은 순서대로 정렬하고, 각 작업의 의존관계를 명시하세요.`}
            spellCheck={false}
          />
        </div>

        <div className="re-footer">
          <span className="re-char-count">{charCount.toLocaleString()}자</span>
          <div className="re-actions">
            <button className="re-btn-cancel" onClick={onClose}>취소</button>
            <button className="re-btn-save" onClick={handleSave}>저장</button>
          </div>
        </div>
      </div>
    </div>
  )
}
