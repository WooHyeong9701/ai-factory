import { useState, useRef, useEffect } from 'react'
import './RunPanel.css'
import OutputViewer from './OutputViewer'
import TaskListViewer from './TaskListViewer'

export default function RunPanel({ isRunning, finalOutput, nodeCount, onRun, onStop, nodes, onTaskToggle }) {
  const [input, setInput] = useState('')
  const [activeTab, setActiveTab] = useState('output')
  const [activeNodeTab, setActiveNodeTab] = useState(null)
  const [viewerNodeId, setViewerNodeId] = useState(null)
  const outputRef = useRef(null)

  // Derive viewerNode from live nodes so it always has fresh data
  const viewerNode = viewerNodeId ? nodes.find(n => n.id === viewerNodeId) || null : null

  const activeNodes = nodes.filter((n) => n.data.output || n.data.status !== 'idle')

  // Auto-select first active node tab when switching to nodes view
  useEffect(() => {
    if (activeTab === 'nodes' && activeNodes.length > 0) {
      if (!activeNodeTab || !activeNodes.find((n) => n.id === activeNodeTab)) {
        setActiveNodeTab(activeNodes[0].id)
      }
    }
  }, [activeTab, activeNodes, activeNodeTab])

  // Auto-switch to running node's tab
  useEffect(() => {
    const running = nodes.find((n) => n.data.status === 'running')
    if (running && activeTab === 'nodes') {
      setActiveNodeTab(running.id)
    }
  }, [nodes, activeTab])

  // Auto-scroll node output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [finalOutput, activeNodeTab, nodes])

  const handleRun = () => {
    if (!input.trim()) return
    setActiveTab('output')
    setActiveNodeTab(null)
    onRun(input)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRun()
  }

  const doneNodes = nodes.filter((n) => n.data.status === 'done').length
  const runningNode = nodes.find((n) => n.data.status === 'running')
  const errorNode = nodes.find((n) => n.data.status === 'error')

  const currentNode = nodes.find((n) => n.id === activeNodeTab) || null
  const currentNodeData = currentNode?.data
  const isTaskListTab = currentNode?.type === 'taskListNode'
  const isUtilityTab  = currentNode?.type === 'utilityNode'

  return (
    <div className="run-panel">
      {/* ── Input area ── */}
      <div className="run-input-area">
        <div className="run-input-header">
          <span className="run-input-label">요청사항 입력</span>
          <span className="run-shortcut">⌘ + Enter 실행</span>
        </div>
        <div className="run-input-row">
          <textarea
            className="run-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="처리할 내용을 입력하세요..."
            rows={3}
            disabled={isRunning}
          />
          <div className="run-buttons">
            {isRunning ? (
              <button className="btn-stop" onClick={onStop}>
                <span className="btn-icon">⏹</span>
                중단
              </button>
            ) : (
              <button
                className="btn-run"
                onClick={handleRun}
                disabled={!input.trim() || nodeCount === 0}
              >
                <span className="btn-icon">▶</span>
                실행
              </button>
            )}
          </div>
        </div>

        {isRunning && (
          <div className="run-progress">
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: nodeCount > 0 ? `${(doneNodes / nodeCount) * 100}%` : '0%' }}
              />
            </div>
            <span className="progress-text">
              {runningNode ? `⚙ ${runningNode.data.name} 실행 중...` : `${doneNodes} / ${nodeCount} 완료`}
            </span>
          </div>
        )}

        {errorNode && (
          <div className="run-error-banner">
            ✕ {errorNode.data.name} 오류: {errorNode.data.output}
          </div>
        )}
      </div>

      {/* ── Output area ── */}
      <div className="run-output-area">
        {/* Top-level tabs: 최종출력 / 노드별 출력 */}
        <div className="output-tabs">
          <button
            className={`output-tab ${activeTab === 'output' ? 'active' : ''}`}
            onClick={() => setActiveTab('output')}
          >
            최종 출력
          </button>
          <button
            className={`output-tab ${activeTab === 'nodes' ? 'active' : ''}`}
            onClick={() => setActiveTab('nodes')}
          >
            노드별 출력 {activeNodes.length > 0 && `(${activeNodes.length})`}
          </button>
        </div>

        {/* 최종 출력 */}
        {activeTab === 'output' && (
          <div className="output-content" ref={outputRef}>
            <div className="final-output">
              {finalOutput ? (
                <pre className="final-text">{finalOutput}</pre>
              ) : (
                <div className="output-placeholder">
                  {isRunning
                    ? <span className="placeholder-running">워크플로우 실행 중...</span>
                    : <span>실행 결과가 여기에 표시됩니다</span>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 노드별 출력 — node tabs */}
        {activeTab === 'nodes' && (
          <div className="nodes-tab-area">
            {activeNodes.length === 0 ? (
              <div className="output-content">
                <div className="output-placeholder">
                  <span>실행 후 각 노드의 출력을 여기서 확인하세요</span>
                </div>
              </div>
            ) : (
              <>
                <div className="node-tabs-bar">
                  {activeNodes.map((n) => (
                    <button
                      key={n.id}
                      className={`node-tab ${activeNodeTab === n.id ? 'active' : ''} ${n.type === 'taskListNode' ? 'tasklist-tab' : n.type === 'utilityNode' ? 'utility-tab' : `status-${n.data.status}`}`}
                      onClick={() => setActiveNodeTab(n.id)}
                    >
                      {n.type === 'taskListNode' ? (
                        <span className="node-tab-tl-icon">☑</span>
                      ) : n.type === 'utilityNode' ? (
                        <span className={`node-tab-dot status-${n.data.status}`} />
                      ) : (
                        <span className={`node-tab-dot status-${n.data.status}`} />
                      )}
                      {n.data.name}
                      {n.data.status === 'running' && <span className="node-tab-spin" />}
                    </button>
                  ))}
                </div>

                <div className="node-output-toolbar">
                  {isTaskListTab
                    ? (currentNodeData?.tasks?.length > 0) && (
                        <button className="btn-expand-output btn-expand-tasklist" onClick={() => setViewerNodeId(activeNodeTab)}>
                          ⤢ 전체 목록 보기
                        </button>
                      )
                    : currentNodeData?.output && (
                        <button className="btn-expand-output" onClick={() => setViewerNodeId(activeNodeTab)}>
                          ⤢ 크게 보기
                        </button>
                      )
                  }
                </div>

                <div className="output-content" ref={outputRef}>
                  {currentNodeData ? (
                    isTaskListTab ? (
                      /* Task list node tab content */
                      <div className="run-tasklist-view">
                        {currentNodeData.tasks?.length > 0 ? (
                          <>
                            <div className="run-tl-progress">
                              <div className="run-tl-bar-track">
                                <div
                                  className="run-tl-bar-fill"
                                  style={{
                                    width: `${Math.round((currentNodeData.tasks.filter(t => t.done).length / currentNodeData.tasks.length) * 100)}%`
                                  }}
                                />
                              </div>
                              <span className="run-tl-stat">
                                {currentNodeData.tasks.filter(t => t.done).length}/{currentNodeData.tasks.length} 완료
                              </span>
                            </div>
                            <div className="run-tl-tasks">
                              {currentNodeData.tasks.map((task, idx) => (
                                <div
                                  key={task.id}
                                  className={`run-tl-task ${task.done ? 'done' : ''}`}
                                  onClick={() => onTaskToggle?.(activeNodeTab, task.id)}
                                >
                                  <span className="run-tl-marker">
                                    {task.done ? '✓' : idx + 1}
                                  </span>
                                  <span className="run-tl-text">{task.text}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="output-placeholder">
                            <span>작업 목록이 비어 있습니다</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* AI node tab content */
                      currentNodeData.output ? (
                        <pre className="final-text">{currentNodeData.output}</pre>
                      ) : (
                        <div className="output-placeholder">
                          <span className="placeholder-running">생성 중...</span>
                        </div>
                      )
                    )
                  ) : (
                    <div className="output-placeholder"><span>노드를 선택하세요</span></div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {viewerNode && (
        viewerNode.type === 'taskListNode' ? (
          <TaskListViewer
            name={viewerNode.data.name}
            tasks={viewerNode.data.tasks || []}
            onToggle={(taskId) => onTaskToggle?.(viewerNode.id, taskId)}
            onClose={() => setViewerNodeId(null)}
          />
        ) : (
          <OutputViewer
            nodeName={viewerNode.data.name}
            status={viewerNode.data.status}
            output={viewerNode.data.output}
            onClose={() => setViewerNodeId(null)}
          />
        )
      )}
    </div>
  )
}
