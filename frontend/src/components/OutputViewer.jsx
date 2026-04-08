import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n/index'
import './OutputViewer.css'

export default function OutputViewer({ nodeName, status, output, onClose }) {
  const { t } = useI18n()
  const textareaRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleCopy = () => {
    navigator.clipboard.writeText(output).catch(() => {})
  }

  const statusLabel = status === 'running' ? t('generating') : status === 'done' ? t('completed') : status === 'error' ? t('error') : ''

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
            <button className="ov-btn-copy" onClick={handleCopy}>{t('ovCopy')}</button>
            <span className="ov-shortcut">{t('ovEscClose')}</span>
            <button className="ov-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="ov-body">
          {output ? (
            <pre className="ov-text">{output}</pre>
          ) : (
            <div className="ov-empty">
              {status === 'running' ? t('ovGenerating') : t('ovNoOutput')}
            </div>
          )}
        </div>

        <div className="ov-footer">
          <span className="ov-char-count">{output ? t('charCount', { n: output.length.toLocaleString() }) : ''}</span>
        </div>
      </div>
    </div>
  )
}
