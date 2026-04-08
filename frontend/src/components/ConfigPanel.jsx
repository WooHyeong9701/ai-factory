import { useState } from 'react'
import './ConfigPanel.css'
import RoleEditor from './RoleEditor'
import { UTILITY_KINDS } from './UtilityNode'

const RETURN_TYPES = [
  { value: 'text', label: 'Text — 자유 텍스트' },
  { value: 'json', label: 'JSON — 구조화 데이터' },
  { value: 'bullet', label: 'Bullet — 불릿 포인트' },
  { value: 'korean', label: '한국어 — 한국어 강제' },
  { value: 'tasklist', label: '☑ 작업리스트 — 체크리스트 변환' },
]

function ModelRamInfo({ model, ramEstimates, systemStats }) {
  if (!model) return null
  const needed = ramEstimates?.[model]
  const available = systemStats?.ram_available_gb
  if (!needed) return null

  const safe = available == null || available >= needed + 0.5
  const tight = available != null && available >= needed && available < needed + 1.5
  const unsafe = available != null && available < needed

  return (
    <div className={`model-ram-info ${unsafe ? 'unsafe' : tight ? 'tight' : 'safe'}`}>
      <span className="ram-info-icon">
        {unsafe ? '🔴' : tight ? '🟡' : '🟢'}
      </span>
      <div className="ram-info-text">
        <span className="ram-needed">약 {needed.toFixed(1)}GB 필요</span>
        {available != null && (
          <span className="ram-available">· 현재 {available.toFixed(1)}GB 가용</span>
        )}
        {unsafe && (
          <div className="ram-warning-msg">
            RAM 부족 — 실행 시 스왑이 발생하거나 컴퓨터가 멈출 수 있습니다.
          </div>
        )}
        {tight && (
          <div className="ram-tight-msg">
            가용 RAM이 빠듯합니다. 다른 앱을 종료하면 안전합니다.
          </div>
        )}
      </div>
    </div>
  )
}

function SafeModels({ models, ramEstimates, available }) {
  if (!available || !models.length) return null
  const safe = models.filter(
    (m) => ramEstimates[m] != null && ramEstimates[m] <= available * 0.8
  )
  if (!safe.length) return null

  return (
    <div className="safe-models">
      <span className="safe-models-label">✅ 현재 RAM에서 안전한 모델</span>
      <div className="safe-models-list">
        {safe.map((m) => (
          <span key={m} className="safe-model-tag">
            {m} <em>~{ramEstimates[m].toFixed(1)}GB</em>
          </span>
        ))}
      </div>
    </div>
  )
}

