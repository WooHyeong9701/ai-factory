import { useEffect, useRef } from 'react'
import './OutputViewer.css'

export default function OutputViewer({ nodeName, status, output, onClose }) {
  const textareaRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleCopy = () => {
    navigator.clipboard.writeText(output).catch(() => {})
  }

  const statusLabel = status === 'running' ? '생성 중...' : status === 'done' ? '완료' : status === 'error' ? '오류' : ''

  return (
    <div className="ov-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ov-panel">
        <div className="ov-header">
          <div className="ov-title">
            <span className={`ov-status-dot status-${status}`} />
            <span>{nodeName}</span>
            {statusLabel && <span className={`ov-status-label status-${status}`}>{statusLabel}</span>}
          </div>
          <div className="ov-header-right">
            <button className="ov-btn-copy" onClick={handleCopy}>⎘ 복사</button>
            <span className="ov-shortcut">Esc 닫기</span>
            <button className="ov-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="ov-body">
          {output ? (
            <pre className="ov-text">{output}</pre>
          ) : (
            <div className="ov-empty">
              {status === 'running' ? '생성 중입니다...' : '출력이 없습니다.'}
            </div>
          )}
        </div>

        <div className="ov-footer">
          <span className="ov-char-count">{output ? `${output.length.toLocaleString()}자` : ''}</span>
        </div>
      </div>
    </div>
  )
}
