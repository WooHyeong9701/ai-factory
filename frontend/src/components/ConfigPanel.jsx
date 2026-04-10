import { useState } from 'react'
import './ConfigPanel.css'
import RoleEditor from './RoleEditor'
import { UTILITY_KINDS } from './UtilityNode'
import { useI18n } from '../i18n/index'

function ModelRamInfo({ model, ramEstimates, systemStats }) {
  const { t } = useI18n()
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
        <span className="ram-needed">{t('ramNeeded', { n: needed.toFixed(1) })}</span>
        {available != null && (
          <span className="ram-available">· {t('ramAvailable', { n: available.toFixed(1) })}</span>
        )}
        {unsafe && <div className="ram-warning-msg">{t('ramWarningMsg')}</div>}
        {tight && <div className="ram-tight-msg">{t('ramTightMsg')}</div>}
      </div>
    </div>
  )
}

function SafeModels({ models, ramEstimates, available }) {
  const { t } = useI18n()
  if (!available || !models.length) return null
  const safe = models.filter(
    (m) => ramEstimates[m] != null && ramEstimates[m] <= available * 0.8
  )
  if (!safe.length) return null

  return (
    <div className="safe-models">
      <span className="safe-models-label">{t('safeModelsLabel')}</span>
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
  const { t } = useI18n()
  const [showRoleEditor, setShowRoleEditor] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const RETURN_TYPES = [
    { value: 'text',     label: t('rtText') },
    { value: 'json',     label: t('rtJson') },
    { value: 'bullet',   label: t('rtBullet') },
    { value: 'korean',   label: t('rtKorean') },
    { value: 'tasklist', label: t('rtTasklist') },
  ]

  // ── Task List Node ───────────────────────────────────────────────────────────
  if (node.type === 'taskListNode') {
    const tasks = node.data.tasks || []
    const doneCount = tasks.filter(t => t.done).length
    return (
      <aside className="config-panel">
        <div className="config-header">
          <span className="config-title tl-config-title">{t('taskListNodeTitle')}</span>
          <button className="close-btn" onClick={onClose} title={t('closeSettings')}>✕</button>
        </div>
        <div className="config-scroll">
          <div className="config-section">
            <label className="field-label">{t('name')}</label>
            <input
              className="field-input"
              type="text"
              value={node.data.name || ''}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder={t('taskListNamePlaceholder')}
            />
          </div>
          <div className="config-section">
            <label className="field-label">
              {t('taskStatus')}
              {tasks.length > 0 && (
                <button
                  className="tl-config-clear-btn"
                  onClick={() => onChange({ tasks: [], status: 'idle' })}
                >
                  {t('reset')}
                </button>
              )}
            </label>
            <div className="tl-config-summary">
              <span className="tl-config-icon">☑</span>
              <span className="tl-config-stat">
                {tasks.length === 0
                  ? t('noTasksYet')
                  : `${doneCount} / ${tasks.length} ${t('completedLabel')}`}
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
              <p>{t('connectionGuide')}</p>
              <ol>
                <li>{t('tlHint1')}</li>
                <li>{t('tlHint2')}</li>
                <li>{t('tlHint3')}</li>
              </ol>
            </div>
          </div>
        </div>
        <div className="config-footer">
          <div className="node-id-display">ID: {node.id}</div>
          <button className="config-delete-btn" onClick={onDelete}>{t('deleteNode')}</button>
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
          <button className="close-btn" onClick={onClose} title={t('closeSettings')}>✕</button>
        </div>
        <div className="config-scroll">
          <div className="config-section">
            <label className="field-label">{t('name')}</label>
            <input
              className="field-input"
              type="text"
              value={node.data.name || ''}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder={kd.label}
            />
          </div>

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

          {node.data.output && (
            <div className="config-section">
              <label className="field-label">
                {t('lastOutput')}
                <span className={`output-status-badge status-${node.data.status}`}>
                  {node.data.status === 'done' ? t('completedLabel') : node.data.status === 'error' ? t('error') : ''}
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
          <button className="config-delete-btn" onClick={onDelete}>{t('deleteNode')}</button>
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
        <span className="config-title">{t('configTitle')}</span>
        <button className="close-btn" onClick={onClose} title={t('closeSettings')}>✕</button>
      </div>

      <div className="config-scroll">
        <div className="config-section">
          <label className="field-label">{t('name')}</label>
          <input
            className="field-input"
            type="text"
            value={name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={t('agentNamePlaceholder')}
          />
        </div>

        <div className="config-section">
          <label className="field-label">
            {t('roleLabel')}
            <button className="role-expand-btn" onClick={() => setShowRoleEditor(true)} title={t('expandEdit')}>
              {t('expandEdit')}
            </button>
          </label>
          <textarea
            className="field-textarea"
            value={role}
            onChange={(e) => onChange({ role: e.target.value })}
            placeholder={t('rolePlaceholder')}
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
            {t('model')}
            {currentModelUnsafe && (
              <span className="field-label-badge unsafe">{t('ramInsufficient')}</span>
            )}
          </label>
          {models.length > 0 ? (
            <select
              className={`field-select ${currentModelUnsafe ? 'field-select--unsafe' : ''}`}
              value={model}
              onChange={(e) => onChange({ model: e.target.value })}
            >
              <option value="">{t('selectModel')}</option>
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
              placeholder={t('modelPlaceholder')}
            />
          )}

          <ModelRamInfo model={model} ramEstimates={ramEstimates} systemStats={systemStats} />

          {currentModelUnsafe && (
            <SafeModels models={models} ramEstimates={ramEstimates} available={available} />
          )}
        </div>

        <div className="config-section">
          <label className="field-label">{t('returnFormat')}</label>
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

        {/* ── LLM Parameters ── */}
        <div className="config-section">
          <button
            className="advanced-toggle"
            onClick={() => setShowAdvanced(v => !v)}
          >
            <span className="advanced-chevron">{showAdvanced ? '▾' : '▸'}</span>
            {t('llmParams')}
          </button>

          {showAdvanced && (
            <div className="advanced-fields">
              <div className="param-row">
                <label className="param-label">Temperature</label>
                <input
                  className="param-input"
                  type="number"
                  min="0" max="2" step="0.1"
                  value={node.data.temperature ?? ''}
                  onChange={(e) => onChange({ temperature: e.target.value })}
                  placeholder="0.7"
                />
                <span className="param-hint">{t('llmTempHint')}</span>
              </div>
              <div className="param-row">
                <label className="param-label">Top P</label>
                <input
                  className="param-input"
                  type="number"
                  min="0" max="1" step="0.05"
                  value={node.data.top_p ?? ''}
                  onChange={(e) => onChange({ top_p: e.target.value })}
                  placeholder="0.9"
                />
                <span className="param-hint">{t('llmTopPHint')}</span>
              </div>
              <div className="param-row">
                <label className="param-label">Top K</label>
                <input
                  className="param-input"
                  type="number"
                  min="1" max="200" step="1"
                  value={node.data.top_k ?? ''}
                  onChange={(e) => onChange({ top_k: e.target.value })}
                  placeholder="40"
                />
                <span className="param-hint">{t('llmTopKHint')}</span>
              </div>
              <div className="param-row">
                <label className="param-label">Max Tokens</label>
                <input
                  className="param-input"
                  type="number"
                  min="1" max="32768" step="256"
                  value={node.data.max_tokens ?? ''}
                  onChange={(e) => onChange({ max_tokens: e.target.value })}
                  placeholder="2048"
                />
                <span className="param-hint">{t('llmMaxTokensHint')}</span>
              </div>
              <div className="param-row">
                <label className="param-label">Repeat Penalty</label>
                <input
                  className="param-input"
                  type="number"
                  min="0.5" max="2" step="0.05"
                  value={node.data.repeat_penalty ?? ''}
                  onChange={(e) => onChange({ repeat_penalty: e.target.value })}
                  placeholder="1.1"
                />
                <span className="param-hint">{t('llmRepeatHint')}</span>
              </div>
              <div className="param-row">
                <label className="param-label">Seed</label>
                <input
                  className="param-input"
                  type="number"
                  min="0" step="1"
                  value={node.data.seed ?? ''}
                  onChange={(e) => onChange({ seed: e.target.value })}
                  placeholder={t('llmSeedPlaceholder')}
                />
                <span className="param-hint">{t('llmSeedHint')}</span>
              </div>
            </div>
          )}
        </div>

        {output && (
          <div className="config-section">
            <label className="field-label">
              {t('lastOutput')}
              <span className={`output-status-badge status-${status}`}>
                {status === 'running' ? t('generating2') : status === 'done' ? t('completedLabel') : status === 'error' ? t('error') : ''}
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
        <button className="config-delete-btn" onClick={onDelete}>{t('deleteNode')}</button>
      </div>
    </aside>
  )
}
