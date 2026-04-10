import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth as _useAuth, useUser as _useUser, SignInButton, UserButton } from '@clerk/clerk-react'

const HAS_CLERK = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const noopAuth = { isSignedIn: false, getToken: async () => null }
const noopUser = { user: null }
function useAuth() { return HAS_CLERK ? _useAuth() : noopAuth }
function useUser() { return HAS_CLERK ? _useUser() : noopUser }

import { testConnection, fetchModels } from './ollamaClient'
import { runWorkflow as executeWorkflow } from './workflowRunner'
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './App.css'
import AgentNode from './components/AgentNode'
import TaskListNode from './components/TaskListNode'
import UtilityNode from './components/UtilityNode'
import CustomEdge from './components/CustomEdge'
import Sidebar from './components/Sidebar'
import ConfigPanel from './components/ConfigPanel'
import RunPanel from './components/RunPanel'
import ModelManager from './components/ModelManager'
import OllamaSetup from './components/OllamaSetup'
import WorkflowManager from './components/WorkflowManager'
import SaveDialog from './components/SaveDialog'
import AdminDashboard from './components/AdminDashboard'
import { saveWorkflow, getWorkflow, isConfigured } from './workflowApi'
import { useI18n, LANGUAGES } from './i18n/index'

const CF_URL = (import.meta.env.VITE_CF_WORKER_URL || '').replace(/\/$/, '')

const nodeTypes = { agentNode: AgentNode, taskListNode: TaskListNode, utilityNode: UtilityNode }
const edgeTypes = { customEdge: CustomEdge }

// ── Task parsing ──────────────────────────────────────────────────────────────
function stripMd(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .trim()
}

function parseTasksFromText(text) {
  const lines = text.split('\n')
  const tasks = []
  let id = 0
  for (const line of lines) {
    const t = line.trim()
    if (!t) continue
    const doneCb = t.match(/^[-*+]\s+\[x\]\s+(.+)/i)
    if (doneCb) { tasks.push({ id: String(id++), text: stripMd(doneCb[1].trim()), done: true }); continue }
    const todoCb = t.match(/^[-*+]\s+\[\s*\]\s+(.+)/)
    if (todoCb) { tasks.push({ id: String(id++), text: stripMd(todoCb[1].trim()), done: false }); continue }
    const numbered = t.match(/^\d+[.)]\s+(.+)/)
    if (numbered) { tasks.push({ id: String(id++), text: stripMd(numbered[1].trim()), done: false }); continue }
    const bullet = t.match(/^[-*+]\s+(.+)/)
    if (bullet) { tasks.push({ id: String(id++), text: stripMd(bullet[1].trim()), done: false }); continue }
  }
  return tasks
}

let _counter = 1
const genId = () => `node-${_counter++}`

const defaultData = {
  name: 'Agent',
  role: '주어진 입력을 처리합니다.',
  model: '',
  return_type: 'text',
  status: 'idle',
  output: '',
}

const EDGE_DEFAULTS = {
  type: 'customEdge',
  animated: true,
  style: { stroke: '#5b8df8', strokeWidth: 3 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
    color: '#5b8df8',
  },
}