export default function ConfigPanel({ node, models, ramEstimates = {}, systemStats, onChange, onClose, onDelete }) {
  const [showRoleEditor, setShowRoleEditor] = useState(false)

  // ── Task List Node — simplified config ──────────────────────────────────────
  if (node.type === 'taskListNode') {
    const tasks = node.data.tasks || []
    const doneCount = tasks.filter(t => t.done).length
    return (
      <aside className="config-panel">
        <div className="config-header">
          <span className="config-title tl-config-title">☑ 작업 목록 노드</span>
          <button className="close-btn" onClick={onClose} title="설정 닫기">✕</button>
        </div>
        <div className="config-scroll">
          <div className="config-section">
            <label className="field-label">이름</label>
            <input
              className="field-input"
              type="text"
              value={node.data.name || ''}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="작업 목록 이름"
            />
          </div>
          <div className="config-section">
            <label className="field-label">
              작업 현황
              {tasks.length > 0 && (
                <button
                  className="tl-config-clear-btn"
                  onClick={() => onChange({ tasks: [], status: 'idle' })}
                >
                  초기화
                </button>
              )}
            </label>
            <div className="tl-config-summary">
              <span className="tl-config-icon">☑</span>
              <span className="tl-config-stat">
                {tasks.length === 0
                  ? '아직 작업이 없습니다'
                  : `${doneCount} / ${tasks.length}개 완료`}
              </span>
            </div>
            {tasks.length > 0 && (
              <div className="tl-config-task-list">
                {tasks.map(task => (
                  <div key={task.id} className={`tl-config-task ${task.done ? 'done' : ''}`}>
                    <span className="tl-config-check">{task.done ? '✓' : '○'}</span>
                    <span className="tl-config-task-text">
                      {task.text.length > 32 ? task.text.slice(0, 32) + '…' : task.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="config-section">
            <div className="tl-config-hint">
              <p>연결 방법:</p>
              <ol>
                <li>AI 에이전트 노드를 이 노드에 연결하세요</li>
                <li>해당 노드의 반환 형식을 <strong>☑ 작업리스트</strong>로 설정하세요</li>
                <li>실행하면 AI 출력이 체크리스트로 자동 변환됩니다</li>
              </ol>
            </div>
          </div>
        </div>
        <div className="config-footer">
          <div className="node-id-display">ID: {node.id}</div>
          <button className="config-delete-btn" onClick={onDelete}>노드 삭제</button>
        </div>
      </aside>
    )
  }

  // ── Utility Node config ──────────────────────────────────────────────────────
  if (node.type === 'utilityNode') {
    const kind = node.data.kind
    const kd = UTILITY_KINDS[kind] || { label: kind, icon: '⚙', accent: '#f59e0b', configFields: [] }
    const config = node.data.config || {}

    const setConfig = (key, value) => onChange({ config: { ...config, [key]: value } })

    return (
      <aside className="config-panel">
        <div className="config-header">
          <span className="config-title ut-config-title" style={{ '--ut-accent': kd.accent }}>
            {kd.icon} {kd.label}
          </span>
          <button className="close-btn" onClick={onClose} title="설정 닫기">✕</button>
        </div>
        <div className="config-scroll">
          {/* Node name */}
          <div className="config-section">
            <label className="field-label">이름</label>
            <input
              className="field-input"
              type="text"
              value={node.data.name || ''}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder={kd.label}
            />
          </div>

          {/* Kind-specific config fields */}
          {kd.configFields.map((field) => (
            <div className="config-section" key={field.key}>
              <label className="field-label">{field.label}</label>
              {field.type === 'select' ? (
                <select
                  className="field-select"
                  value={config[field.key] || field.default || field.options?.[0] || ''}
                  onChange={(e) => setConfig(field.key, e.target.value)}
                >
                  {field.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === 'password' ? (
                <input
                  className="field-input"
                  type="password"
                  value={config[field.key] || ''}
                  onChange={(e) => setConfig(field.key, e.target.value)}
                  placeholder={field.placeholder || ''}
                  autoComplete="off"
                />
              ) : field.type === 'number' ? (
                <input
                  className="field-input"
                  type="number"
                  value={config[field.key] ?? field.default ?? ''}
                  onChange={(e) => setConfig(field.key, e.target.value)}
                  placeholder={field.default || ''}
                />
              ) : (
                <input
                  className="field-input"
                  type="text"
                  value={config[field.key] || ''}
                  onChange={(e) => setConfig(field.key, e.target.value)}
                  placeholder={field.placeholder || field.default || ''}
                />
              )}
            </div>
          ))}

          {/* Last output */}
          {node.data.output && (
            <div className="config-section">
              <label className="field-label">
                마지막 출력
                <span className={`output-status-badge status-${node.data.status}`}>
                  {node.data.status === 'done' ? '완료' : node.data.status === 'error' ? '오류' : ''}
                </span>
              </label>
              <div className="output-preview">
                <pre className="output-text">{node.data.output}</pre>
              </div>
            </div>
          )}
        </div>
        <div className="config-footer">
          <div className="node-id-display">ID: {node.id}</div>
          <button className="config-delete-btn" onClick={onDelete}>노드 삭제</button>
        </div>
      </aside>
    )
  }

  // ── Agent Node config ────────────────────────────────────────────────────────
  const { name, role, model, return_type, status, output } = node.data
  const available = systemStats?.ram_available_gb
  const currentModelUnsafe =
    model && ramEstimates[model] != null && available != null && available < ramEstimates[model]

  return (
    <aside className="config-panel">
      <div className="config-header">
        <span className="config-title">노드 설정</span>
        <button className="close-btn" onClick={onClose} title="설정 닫기">✕</button>
      </div>

      <div className="config-scroll">
        <div className="config-section">
          <label className="field-label">이름</label>
          <input
            className="field-input"
            type="text"
            value={name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Agent 이름"
          />
        </div>

        <div className="config-section">
          <label className="field-label">
            역할 (시스템 프롬프트)
            <button className="role-expand-btn" onClick={() => setShowRoleEditor(true)} title="크게 편집">
              ⤢ 크게 편집
            </button>
          </label>
          <textarea
            className="field-textarea"
            value={role}
            onChange={(e) => onChange({ role: e.target.value })}
            placeholder="이 에이전트의 역할과 행동 방식을 설명하세요..."
            rows={5}
          />
        </div>

        {showRoleEditor && (
          <RoleEditor
            nodeName={name}
            value={role}
            onSave={(newRole) => onChange({ role: newRole })}
            onClose={() => setShowRoleEditor(false)}
          />
        )}

        <div className="config-section">
          <label className="field-label">
            모델
            {currentModelUnsafe && (
              <span className="field-label-badge unsafe">RAM 부족</span>
            )}
          </label>
          {models.length > 0 ? (
            <select
              className={`field-select ${currentModelUnsafe ? 'field-select--unsafe' : ''}`}
              value={model}
              onChange={(e) => onChange({ model: e.target.value })}
            >
              <option value="">모델 선택...</option>
              {models.map((m) => {
                const ram = ramEstimates[m]
                const isUnsafe = ram != null && available != null && available < ram
                const isTight = ram != null && available != null && available >= ram && available < ram + 1.5
                return (
                  <option key={m} value={m}>
                    {isUnsafe ? '🔴 ' : isTight ? '🟡 ' : '🟢 '}
                    {m}{ram ? ` (~${ram.toFixed(1)}GB)` : ''}
                  </option>
                )
              })}
            </select>
          ) : (
            <input
              className="field-input"
              type="text"
              value={model}
              onChange={(e) => onChange({ model: e.target.value })}
              placeholder="예: llama3.2, gemma3:4b"
            />
          )}

          <ModelRamInfo model={model} ramEstimates={ramEstimates} systemStats={systemStats} />

          {currentModelUnsafe && (
            <SafeModels models={models} ramEstimates={ramEstimates} available={available} />
          )}
        </div>

        <div className="config-section">
          <label className="field-label">반환 형식</label>
          <div className="return-type-list">
            {RETURN_TYPES.map((rt) => (
              <label key={rt.value} className={`return-type-option ${return_type === rt.value ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="return_type"
                  value={rt.value}
                  checked={return_type === rt.value}
                  onChange={() => onChange({ return_type: rt.value })}
                />
                {rt.label}
              </label>
            ))}
          </div>
        </div>

        {output && (
          <div className="config-section">
            <label className="field-label">
              마지막 출력
              <span className={`output-status-badge status-${status}`}>
                {status === 'running' ? '생성 중' : status === 'done' ? '완료' : status === 'error' ? '오류' : ''}
              </span>
            </label>
            <div className="output-preview">
              <pre className="output-text">{output}</pre>
            </div>
          </div>
        )}
      </div>

      <div className="config-footer">
        <div className="node-id-display">ID: {node.id}</div>
        <button className="config-delete-btn" onClick={onDelete}>노드 삭제</button>
      </div>
    </aside>
  )
}
