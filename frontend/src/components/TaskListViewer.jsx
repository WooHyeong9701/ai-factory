import { useEffect, useRef } from 'react'
import './TaskListViewer.css'

export default function TaskListViewer({ name, tasks, onToggle, onClose }) {
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCloseRef.current() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const doneCount = tasks.filter(t => t.done).length
  const totalCount = tasks.length
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="tlv-backdrop" onClick={handleBackdrop}>
      <div className="tlv-panel">
        {/* Header */}
        <div className="tlv-header">
          <div className="tlv-title-row">
            <span className="tlv-title-icon">☑</span>
            <h2 className="tlv-title">{name || '작업 목록'}</h2>
            <span className="tlv-count-badge">{doneCount}/{totalCount} 완료</span>
          </div>
          <button className="tlv-close-btn" onClick={onClose} title="닫기 (Esc)">✕</button>
        </div>

        {/* Progress bar */}
        <div className="tlv-progress-area">
          <div className="tlv-progress-track">
            <div className="tlv-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="tlv-progress-pct">{progress}%</span>
        </div>

        {/* Task list body */}
        <div className="tlv-body">
          {tasks.length === 0 ? (
            <div className="tlv-empty">아직 작업 항목이 없습니다.</div>
          ) : (
            <div className="tlv-tasks">
              {tasks.map((task, idx) => (
                <div
                  key={task.id}
                  className={`tlv-task ${task.done ? 'done' : ''}`}
                  onClick={() => onToggle?.(task.id)}
                >
                  <div className="tlv-task-marker">
                    {task.done ? (
                      <span className="tlv-checkmark">✓</span>
                    ) : (
                      <span className="tlv-circle">{idx + 1}</span>
                    )}
                  </div>
                  <span className="tlv-task-text">{task.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="tlv-footer">
          <span className="tlv-footer-hint">항목 클릭으로 완료 토글 · Esc로 닫기</span>
          <span className="tlv-footer-count">{totalCount}개 항목</span>
        </div>
      </div>
    </div>
  )
}
