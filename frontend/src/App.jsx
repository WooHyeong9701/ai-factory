import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth as _useAuth, useUser as _useUser, SignInButton, UserButton } from '@clerk/clerk-react'

const HAS_CLERK = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const noopAuth = { isSignedIn: false, getToken: async () => null }
const noopUser = { user: null }
function useAuth() { return HAS_CLERK ? _useAuth() : noopAuth }
function useUser() { return HAS_CLERK ? _useUser() : noopUser }

import { testConnection, fetchModels, fetchSystemStats } from './ollamaClient'
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
  SelectionMode,
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
import SystemMonitor from './components/SystemMonitor'
import NotificationPanel from './components/NotificationPanel'
import AdminDashboard from './components/AdminDashboard'
import DocsPage from './components/DocsPage'
import Marketplace, { ShareDialog } from './components/Marketplace'
import ProviderSettings from './components/ProviderSettings'
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
  style: { stroke: '#a78bfa', strokeWidth: 2 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 18,
    height: 18,
    color: '#a78bfa',
  },
}

export default function App() {
  const { screenToFlowPosition, setCenter } = useReactFlow()
  const { isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const { t, lang, switchLang } = useI18n()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [models, setModels] = useState([])
  const [ramEstimates, setRamEstimates] = useState({})
  const [ollamaOk, setOllamaOk] = useState(null)
  const [systemStats, setSystemStats] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [finalOutput, setFinalOutput] = useState('')
  const [nodeTimes, setNodeTimes] = useState({})    // nodeId → { start, elapsed }
  const [totalTime, setTotalTime] = useState(null)   // ms
  const workflowStartRef = useRef(null)
  const nodeStartRef = useRef({})
  const [showModelManager, setShowModelManager] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [ollamaUrl, setOllamaUrl] = useState(() => localStorage.getItem('ollama_url') || 'http://localhost:11434')
  const [showWorkflowManager, setShowWorkflowManager] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [currentWorkflowId, setCurrentWorkflowId] = useState(null)
  const [currentWorkflowName, setCurrentWorkflowName] = useState('새 워크플로우')
  const [saveStatus, setSaveStatus] = useState(null) // null | 'saving' | 'saved' | 'error'
  const [showAdmin, setShowAdmin] = useState(false)
  const [showDocs, setShowDocs] = useState(false)
  const [showMarketplace, setShowMarketplace] = useState(false)
  const [showProviderSettings, setShowProviderSettings] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [nodeSearch, setNodeSearch] = useState('')
  const [nodeSearchOpen, setNodeSearchOpen] = useState(false)
  const [nodeSearchIdx, setNodeSearchIdx] = useState(0)
  const [notifications, setNotifications] = useState(() => {
    try { return JSON.parse(localStorage.getItem('notifications') || '[]') } catch { return [] }
  })
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [showMinimap, setShowMinimap] = useState(() => {
    const stored = localStorage.getItem('show_minimap')
    return stored === null ? true : stored === 'true'
  })
  const [qKeyHeld, setQKeyHeld] = useState(false)
  const abortRef = useRef(null)
  const searchInputRef = useRef(null)
  const clipboardRef = useRef({ nodes: [], edges: [] })

  // ── Notifications ───────────────────────────────────────────────────────────
  const addNotification = useCallback((type, message) => {
    const notif = { id: Date.now().toString(), type, message, timestamp: Date.now(), read: false }
    setNotifications(prev => {
      const next = [notif, ...prev].slice(0, 50) // keep max 50
      localStorage.setItem('notifications', JSON.stringify(next))
      return next
    })
  }, [])

  const markRead = useCallback((id) => {
    setNotifications(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read: true } : n)
      localStorage.setItem('notifications', JSON.stringify(next))
      return next
    })
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
    localStorage.setItem('notifications', '[]')
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  // ── Node search ─────────────────────────────────────────────────────────────
  const searchMatches = nodeSearch.trim()
    ? nodes.filter((n) => (n.data?.name || '').toLowerCase().includes(nodeSearch.trim().toLowerCase()))
    : []

  const focusNode = useCallback((node) => {
    if (!node) return
    const w = node.measured?.width ?? node.width ?? 220
    const h = node.measured?.height ?? node.height ?? 120
    setCenter(node.position.x + w / 2, node.position.y + h / 2, { zoom: 1, duration: 300 })
    setSelectedNodeId(node.id)
  }, [setCenter, setSelectedNodeId])

  const handleSearchNav = useCallback((delta) => {
    if (searchMatches.length === 0) return
    const next = (nodeSearchIdx + delta + searchMatches.length) % searchMatches.length
    setNodeSearchIdx(next)
    focusNode(searchMatches[next])
  }, [searchMatches, nodeSearchIdx, focusNode])

  const handleSearchChange = useCallback((val) => {
    setNodeSearch(val)
    setNodeSearchIdx(0)
  }, [])

  const closeSearch = useCallback(() => {
    setNodeSearchOpen(false)
    setNodeSearch('')
    setNodeSearchIdx(0)
  }, [])

  // Keyboard shortcut: Ctrl/Cmd + F to open search
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setNodeSearchOpen(true)
        setTimeout(() => searchInputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape' && nodeSearchOpen) {
        closeSearch()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [nodeSearchOpen, closeSearch])

  // Auto-focus first match when search text changes
  useEffect(() => {
    if (searchMatches.length > 0) focusNode(searchMatches[0])
  }, [nodeSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Q key tracking for drag-select mode ─────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'q' || e.key === 'Q') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
        setQKeyHeld(true)
      }
    }
    const up = (e) => {
      if (e.key === 'q' || e.key === 'Q') setQKeyHeld(false)
    }
    const blur = () => setQKeyHeld(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  // ── Copy / Paste nodes ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return

      // Cmd/Ctrl + C — copy selected nodes
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        const selectedNodes = nodes.filter((n) => n.selected)
        if (selectedNodes.length === 0) return
        const selectedIds = new Set(selectedNodes.map((n) => n.id))
        const selectedEdges = edges.filter(
          (ed) => selectedIds.has(ed.source) && selectedIds.has(ed.target)
        )
        clipboardRef.current = {
          nodes: selectedNodes.map((n) => ({ ...n, data: { ...n.data } })),
          edges: selectedEdges.map((ed) => ({ ...ed })),
        }
      }

      // Cmd/Ctrl + V — paste
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        const { nodes: copiedNodes, edges: copiedEdges } = clipboardRef.current
        if (copiedNodes.length === 0) return
        e.preventDefault()

        const idMap = {}
        const newNodes = copiedNodes.map((n) => {
          const newId = genId()
          idMap[n.id] = newId
          return {
            ...n,
            id: newId,
            selected: true,
            position: {
              x: n.position.x + 50,
              y: n.position.y + 50,
            },
            data: { ...n.data, status: 'idle', output: '' },
          }
        })

        const newEdges = copiedEdges.map((ed) => ({
          ...ed,
          id: `e-${idMap[ed.source]}-${idMap[ed.target]}`,
          source: idMap[ed.source],
          target: idMap[ed.target],
        }))

        // Deselect old nodes, add new selected ones
        setNodes((nds) => [
          ...nds.map((n) => (n.selected ? { ...n, selected: false } : n)),
          ...newNodes,
        ])
        setEdges((eds) => [...eds, ...newEdges])

        // Update clipboard positions for subsequent pastes
        clipboardRef.current = {
          nodes: copiedNodes.map((n) => ({
            ...n,
            position: { x: n.position.x + 50, y: n.position.y + 50 },
          })),
          edges: copiedEdges,
        }

        if (newNodes.length === 1) setSelectedNodeId(newNodes[0].id)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [nodes, edges, setNodes, setEdges])

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

  // ── Poll system stats every 10s ────────────────────────────────────────────
  useEffect(() => {
    if (!ollamaOk) return
    const url = localStorage.getItem('ollama_url') || ollamaUrl
    const poll = () => fetchSystemStats(url).then(setSystemStats).catch(() => {})
    poll()
    const id = setInterval(poll, 10000)
    return () => clearInterval(id)
  }, [ollamaOk, ollamaUrl])

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
            model: template.model || models[0] || '',
            ...(template.temperature != null && { temperature: template.temperature }),
            ...(template.top_p != null && { top_p: template.top_p }),
            ...(template.top_k != null && { top_k: template.top_k }),
            ...(template.max_tokens != null && { max_tokens: template.max_tokens }),
            ...(template.repeat_penalty != null && { repeat_penalty: template.repeat_penalty }),
            ...(template.seed != null && { seed: template.seed }),
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

  const onNodeClick = useCallback((event, node) => {
    setSelectedNodeId(node.id)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

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
      setNodeTimes({})
      setTotalTime(null)
      workflowStartRef.current = performance.now()
      nodeStartRef.current = {}

      const url = localStorage.getItem('ollama_url') || ollamaUrl
      abortRef.current = new AbortController()

      const onEvent = (msg) => {
        if (msg.type === 'node_start') {
          nodeStartRef.current[msg.node_id] = performance.now()
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
          const startT = nodeStartRef.current[msg.node_id]
          if (startT) {
            const elapsed = performance.now() - startT
            setNodeTimes((prev) => ({ ...prev, [msg.node_id]: elapsed }))
          }
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
          if (workflowStartRef.current) {
            const elapsed = performance.now() - workflowStartRef.current
            setTotalTime(elapsed)
            const sec = (elapsed / 1000).toFixed(1)
            addNotification('workflow_done', t('notifWorkflowDone', { time: sec }))
          }
          setFinalOutput(msg.final)
          setIsRunning(false)
        } else if (msg.type === 'error') {
          addNotification('workflow_error', t('notifWorkflowError'))
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
  const [pendingNew, setPendingNew] = useState(false)

  const resetToNewWorkflow = useCallback(() => {
    setNodes([])
    setEdges([])
    setCurrentWorkflowId(null)
    setCurrentWorkflowName('새 워크플로우')
    setSelectedNodeId(null)
    setFinalOutput('')
  }, [setNodes, setEdges])

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
      // 저장 후 새 워크플로우 대기 중이었으면 리셋
      if (pendingNew) {
        setPendingNew(false)
        setTimeout(() => resetToNewWorkflow(), 300)
      }
    } catch {
      setSaveStatus('error')
      setPendingNew(false)
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }, [currentWorkflowId, nodes, edges, getToken, pendingNew, resetToNewWorkflow])

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
      alert(t('loadFailed'))
    }
  }, [setNodes, setEdges, getToken, t])

  const handleNewWorkflow = useCallback(() => {
    if (nodes.length === 0) {
      resetToNewWorkflow()
      return
    }
    const answer = window.confirm(t('confirmNewWorkflow'))
    if (answer) {
      if (!isSignedIn) {
        alert(t('saveRequiresLogin'))
        return
      }
      if (!isConfigured()) {
        alert(t('workerNotConfigured'))
        return
      }
      setPendingNew(true)
      setShowSaveDialog(true)
    } else {
      resetToNewWorkflow()
    }
  }, [nodes, resetToNewWorkflow, isSignedIn, t])

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
            <span className="logo-glyph">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 1L18.66 6V14L10 19L1.34 14V6L10 1Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <circle cx="10" cy="10" r="3" fill="currentColor" opacity="0.5"/>
              </svg>
            </span>
            <span className="logo-text">AI Factory</span>
          </div>
          <div className="header-divider" />
          <span className="header-tagline">{t('tagline')}</span>
        </div>

        <div className="header-right">
          <SystemMonitor stats={systemStats} compact />
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
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginLeft: 4, opacity: 0.5 }}>
              <circle cx="8" cy="8" r="3"/>
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/>
            </svg>
          </button>

          <div className="header-workflow">
            <span className="workflow-name">{currentWorkflowName === '새 워크플로우' ? t('newWorkflow') : currentWorkflowName}</span>
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

          <button
            className="share-btn"
            onClick={() => {
              if (!isSignedIn) return alert(t('saveRequiresLogin'))
              if (nodes.length === 0) return alert(t('mp_noNodesToShare'))
              setShowShareDialog(true)
            }}
            title={t('mp_shareBtn')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 12V3" />
              <path d="M4 6l4-4 4 4" />
              <path d="M2 14h12" />
            </svg>
          </button>

          {nodeSearchOpen ? (
            <div className="node-search">
              <span className="node-search-icon">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M10 10l4 4"/></svg>
              </span>
              <input
                ref={searchInputRef}
                className="node-search-input"
                type="text"
                value={nodeSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchNav(e.shiftKey ? -1 : 1)
                  if (e.key === 'Escape') closeSearch()
                }}
                placeholder={t('nodeSearchPlaceholder') || 'Search nodes...'}
                autoFocus
              />
              {searchMatches.length > 0 && (
                <span className="node-search-count">{nodeSearchIdx + 1}/{searchMatches.length}</span>
              )}
              {searchMatches.length === 0 && nodeSearch.trim() && (
                <span className="node-search-count node-search-none">0</span>
              )}
              <button className="node-search-nav" onClick={() => handleSearchNav(-1)} title="Previous">▲</button>
              <button className="node-search-nav" onClick={() => handleSearchNav(1)} title="Next">▼</button>
              <button className="node-search-close" onClick={closeSearch}>✕</button>
            </div>
          ) : (
            <button className="node-search-btn" onClick={() => { setNodeSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50) }} title="Search nodes (⌘F)">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M10 10l4 4"/></svg>
            </button>
          )}

          <select
            className="lang-switcher"
            value={lang}
            onChange={(e) => switchLang(e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
            ))}
          </select>

          <button
            className="notif-bell"
            onClick={() => setShowNotifPanel(v => !v)}
            title={t('notifications')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a2 2 0 0 1-4 0"/>
              <path d="M3.5 6.5a4.5 4.5 0 0 1 9 0c0 2.5 1 4 1.5 4.5H2c.5-.5 1.5-2 1.5-4.5z"/>
            </svg>
            {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          {showNotifPanel && (
            <NotificationPanel
              notifications={notifications}
              onClear={markRead}
              onClearAll={clearAllNotifications}
              onClose={() => setShowNotifPanel(false)}
            />
          )}

          <button
            className="docs-btn"
            onClick={() => setShowProviderSettings(true)}
            title={t('ps_title')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="8" r="2.2"/>
              <path d="M12.5 8a4.5 4.5 0 00-.1-1l1.4-1.1-1.4-2.4-1.7.6a4.5 4.5 0 00-1.7-1L8.7 1h-2.8l-.3 1.7a4.5 4.5 0 00-1.7 1l-1.7-.6-1.4 2.4 1.4 1.1a4.5 4.5 0 000 2l-1.4 1.1 1.4 2.4 1.7-.6a4.5 4.5 0 001.7 1L5.9 15h2.8l.3-1.7a4.5 4.5 0 001.7-1l1.7.6 1.4-2.4-1.4-1.1a4.5 4.5 0 00.1-1z"/>
            </svg>
          </button>

          <button
            className="docs-btn"
            onClick={() => setShowDocs(true)}
            title="Docs"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 2h4.5c1.1 0 2 .67 2 1.5S7.6 5 6.5 5H2V2z"/>
              <path d="M2 5h5c1.1 0 2 .67 2 1.5S8.1 8 7 8H2V5z"/>
              <path d="M2 1v14"/>
            </svg>
          </button>

          {isSignedIn && user?.id === import.meta.env.VITE_ADMIN_USER_ID && (
            <button
              className="admin-btn"
              onClick={() => setShowAdmin(true)}
              title="Admin Dashboard"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="1" y="1" width="6" height="6" rx="1"/>
                <rect x="9" y="1" width="6" height="6" rx="1"/>
                <rect x="1" y="9" width="6" height="6" rx="1"/>
                <rect x="9" y="9" width="6" height="6" rx="1"/>
              </svg>
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
        <Sidebar onOpenModelManager={() => setShowModelManager(true)} onOpenMarketplace={() => setShowMarketplace(true)} />

        <div className={`canvas-wrap${qKeyHeld ? ' select-mode' : ''}`}>
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
            minZoom={0.15}
            snapToGrid
            snapGrid={[24, 24]}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={EDGE_DEFAULTS}
            multiSelectionKeyCode="Shift"
            selectionOnDrag={qKeyHeld}
            panOnDrag={!qKeyHeld}
            selectionMode={SelectionMode.Partial}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(167,139,250,0.06)" />
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
                    if (n.type === 'utilityNode')  return '#4a3520'
                    const s = n.data?.status
                    if (s === 'running') return '#f59e0b'
                    if (s === 'done') return '#34d399'
                    if (s === 'error') return '#f43f5e'
                    return '#a78bfa'
                  }}
                  maskColor="rgba(3,0,20,0.88)"
                  style={{ background: '#0a0a1a', border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none' }}
                />
              )}
            </div>
            {nodes.length === 0 && (
              <div className="canvas-empty">
                <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <path d="M24 4L44 15V33L24 44L4 33V15L24 4Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <circle cx="24" cy="24" r="6" fill="currentColor" opacity="0.15"/>
                </svg>
              </div>
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
            onClose={() => setSelectedNodeId(null)}
            onDelete={() => deleteNode(selectedNodeId)}
            onOpenProviderSettings={() => setShowProviderSettings(true)}
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
          onClose={() => { setShowSaveDialog(false); setPendingNew(false) }}
        />
      )}

      {showAdmin && (
        <AdminDashboard onClose={() => setShowAdmin(false)} />
      )}

      {showProviderSettings && (
        <ProviderSettings onClose={() => setShowProviderSettings(false)} />
      )}

      {showDocs && (
        <DocsPage onClose={() => setShowDocs(false)} />
      )}

      {showMarketplace && (
        <Marketplace
          onClose={() => setShowMarketplace(false)}
          onImport={(wf) => {
            setNodes(wf.nodes || [])
            setEdges(wf.edges || [])
            setCurrentWorkflowId(null)
            setCurrentWorkflowName(wf.name || '가져온 워크플로우')
            setSelectedNodeId(null)
            setFinalOutput('')
          }}
          isSignedIn={isSignedIn}
          getToken={async () => await getToken()}
        />
      )}

      {showShareDialog && (
        <ShareDialog
          nodes={nodes}
          edges={edges}
          workflowId={currentWorkflowId}
          workflowName={currentWorkflowName}
          userName={user?.fullName || user?.firstName || ''}
          userAvatar={user?.imageUrl || ''}
          getToken={async () => await getToken()}
          onClose={() => setShowShareDialog(false)}
          onPublished={() => {
            addNotification('system', '워크플로우가 마켓에 공유되었습니다!')
          }}
          t={t}
        />
      )}

      <RunPanel
        isRunning={isRunning}
        finalOutput={finalOutput}
        nodeCount={nodes.filter((n) => n.type === 'agentNode' || n.type === 'utilityNode').length}
        onRun={runWorkflow}
        onStop={stopWorkflow}
        nodes={nodes}
        onTaskToggle={toggleNodeTask}
        nodeTimes={nodeTimes}
        totalTime={totalTime}
      />
    </div>
  )
}
