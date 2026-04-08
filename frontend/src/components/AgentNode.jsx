import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import './AgentNode.css'

const RETURN_LABELS = {
  text: 'TEXT',
  json: 'JSON',
  bullet: 'BULLET',
  korean: '한국어',
  tasklist: '작업리스트',
}

function AgentNode({ data, selected }) {
  const { name, role, model, return_type, status, output } = data

  return (
    <div className={`agent-node status-${status} ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="node-handle top" />
      <Handle type="source" position={Position.Bottom} className="node-handle bottom" />

      <div className="node-inner">
        <div className="node-glow" />

        <div className="node-header">
          <div className="node-status-indicator">
            <span className="node-status-dot" />
            {status === 'running' && <span className="node-pulse" />}
          </div>
          <span className="node-name">{name || 'Agent'}</span>
          <span className="node-return-tag">{RETURN_LABELS[return_type] || 'TEXT'}</span>
        </div>

        <div className="node-body">
          <p className="node-role">
            {role ? (role.length > 80 ? role.slice(0, 80) + '…' : role) : '역할 미설정'}
          </p>
          <div className="node-model">
            <span className="model-icon">◈</span>
            <span className="model-name">{model || '모델 없음'}</span>
          </div>
        </div>

        {(status === 'running' || status === 'done' || status === 'error') && output && (
          <div className="node-output">
            <div className="node-output-label">
              {status === 'running' ? '생성 중...' : status === 'error' ? '오류' : '출력'}
            </div>
            <p className="node-output-text">
              {output.length > 120 ? output.slice(0, 120) + '…' : output}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(AgentNode)