export default function App() {
  const { screenToFlowPosition } = useReactFlow()
  const { isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const { t, lang, switchLang } = useI18n()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [models, setModels] = useState([])
  const [ramEstimates, setRamEstimates] = useState({})
  const [ollamaOk, setOllamaOk] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [finalOutput, setFinalOutput] = useState('')
  const [showModelManager, setShowModelManager] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [ollamaUrl, setOllamaUrl] = useState(() => localStorage.getItem('ollama_url') || 'http://localhost:11434')
  const [showWorkflowManager, setShowWorkflowManager] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [currentWorkflowId, setCurrentWorkflowId] = useState(null)
  const [currentWorkflowName, setCurrentWorkflowName] = useState('새 워크플로우')
  const [saveStatus, setSaveStatus] = useState(null) // null | 'saving' | 'saved' | 'error'
  const [showAdmin, setShowAdmin] = useState(false)
  const [showMinimap, setShowMinimap] = useState(() => {
    const stored = localStorage.getItem('show_minimap')
    return stored === null ? true : stored === 'true'
  })
  const abortRef = useRef(null)

  // ── Visit tracking (anonymous) ──────────────────────────────────────────────
  useEffect(() => {
    if (!CF_URL) return
    let vid = localStorage.getItem('visitor_id')
    if (!vid) {
      vid = crypto.randomUUID()
      localStorage.setItem('visitor_id', vid)
    }
    fetch(`${CF_URL}/api/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitor_id: vid,
        user_id: user?.id || '',
        path: window.location.pathname,
      }),
    }).catch(() => {})
  }, [user])

  // ── On mount: test Ollama + fetch models ────────────────────────────────────
  useEffect(() => {
    if (!localStorage.getItem('ollama_url')) {
      setShowSetup(true)
      return
    }
    const url = localStorage.getItem('ollama_url') || ollamaUrl
    testConnection(url)
      .then(() => {
        setOllamaOk(true)
        return fetchModels(url)
      })
      .then(({ models: m, ramEstimates: r }) => {
        setModels(m)
        setRamEstimates(r)
      })
      .catch(() => {
        setOllamaOk(false)
        setShowSetup(true)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, ...EDGE_DEFAULTS }, eds)),
    [setEdges]
  )

  const addNode = useCallback(
    (template = {}) => {
      const id = genId()
      const node = {
        id,
        type: 'agentNode',
        position: {
          x: 150 + Math.random() * 400,
          y: 80 + Math.random() * 200,
        },
        data: {
          ...defaultData,
          ...template,
          model: template.model || models[0] || '',
          status: 'idle',
          output: '',
        },
      }
      setNodes((nds) => [...nds, node])
      setSelectedNodeId(id)
    },
    [models, setNodes]
  )

  const addTaskListNode = useCallback(() => {
    const id = genId()
    const node = {
      id,
      type: 'taskListNode',
      position: {
        x: 200 + Math.random() * 350,
        y: 150 + Math.random() * 200,
      },
      data: {
        name: '작업 목록',
        tasks: [],
        status: 'idle',
      },
    }
    setNodes((nds) => [...nds, node])
    setSelectedNodeId(id)
  }, [setNodes])

  // ── Drag-and-drop from sidebar ──────────────────────────────────────────────
  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event) => {
      event.preventDefault()
      const raw = event.dataTransfer.getData('application/reactflow-node')
      if (!raw) return

      const template = JSON.parse(raw)
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      const id = genId()

      let node
      if (template.nodeType === 'taskListNode') {
        node = {
          id,
          type: 'taskListNode',
          position,
          data: { name: '작업 목록', tasks: [], status: 'idle' },
        }
      } else if (template.nodeType === 'utilityNode') {
        node = {
          id,
          type: 'utilityNode',
          position,
          data: {
            kind: template.kind,
            name: template.name,
            status: 'idle',
            output: '',
            config: template.defaultConfig || {},
          },
        }
      } else {
        node = {
          id,
          type: 'agentNode',
          position,
          data: {
            ...defaultData,
            name: template.name,
            role: template.role,
            return_type: template.return_type,
            model: models[0] || '',
          },
        }
      }

      setNodes((nds) => [...nds, node])
      setSelectedNodeId(id)
    },
    [screenToFlowPosition, models, setNodes]
  )

  const updateNode = useCallback(
    (nodeId, updates) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n
        )
      )
    },
    [setNodes]
  )

  const deleteNode = useCallback(
    (nodeId) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId))
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
      )
      setSelectedNodeId(null)
    },
    [setNodes, setEdges]
  )

  const onNodeClick = useCallback((_, node) => setSelectedNodeId(node.id), [])
  const onPaneClick = useCallback(() => setSelectedNodeId(null), [])

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null

  // ── Run workflow ─────────────────────────────────────────────────────────────
  const runWorkflow = useCallback(
    (initialInput) => {
      if (isRunning || !nodes.length) return

      setNodes((nds) =>
        nds.map((n) =>
          n.type === 'taskListNode'
            ? { ...n, data: { ...n.data, status: 'idle', tasks: [] } }
            : { ...n, data: { ...n.data, status: 'idle', output: '' } }
        )
      )
      setFinalOutput('')
      setIsRunning(true)

      const url = localStorage.getItem('ollama_url') || ollamaUrl
      abortRef.current = new AbortController()

      const onEvent = (msg) => {
        if (msg.type === 'node_start') {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === msg.node_id
                ? { ...n, data: { ...n.data, status: 'running', output: '' } }
                : n
            )
          )
        } else if (msg.type === 'token') {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === msg.node_id
                ? { ...n, data: { ...n.data, output: (n.data.output || '') + msg.token } }
                : n
            )
          )
        } else if (msg.type === 'node_done') {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === msg.node_id ? { ...n, data: { ...n.data, status: 'done' } } : n
            )
          )
        } else if (msg.type === 'tasklist_update') {
          const tasks = parseTasksFromText(msg.output)
          if (tasks.length > 0) {
            setNodes((nds) =>
              nds.map((n) =>
                n.id === msg.node_id && n.type === 'taskListNode'
                  ? { ...n, data: { ...n.data, tasks, status: 'updated' } }
                  : n
              )
            )
          }
        } else if (msg.type === 'node_error') {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === msg.node_id
                ? { ...n, data: { ...n.data, status: 'error', output: msg.error } }
                : n
            )
          )
          setIsRunning(false)
        } else if (msg.type === 'done') {
          setFinalOutput(msg.final)
          setIsRunning(false)
        } else if (msg.type === 'error') {
          setIsRunning(false)
        }
      }

      executeWorkflow({
        nodes,
        edges,
        initialInput,
        ollamaUrl: url,
        onEvent,
        signal: abortRef.current.signal,
      }).catch(() => setIsRunning(false))
    },
    [nodes, edges, isRunning, ollamaUrl, setNodes]
  )

  const stopWorkflow = useCallback(() => {
    abortRef.current?.abort()
    setIsRunning(false)
  }, [])

  const toggleNodeTask = useCallback((nodeId, taskId) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                tasks: (n.data.tasks || []).map((t) =>
                  t.id === taskId ? { ...t, done: !t.done } : t
                ),
              },
            }
          : n
      )
    )
  }, [setNodes])

  const closeModelManager = useCallback(() => setShowModelManager(false), [])

  // ── Workflow save / load ──────────────────────────────────────────────────
  const handleSave = useCallback(async (name) => {
    setSaveStatus('saving')
    try {
      const token = await getToken()
      const result = await saveWorkflow({
        id:    currentWorkflowId,
        name,
        nodes: nodes.map((n) => ({ ...n })),
        edges: edges.map((e) => ({ ...e })),
      }, token)
      setCurrentWorkflowId(result.id)
      setCurrentWorkflowName(name)
      setSaveStatus('saved')
      setShowSaveDialog(false)
      setTimeout(() => setSaveStatus(null), 2000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }, [currentWorkflowId, nodes, edges, getToken])

  const handleLoad = useCallback(async (id) => {
    try {
      const token = await getToken()
      const wf = await getWorkflow(id, token)
      setNodes(wf.nodes || [])
      setEdges(wf.edges || [])
      setCurrentWorkflowId(wf.id)
      setCurrentWorkflowName(wf.name)
      setSelectedNodeId(null)
      setFinalOutput('')
      setShowWorkflowManager(false)
    } catch {
      alert('워크플로우를 불러오지 못했습니다')
    }
  }, [setNodes, setEdges, getToken])

  const handleNewWorkflow = useCallback(() => {
    setNodes([])
    setEdges([])
    setCurrentWorkflowId(null)
    setCurrentWorkflowName('새 워크플로우')
    setSelectedNodeId(null)
    setFinalOutput('')
  }, [setNodes, setEdges])

  const handleSetupComplete = useCallback((url, newModels) => {
    setOllamaUrl(url)
    setModels(newModels)
    setOllamaOk(true)
    setShowSetup(false)
    fetchModels(url)
      .then(({ models: m, ramEstimates: r }) => { setModels(m); setRamEstimates(r) })
      .catch(() => {})
  }, [])

  const refreshModels = useCallback(() => {
    const url = localStorage.getItem('ollama_url') || ollamaUrl
    fetchModels(url)
      .then(({ models: m, ramEstimates: r }) => { setModels(m); setRamEstimates(r) })
      .catch(() => {})
  }, [ollamaUrl])

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-glyph">⬡</span>
            <span className="logo-text">AI Factory</span>
          </div>
          <div className="header-divider" />
          <span className="header-tagline">{t('tagline')}</span>
        </div>

        <div className="header-right">
          <div className="node-count-badge">
            {nodes.length} {t('nodes')} · {edges.length} {t('connections')}
          </div>
          <button
            className={`ollama-status ${ollamaOk === true ? 'ok' : ollamaOk === false ? 'err' : 'pending'}`}
            onClick={() => setShowSetup(true)}
            title={t('setupTitle')}
            style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
          >
            <span className="ollama-dot" />
            <span className="ollama-label">
              {ollamaOk === true ? t('ollamaConnected') : ollamaOk === false ? t('ollamaOffline') : '...'}
            </span>
            <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.6 }}>⚙</span>
          </button>

          <div className="header-workflow">
            <span className="workflow-name">{currentWorkflowName}</span>
            <div className="workflow-actions">
              <button className="wf-btn" onClick={handleNewWorkflow} title={t('newWorkflow')}>
                {t('create')}
              </button>
              <button
                className="wf-btn"
                onClick={() => setShowWorkflowManager(true)}
                title={t('savedWorkflows')}
              >
                {t('load')}
              </button>
              <button
                className={`wf-btn wf-btn-save ${saveStatus === 'saved' ? 'saved' : saveStatus === 'error' ? 'error' : ''}`}
                onClick={() => {
                  if (!isSignedIn) return alert(t('saveRequiresLogin'))
                  if (!isConfigured()) return alert(t('workerNotConfigured'))
                  setShowSaveDialog(true)
                }}
                disabled={saveStatus === 'saving'}
                title={t('save')}
              >
                {saveStatus === 'saving' ? t('saving') : saveStatus === 'saved' ? t('saved') : saveStatus === 'error' ? t('saveFailed') : t('save')}
              </button>
            </div>
          </div>

          <select
            className="lang-switcher"
            value={lang}
            onChange={(e) => switchLang(e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
            ))}
          </select>
          {isSignedIn && user?.id === import.meta.env.VITE_ADMIN_USER_ID && (
            <button
              className="admin-btn"
              onClick={() => setShowAdmin(true)}
              title="Admin Dashboard"
            >
              ◆
            </button>
          )}
          <div className="auth-area">
            {HAS_CLERK ? (
              isSignedIn ? (
                <UserButton
                  afterSignOutUrl={window.location.href}
                  appearance={{
                    elements: { avatarBox: { width: 30, height: 30 } }
                  }}
                />
              ) : (
                <SignInButton mode="modal">
                  <button className="sign-in-btn">{t('signIn')}</button>
                </SignInButton>
              )
            ) : null}
          </div>
        </div>
      </header>

      <div className="workspace">
        <Sidebar onOpenModelManager={() => setShowModelManager(true)} />

        <div className="canvas-wrap">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            snapToGrid
            snapGrid={[24, 24]}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={EDGE_DEFAULTS}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e1e30" />
            <Controls className="rf-controls" />
            <div className={`minimap-wrapper ${showMinimap ? 'open' : 'closed'}`}>
              <button
                className="minimap-toggle"
                onClick={() => setShowMinimap(v => { const next = !v; localStorage.setItem('show_minimap', String(next)); return next })}
              >
                <span className="minimap-arrow">{showMinimap ? '▼' : '▲'}</span>
              </button>
              {showMinimap && (
                <MiniMap
                  nodeColor={(n) => {
                    if (n.type === 'taskListNode') return '#1a3d30'
                    if (n.type === 'utilityNode')  return '#78350f'
                    const s = n.data?.status
                    if (s === 'running') return '#fb923c'
                    if (s === 'done') return '#06d6a0'
                    if (s === 'error') return '#f43f5e'
                    return '#5b8df8'
                  }}
                  maskColor="rgba(8,8,16,0.85)"
                  style={{ background: '#0f0f1a', border: '1px solid #252535', borderTop: 'none' }}
                />
              )}
            </div>
            {nodes.length === 0 && (
              <div className="canvas-empty">
                <div className="empty-icon">⬡</div>
                <p className="empty-title">{t('emptyTitle')}</p>
                <p className="empty-sub">{t('emptySub')}</p>
              </div>
            )}
          </ReactFlow>
        </div>

        {selectedNode && (
          <ConfigPanel
            node={selectedNode}
            models={models}
            ramEstimates={ramEstimates}
            systemStats={null}
            onChange={(updates) => updateNode(selectedNodeId, updates)}
            onClose={() => setSelectedNodeId(null)}
            onDelete={() => deleteNode(selectedNodeId)}
          />
        )}
      </div>

      {showModelManager && (
        <ModelManager
          onClose={closeModelManager}
          onModelsChange={refreshModels}
        />
      )}

      {showSetup && (
        <OllamaSetup onComplete={handleSetupComplete} />
      )}

      {showWorkflowManager && (
        <WorkflowManager
          onLoad={handleLoad}
          onClose={() => setShowWorkflowManager(false)}
        />
      )}

      {showSaveDialog && (
        <SaveDialog
          currentName={currentWorkflowName}
          onSave={handleSave}
          onClose={() => setShowSaveDialog(false)}
        />
      )}

      {showAdmin && (
        <AdminDashboard onClose={() => setShowAdmin(false)} />
      )}

      <RunPanel
        isRunning={isRunning}
        finalOutput={finalOutput}
        nodeCount={nodes.filter((n) => n.type === 'agentNode' || n.type === 'utilityNode').length}
        onRun={runWorkflow}
        onStop={stopWorkflow}
        nodes={nodes}
        onTaskToggle={toggleNodeTask}
      />
    </div>
  )
}
