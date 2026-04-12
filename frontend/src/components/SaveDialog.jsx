import { useState, useEffect, useRef } from 'react'
import './SaveDialog.css'

export default function SaveDialog({ currentName, onSave, onClose }) {
  const [name, setName] = useState(currentName || '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave(name.trim())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sd-panel">
        <div className="sd-header">
          <h2 className="sd-title">워크플로우 저장</h2>
        </div>
        <div className="sd-body">
          <label className="sd-label">워크플로우 이름</label>
          <input
            ref={inputRef}
            className="sd-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="예: YouTube Shorts 자동화"
            maxLength={60}
          />
        </div>
        <div className="sd-footer">
          <button className="sd-btn-cancel" onClick={onClose}>취소</button>
          <button
            className="sd-btn-save"
            onClick={handleSave}
            disabled={!name.trim() || saving}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
