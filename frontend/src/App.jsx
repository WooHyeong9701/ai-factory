import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth as _useAuth, useUser as _useUser, SignInButton, UserButton } from '@clerk/clerk-react'

const HAS_CLERK = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const noopAuth = { isSignedIn: false, getToken: async () => null }
const noopUser = { user: null }
function useAuth() { return HAS_CLERK ? _useAuth() : noopAuth }
function useUser() { return HAS_CLERK ? _useUser() : noopUser }
import { API_BASE, WS_BASE } from './config'
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
import SystemMonitor from './components/SystemMonitor'
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
  style: { stroke: '#5b8df8', strokeWidth: 2 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 18,
    height: 18,
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
  const [systemStats, setSystemStats] = useState(null)
  const [memoryAlert, setMemoryAlert] = useState(null)
  const [swapAlert, setSwapAlert] = useState(null)
  const [showModelManager, setShowModelManager] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [ollamaUrl, setOllamaUrl] = useState(() => localStorage.getItem('ollama_url') || 'http://localhost:11434')
  const [showWorkflowManager, setShowWorkflowManager] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [currentWorkflowId, setCurrentWorkflowId] = useState(null)
  const [currentWorkflowName, setCurrentWorkflowName] = useState('새 워크플로우')
  const [saveStatus, setSaveStatus] = useState(null) // null | 'saving' | 'saved' | 'error'
  const [showAdmin, setShowAdmin] = useState(false)
  const wsRef = useRef(null)
  const pollRef = useRef(null)

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

  // ── Fetch system stats ──────────────────────────────────────────────────────
  const fetchStats = useCallback(() => {
    fetch(`${API_BASE}/api/system`)
      .then((r) => r.json())
      .then(setSystemStats)
      .catch(() => {})
  }, [])

  // ── On mount: fetch models + health + start polling ─────────────────────────
  useEffect(() => {
    // Show setup if no URL was ever saved
    if (!localStorage.getItem('ollama_url')) {
      setShowSetup(true)
      return
    }

    const url = localStorage.getItem('ollama_url') || ollamaUrl
    fetch(`${API_BASE}/api/health?ollama_url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((d) => {
        setOllamaOk(d.ollama)
        if (!d.ollama) setShowSetup(true)
      })
      .catch(() => { setOllamaOk(false); setShowSetup(true) })

    fetch(`${API_BASE}/api/models?ollama_url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((d) => {
        setModels(d.models || [])
        setRamEstimates(d.ram_estimates || {})
      })
      .catch(() => {})

    fetchStats()
    // Poll every 3s at rest
    pollRef.current = setInterval(fetchStats, 3000)
    return () => clearInterval(pollRef.current)
  }, [fetchStats]) // eslint-disable-line react-hooks/exhaustive-deps

  // During run, poll faster (every 1s); pause when modal is open
  useEffect(() => {
    clearInterval(pollRef.current)
    if (showAdmin || showModelManager) return
    pollRef.current = setInterval(fetchStats, isRunning ? 1000 : 3000)
    return () => clearInterval(pollRef.current)
  }, [isRunning, fetchStats, showAdmin, showModelManager])

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
      setMemoryAlert(null)
      setSwapAlert(null)
      setIsRunning(true)

      // Separate nodes by type
      const agentNodes   = nodes.filter((n) => n.type === 'agentNode')
      const utilityNodes = nodes.filter((n) => n.type === 'utilityNode')
      const execNodeIds  = new Set([...agentNodes, ...utilityNodes].map((n) => n.id))

      const payload = {
        nodes: agentNodes.map((n) => ({
          id: n.id,
          name: n.data.name,
          node_type: 'agent',
          role: n.data.role,
          model: n.data.model,
          return_type: n.data.return_type,
        })),
        utility_nodes: utilityNodes.map((n) => ({
          id: n.id,
          name: n.data.name,
          node_type: 'utility',
          kind: n.data.kind,
          config: n.data.config || {},
        })),
        edges: edges
          .filter((e) => execNodeIds.has(e.source) && execNodeIds.has(e.target))
          .map((e) => ({ source: e.source, target: e.target })),
        initial_input: initialInput,
        ollama_url: localStorage.getItem('ollama_url') || ollamaUrl,
      }

      const ws = new WebSocket(`${WS_BASE}/ws/run`)
      wsRef.current = ws

      ws.onopen = () => ws.send(JSON.stringify(payload))

      ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data)

        // Update system stats from any message that includes them
        if (msg.ram_total_gb !== undefined) {
          setSystemStats({
            ram_total_gb: msg.ram_total_gb,
            ram_used_gb: msg.ram_used_gb,
            ram_available_gb: msg.ram_available_gb,
            ram_percent: msg.ram_percent,
            cpu_percent: msg.cpu_percent,
            swap_total_gb: msg.swap_total_gb,
            swap_used_gb: msg.swap_used_gb,
            swap_percent: msg.swap_percent,
          })
        }

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
          setNodes((nds) => {
            const markedDone = nds.map((n) =>
              n.id === msg.node_id ? { ...n, data: { ...n.data, status: 'done' } } : n
            )

            // If this node has tasklist return type, parse and push to connected task list nodes
            const doneNode = markedDone.find((n) => n.id === msg.node_id)
            if (doneNode?.data.return_type === 'tasklist' && msg.output) {
              const parsedTasks = parseTasksFromText(msg.output)
              if (parsedTasks.length > 0) {
                const taskListTargetIds = edges
                  .filter((e) => e.source === msg.node_id)
                  .map((e) => e.target)
                return markedDone.map((n) =>
                  taskListTargetIds.includes(n.id) && n.type === 'taskListNode'
                    ? { ...n, data: { ...n.data, tasks: parsedTasks, status: 'updated' } }
                    : n
                )
              }
            }
            return markedDone
          })
        } else if (msg.type === 'node_error') {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === msg.node_id
                ? { ...n, data: { ...n.data, status: 'error', output: msg.error } }
                : n
            )
          )
          setIsRunning(false)
        } else if (msg.type === 'memory_abort') {
          // Catastrophic: not enough RAM — mark node as error, show alert
          setNodes((nds) =>
            nds.map((n) =>
              n.id === msg.node_id
                ? { ...n, data: { ...n.data, status: 'error', output: '메모리 부족으로 중단됨' } }
                : n
            )
          )
          setMemoryAlert(msg)
          setIsRunning(false)
        } else if (msg.type === 'swap_warning') {
          setSwapAlert(msg)
        } else if (msg.type === 'done') {
          setFinalOutput(msg.final)
          setIsRunning(false)
        } else if (msg.type === 'error') {
          setIsRunning(false)
        }
      }

      ws.onerror = () => setIsRunning(false)
      ws.onclose = () => setIsRunning(false)
    },
    [nodes, edges, isRunning, setNodes]
  )

  const stopWorkflow = useCallback(() => {
    wsRef.current?.close()
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
    // Re-fetch with new URL
    fetch(`${API_BASE}/api/models?ollama_url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((d) => { setModels(d.models || []); setRamEstimates(d.ram_estimates || {}) })
      .catch(() => {})
  }, [])

  const refreshModels = useCallback(() => {
    const url = localStorage.getItem('ollama_url') || ollamaUrl
    fetch(`${API_BASE}/api/models?ollama_url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((d) => { setModels(d.models || []); setRamEstimates(d.ram_estimates || {}) })
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

        <div className="header-center">
          <SystemMonitor stats={systemStats} compact />
        </div>

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

      {/* Memory abort alert banner */}
      {memoryAlert && (
        <div className="memory-alert-banner">
          <span className="alert-icon">🛑</span>
          <div className="alert-body">
            <strong>메모리 부족 — 워크플로우 자동 중단</strong>
            <ul>
              {memoryAlert.issues.map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
            <span className="alert-hint">
              더 작은 모델 사용을 권장합니다. 현재 가용 RAM: <b>{memoryAlert.available_gb?.toFixed(1)}GB</b>
            </span>
          </div>
          <button className="alert-close" onClick={() => setMemoryAlert(null)}>✕</button>
        </div>
      )}

      {/* Swap warning banner (non-fatal) */}
      {swapAlert && !memoryAlert && (
        <div className="swap-alert-banner">
          <span className="alert-icon">⚠️</span>
          <span>스왑 {swapAlert.swap_used_gb?.toFixed(1)}GB 사용 중 — 성능 저하 가능. 가용 RAM: {swapAlert.available_gb?.toFixed(1)}GB</span>
          <button className="alert-close" onClick={() => setSwapAlert(null)}>✕</button>
        </div>
      )}

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
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={EDGE_DEFAULTS}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e1e30" />
            <Controls className="rf-controls" />
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
              style={{ background: '#0f0f1a', border: '1px solid #252535' }}
            />
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
            systemStats={systemStats}
            onChange={(updates) => updateNode(selectedNodeId, updates)}
            onDelete={() => deleteNode(selectedNodeId)}
          />
        )}

      </div>

      {showModelManager && (
        <ModelManager
          onClose={closeModelManager}
          systemStats={systemStats}
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
