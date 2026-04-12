import { memo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position, useReactFlow } from '@xyflow/react'
import './TaskListNode.css'
import TaskListViewer from './TaskListViewer'

function TaskListNode({ id, data, selected }) {
  const { setNodes } = useReactFlow()
  const [showViewer, setShowViewer] = useState(false)

  const { name = '작업 목록', tasks = [], status = 'idle' } = data

  const doneCount = tasks.filter(t => t.done).length
  const totalCount = tasks.length
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0

  const toggleTask = (taskId) => {
    setNodes(nds => nds.map(n =>
      n.id === id
        ? {
            ...n,
            data: {
              ...n.data,
              tasks: n.data.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t),
            },
          }
        : n
    ))
  }

  return (
    <div className={`task-list-node ${selected ? 'selected' : ''} tl-status-${status}`}>
      {/* Only input handle — task list is a sink node */}
      <Handle type="target" position={Position.Left} className="tl-handle tl-handle-left" />

      <div className="tl-inner">
        <div className="tl-header">
          <span className="tl-header-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></span>
          <span className="tl-name">{name}</span>
          {totalCount > 0 && (
            <span className="tl-badge">{doneCount}/{totalCount}</span>
          )}
        </div>

        {totalCount > 0 ? (
          <>
            <div className="tl-progress-track">
              <div className="tl-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="tl-tasks-preview">
              {tasks.slice(0, 4).map(task => (
                <div
                  key={task.id}
                  className={`tl-task-row ${task.done ? 'done' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleTask(task.id) }}
                >
                  <span className="tl-check">{task.done ? '✓' : '○'}</span>
                  <span className="tl-task-label">
                    {task.text.length > 30 ? task.text.slice(0, 30) + '…' : task.text}
                  </span>
                </div>
              ))}
              {totalCount > 4 && (
                <div className="tl-more">+{totalCount - 4}개 더...</div>
              )}
            </div>
            <button
              className="tl-expand-btn"
              onClick={(e) => { e.stopPropagation(); setShowViewer(true) }}
            >
              ⤢ 전체 목록 보기
            </button>
          </>
        ) : (
          <div className="tl-empty">
            <div className="tl-empty-icon">📋</div>
            <span>AI 노드의 반환 형식을<br />작업리스트로 설정하면<br />여기에 자동 정리됩니다</span>
          </div>
        )}
      </div>

      {/* Portal — rendered at document.body to escape ReactFlow canvas transform */}
      {showViewer && createPortal(
        <TaskListViewer
          name={name}
          tasks={tasks}
          onToggle={toggleTask}
          onClose={() => setShowViewer(false)}
        />,
        document.body
      )}
    </div>
  )
}

export default memo(TaskListNode)
