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
      <Handle type="target" position={Position.Left} className="node-handle left" />
      <Handle type="source" position={Position.Right} className="node-handle right" />

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
          <div className="node-model">
            <span className="model-icon"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></span>
            <span className="model-name">{model || '모델 없음'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(AgentNode)
