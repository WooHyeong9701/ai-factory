// Pure-JS workflow execution engine.
// Calls Ollama directly — no backend server required.
import { streamChat } from './ollamaClient'

// ── Topological sort ──────────────────────────────────────────────────────────
function topoSort(nodes, edges) {
  const ids = new Set(nodes.map((n) => n.id))
  const inDegree = {}
  const graph = {}
  for (const n of nodes) {
    inDegree[n.id] = 0
    graph[n.id] = []
  }
  for (const e of edges) {
    if (ids.has(e.source) && ids.has(e.target)) {
      graph[e.source].push(e.target)
      inDegree[e.target]++
    }
  }
  const queue = nodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id)
  const order = []
  while (queue.length) {
    const id = queue.shift()
    order.push(id)
    for (const next of graph[id]) {
      if (--inDegree[next] === 0) queue.push(next)
    }
  }
  return order
}

// ── Propagate skip through downstream nodes ───────────────────────────────────
function propagateSkip(nodeId, skipped, edges, allIds) {
  skipped.add(nodeId)
  for (const e of edges) {
    if (e.source !== nodeId || skipped.has(e.target)) continue
    // Only skip if ALL incoming edges for the target are from skipped nodes
    const incoming = edges.filter((x) => x.target === e.target && allIds.has(x.source))
    if (incoming.every((x) => skipped.has(x.source))) {
      propagateSkip(e.target, skipped, edges, allIds)
    }
  }
}

// ── Return-type system prompt suffix ─────────────────────────────────────────
function returnTypeInstruction(returnType) {
  switch (returnType) {
    case 'json':     return '\nReturn your response as valid JSON only. No explanation, just the JSON object.'
    case 'bullet':   return '\nReturn your response as a bullet-point list using - or * prefixes.'
    case 'korean':   return '\n반드시 한국어로만 답변하세요.'
    case 'tasklist': return '\nReturn your response as a task list. Use "- [ ] task" for pending and "- [x] task" for completed items.'
    default:         return ''
  }
}

// ── Branch condition evaluation ───────────────────────────────────────────────
function evalBranch(input, conditionType, conditionValue) {
  switch (conditionType) {
    case '포함':
    case 'contains':
      return input.includes(conditionValue)
    case '미포함':
    case 'not_contains':
      return !input.includes(conditionValue)
    case '길이 이상':
    case 'length_gte':
      return input.length >= parseInt(conditionValue || '0')
    case '길이 이하':
    case 'length_lte':
      return input.length <= parseInt(conditionValue || '0')
    case '정규식':
    case 'regex': {
      try { return new RegExp(conditionValue).test(input) } catch { return false }
    }
    case '항상 참':
    case 'always_true':
      return true
    default: return false
  }
}

// ── Build Ollama options from node data ───────────────────────────────────────
function buildOptions(data) {
  const opts = {}
  if (data.temperature != null && data.temperature !== '') opts.temperature = parseFloat(data.temperature)
  if (data.top_p != null && data.top_p !== '')             opts.top_p = parseFloat(data.top_p)
  if (data.top_k != null && data.top_k !== '')             opts.top_k = parseInt(data.top_k)
  if (data.max_tokens != null && data.max_tokens !== '')   opts.num_predict = parseInt(data.max_tokens)
  if (data.repeat_penalty != null && data.repeat_penalty !== '') opts.repeat_penalty = parseFloat(data.repeat_penalty)
  if (data.seed != null && data.seed !== '')               opts.seed = parseInt(data.seed)
  // Remove NaN values
  for (const k of Object.keys(opts)) {
    if (Number.isNaN(opts[k])) delete opts[k]
  }
  return Object.keys(opts).length > 0 ? opts : undefined
}

