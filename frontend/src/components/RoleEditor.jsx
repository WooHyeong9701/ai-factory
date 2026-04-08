import { useState, useEffect, useRef } from 'react'
import './RoleEditor.css'
import { useI18n } from '../i18n/index'

export default function RoleEditor({ nodeName, value, onSave, onClose }) {
  const { t } = useI18n()
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
            <span>{t('roleEditorTitle')}</span>
            {nodeName && <span className="re-node-name">— {nodeName}</span>}
          </div>
          <div className="re-header-right">
            <span className="re-shortcut">{t('roleEditorShortcut')}</span>
            <button className="re-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="re-body">
          <textarea
            ref={textareaRef}
            className="re-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('roleEditorPlaceholder')}
            spellCheck={false}
          />
        </div>

        <div className="re-footer">
          <span className="re-char-count">{t('charCount', { n: charCount.toLocaleString() })}</span>
          <div className="re-actions">
            <button className="re-btn-cancel" onClick={onClose}>{t('cancel')}</button>
            <button className="re-btn-save" onClick={handleSave}>{t('save')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