// ── Main runner ────────────────────────────────────────────────────────────────
// onEvent(msg) — same event shape as the old WebSocket messages so App.jsx
// event handling stays identical:
//   { type: 'node_start', node_id }
//   { type: 'token',      node_id, token }
//   { type: 'node_done',  node_id, output }
//   { type: 'node_error', node_id, error }
//   { type: 'tasklist_update', node_id, output }   ← new, replaces inline logic
//   { type: 'done',       final }
//   { type: 'error',      message }
export async function runWorkflow({ nodes, edges, initialInput, ollamaUrl, onEvent, signal }) {
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]))

  // Exclude task-list nodes from execution order
  const execNodes = nodes.filter((n) => n.type !== 'taskListNode')
  const allExecIds = new Set(execNodes.map((n) => n.id))
  const execEdges  = edges.filter((e) => allExecIds.has(e.source) && allExecIds.has(e.target))

  const order  = topoSort(execNodes, execEdges)
  const outputs = {}  // nodeId → string
  const skipped = new Set()
  const loopHandled = new Set()  // nodes already executed by a loop node

  for (let i = 0; i < order.length; i++) {
    const nodeId = order[i]

    if (signal?.aborted) {
      onEvent({ type: 'error', message: 'Aborted' })
      return
    }

    if (skipped.has(nodeId) || loopHandled.has(nodeId)) continue

    const node = nodeMap[nodeId]
    if (!node) continue

    // ── Determine input ─────────────────────────────────────────────────────
    const incoming = execEdges.filter((e) => e.target === nodeId)
    let nodeInput = initialInput
    if (incoming.length > 0) {
      const parts = incoming.map((e) => outputs[e.source]).filter((v) => v != null)
      nodeInput = parts.length > 0 ? parts.join('\n\n') : initialInput
    }

    onEvent({ type: 'node_start', node_id: nodeId })

    // ── Agent node ──────────────────────────────────────────────────────────
    if (node.type === 'agentNode') {
      try {
        const systemContent = (node.data.role || '') + returnTypeInstruction(node.data.return_type)
        const messages = []
        if (systemContent.trim()) messages.push({ role: 'system', content: systemContent })
        messages.push({ role: 'user', content: nodeInput })
        const opts = buildOptions(node.data)

        let fullOutput = ''
        for await (const token of streamChat(ollamaUrl, node.data.model, messages, signal, opts)) {
          fullOutput += token
          onEvent({ type: 'token', node_id: nodeId, token })
        }

        outputs[nodeId] = fullOutput
        onEvent({ type: 'node_done', node_id: nodeId, output: fullOutput })

        // Notify connected task-list nodes
        if (node.data.return_type === 'tasklist' && fullOutput) {
          for (const e of edges) {
            if (e.source === nodeId && nodeMap[e.target]?.type === 'taskListNode') {
              onEvent({ type: 'tasklist_update', node_id: e.target, output: fullOutput })
            }
          }
        }
      } catch (err) {
        if (signal?.aborted || err.name === 'AbortError') {
          onEvent({ type: 'error', message: 'Aborted' })
          return
        }
        onEvent({ type: 'node_error', node_id: nodeId, error: err.message })
        return
      }
    }

    // ── Utility node ────────────────────────────────────────────────────────
    else if (node.type === 'utilityNode') {
      const kind = node.data.kind

      if (kind === 'branch') {
        const conditionType  = node.data.config?.condition_type  || '포함'
        const conditionValue = node.data.config?.condition_value || ''
        const result = evalBranch(nodeInput, conditionType, conditionValue)

        outputs[nodeId] = nodeInput
        onEvent({ type: 'node_done', node_id: nodeId, output: nodeInput })

        // Skip the inactive path
        const inactiveTargets = edges
          .filter((e) => e.source === nodeId && e.sourceHandle === (result ? 'false' : 'true'))
          .map((e) => e.target)

        for (const tid of inactiveTargets) {
          propagateSkip(tid, skipped, execEdges, allExecIds)
        }
      } else if (kind === 'loop') {
        // ── Loop node: re-execute downstream nodes N times ──────────────────
        const iterations = parseInt(node.data.config?.iterations) || 3
        const mode = node.data.config?.mode || 'same_input'
        const separator = (node.data.config?.separator || '\\n---\\n').replace(/\\n/g, '\n')

        // Find direct downstream nodes connected from this loop node
        const downEdges = execEdges.filter((e) => e.source === nodeId)
        const downIds = downEdges.map((e) => e.target)

        // Mark the loop node itself as producing its input (pass-through)
        outputs[nodeId] = nodeInput

        for (const downId of downIds) {
          const downNode = nodeMap[downId]
          if (!downNode) continue

          const iterResults = []
          onEvent({ type: 'node_start', node_id: downId })

          for (let iter = 0; iter < iterations; iter++) {
            if (signal?.aborted) {
              onEvent({ type: 'error', message: 'Aborted' })
              return
            }

            // same_input → always use the loop's input; chain → feed previous output
            const curInput = mode === 'chain' && iter > 0
              ? iterResults[iterResults.length - 1]
              : nodeInput

            if (downNode.type === 'agentNode') {
              try {
                const sys = (downNode.data.role || '') + returnTypeInstruction(downNode.data.return_type)
                const msgs = []
                if (sys.trim()) msgs.push({ role: 'system', content: sys })
                msgs.push({ role: 'user', content: curInput })
                const downOpts = buildOptions(downNode.data)

                let fullOutput = ''
                for await (const token of streamChat(ollamaUrl, downNode.data.model, msgs, signal, downOpts)) {
                  fullOutput += token
                  onEvent({ type: 'token', node_id: downId, token })
                }
                iterResults.push(fullOutput)

                // Visual separator between iterations (same_input mode)
                if (iter < iterations - 1 && mode === 'same_input') {
                  onEvent({ type: 'token', node_id: downId, token: separator })
                }
              } catch (err) {
                if (signal?.aborted || err.name === 'AbortError') {
                  onEvent({ type: 'error', message: 'Aborted' })
                  return
                }
                onEvent({ type: 'node_error', node_id: downId, error: err.message })
                return
              }
            } else {
              // Non-agent downstream inside loop — just pass input through
              iterResults.push(curInput)
            }
          }

          const finalOutput = mode === 'chain'
            ? iterResults[iterResults.length - 1] || ''
            : iterResults.join(separator)

          outputs[downId] = finalOutput
          loopHandled.add(downId)
          onEvent({ type: 'node_done', node_id: downId, output: finalOutput })

          // Notify connected task-list nodes from loop child
          if (downNode.data?.return_type === 'tasklist' && finalOutput) {
            for (const e of edges) {
              if (e.source === downId && nodeMap[e.target]?.type === 'taskListNode') {
                onEvent({ type: 'tasklist_update', node_id: e.target, output: finalOutput })
              }
            }
          }
        }

        const loopSummary = `Loop ${iterations}x (${mode}) completed`
        onEvent({ type: 'node_done', node_id: nodeId, output: loopSummary })
      } else {
        // All other utility nodes: pass input through
        outputs[nodeId] = nodeInput
        onEvent({ type: 'node_done', node_id: nodeId, output: nodeInput })
      }
    }
  }

  // Final output: last executed node's output
  const lastId = [...order].reverse().find((id) => !skipped.has(id) && outputs[id] != null)
  onEvent({ type: 'done', final: outputs[lastId] || '' })
}
