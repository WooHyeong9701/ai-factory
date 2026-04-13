// Pure-JS workflow execution engine.
// Calls Ollama directly — no backend server required.
import { streamChat } from './providers/index'
import {
  extractJsonPath,
  applyTextTransform,
  splitText,
  renderTemplate,
} from './utils/textTools'

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
        for await (const token of streamChat({
          providerId: node.data.provider || 'ollama',
          model: node.data.model,
          messages,
          signal,
          options: opts,
          ollamaUrl,
        })) {
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
                for await (const token of streamChat({
                  providerId: downNode.data.provider || 'ollama',
                  model: downNode.data.model,
                  messages: msgs,
                  signal,
                  options: downOpts,
                  ollamaUrl,
                })) {
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
      } else if (kind === 'api_request') {
        // ── API Request node: fetch data from URL ──────────────────────────
        try {
          const config = node.data.config || {}
          const url = config.url
          if (!url) throw new Error('URL is required')

          const method = config.method || 'GET'
          let headers = {}
          if (config.headers) {
            try { headers = JSON.parse(config.headers) } catch { /* ignore parse error */ }
          }

          const fetchOpts = { method, headers, signal }
          if (method !== 'GET' && method !== 'HEAD') {
            fetchOpts.body = config.body || nodeInput || ''
          }

          const res = await fetch(url, fetchOpts)
          if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
          const rawText = await res.text()

          // JSON path extraction
          let result = rawText
          const jsonPath = config.json_path?.trim()
          if (jsonPath) {
            try {
              const parsed = JSON.parse(rawText)
              result = extractJsonPath(parsed, jsonPath)
            } catch {
              // Not JSON or parse failed — use raw text
              result = rawText
            }
          }

          outputs[nodeId] = result
          onEvent({ type: 'token', node_id: nodeId, token: result })
          onEvent({ type: 'node_done', node_id: nodeId, output: result })
        } catch (err) {
          if (signal?.aborted || err.name === 'AbortError') {
            onEvent({ type: 'error', message: 'Aborted' })
            return
          }
          onEvent({ type: 'node_error', node_id: nodeId, error: err.message })
          return
        }
      } else if (kind === 'webhook_out') {
        // ── Webhook output: send result to external URL ────────────────────
        try {
          const config = node.data.config || {}
          const url = config.url
          if (!url) throw new Error('Webhook URL is required')

          const method = config.method || 'POST'
          let headers = { 'Content-Type': 'application/json' }
          if (config.headers) {
            try { headers = { ...headers, ...JSON.parse(config.headers) } } catch { /* ignore */ }
          }

          let body
          if (config.body_template) {
            body = config.body_template.replace(/\{\{input\}\}/g, nodeInput)
          } else {
            body = JSON.stringify({ text: nodeInput })
          }

          const res = await fetch(url, { method, headers, body, signal })
          const statusText = `${res.status} ${res.statusText}`
          const resultMsg = res.ok ? `Sent successfully (${statusText})` : `Failed (${statusText})`

          outputs[nodeId] = nodeInput // pass-through
          onEvent({ type: 'token', node_id: nodeId, token: resultMsg })
          onEvent({ type: 'node_done', node_id: nodeId, output: resultMsg })
        } catch (err) {
          if (signal?.aborted || err.name === 'AbortError') {
            onEvent({ type: 'error', message: 'Aborted' })
            return
          }
          onEvent({ type: 'node_error', node_id: nodeId, error: err.message })
          return
        }
      } else if (kind === 'text_transform') {
        // ── Text Transform: pure text ops + optional LLM modes ──────────────
        try {
          const cfg = node.data.config || {}
          const mode = cfg.mode || 'trim'

          let result
          if (mode === 'summarize' || mode === 'translate') {
            const providerId = cfg.provider || 'ollama'
            const model = cfg.model
            if (!model) throw new Error('LLM transform requires model (and provider if non-Ollama)')

            const systemPrompt = mode === 'summarize'
              ? `You are a concise summarizer. Produce a ${cfg.length || 'medium'}-length summary of the user's text. Output only the summary, no preamble.`
              : `You are a translator. Translate the user's text to ${cfg.target_language || 'English'}. Output only the translation, no explanations.`

            const messages = [
              { role: 'system', content: systemPrompt },
              { role: 'user',   content: nodeInput },
            ]

            let acc = ''
            for await (const token of streamChat({
              providerId, model, messages, signal, ollamaUrl,
            })) {
              acc += token
              onEvent({ type: 'token', node_id: nodeId, token })
            }
            result = acc
          } else {
            result = applyTextTransform(nodeInput, mode)
            onEvent({ type: 'token', node_id: nodeId, token: result })
          }

          outputs[nodeId] = result
          onEvent({ type: 'node_done', node_id: nodeId, output: result })
        } catch (err) {
          if (signal?.aborted || err.name === 'AbortError') {
            onEvent({ type: 'error', message: 'Aborted' })
            return
          }
          onEvent({ type: 'node_error', node_id: nodeId, error: err.message })
          return
        }
      } else if (kind === 'text_split') {
        // ── Text Split: split input and optionally fan out to downstream ───
        try {
          const cfg = node.data.config || {}
          const splitMode = cfg.split_mode || 'paragraphs'
          const splitVal  = cfg.split_value
          const maxChunks = parseInt(cfg.max_chunks) || 20
          const separator = (cfg.separator || '\\n---\\n').replace(/\\n/g, '\n')
          const fanout    = (cfg.fanout || 'on') !== 'off'

          const chunks = splitText(nodeInput, splitMode, splitVal, maxChunks)

          if (!fanout || chunks.length === 0) {
            const joined = chunks.join(separator)
            outputs[nodeId] = joined
            onEvent({ type: 'token', node_id: nodeId, token: joined })
            onEvent({ type: 'node_done', node_id: nodeId, output: joined })
          } else {
            // Fan-out: run each direct downstream node once per chunk.
            const downEdges = execEdges.filter((e) => e.source === nodeId)
            const downIds = downEdges.map((e) => e.target)
            outputs[nodeId] = chunks.join(separator)

            for (const downId of downIds) {
              const downNode = nodeMap[downId]
              if (!downNode) continue

              const iterResults = []
              onEvent({ type: 'node_start', node_id: downId })

              for (let ci = 0; ci < chunks.length; ci++) {
                if (signal?.aborted) {
                  onEvent({ type: 'error', message: 'Aborted' })
                  return
                }
                const chunk = chunks[ci]

                if (downNode.type === 'agentNode') {
                  try {
                    const sys = (downNode.data.role || '') + returnTypeInstruction(downNode.data.return_type)
                    const msgs = []
                    if (sys.trim()) msgs.push({ role: 'system', content: sys })
                    msgs.push({ role: 'user', content: chunk })
                    const downOpts = buildOptions(downNode.data)

                    let fullOutput = ''
                    for await (const token of streamChat({
                      providerId: downNode.data.provider || 'ollama',
                      model: downNode.data.model,
                      messages: msgs,
                      signal,
                      options: downOpts,
                      ollamaUrl,
                    })) {
                      fullOutput += token
                      onEvent({ type: 'token', node_id: downId, token })
                    }
                    iterResults.push(fullOutput)
                    if (ci < chunks.length - 1) {
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
                  // Non-agent downstream: pass chunk through
                  iterResults.push(chunk)
                }
              }

              const finalOutput = iterResults.join(separator)
              outputs[downId] = finalOutput
              loopHandled.add(downId)
              onEvent({ type: 'node_done', node_id: downId, output: finalOutput })
            }

            const summary = `Split into ${chunks.length} chunk(s)`
            onEvent({ type: 'node_done', node_id: nodeId, output: summary })
          }
        } catch (err) {
          onEvent({ type: 'node_error', node_id: nodeId, error: err.message })
          return
        }
      } else if (kind === 'text_merge') {
        // ── Text Merge: combine incoming edges' outputs with config ────────
        try {
          const cfg = node.data.config || {}
          const separator = (cfg.separator || '\\n\\n').replace(/\\n/g, '\n').replace(/\\t/g, '\t')
          const wrapEach  = (cfg.wrap_each || '').replace(/\\n/g, '\n')
          const prefix    = (cfg.prefix || '').replace(/\\n/g, '\n')
          const suffix    = (cfg.suffix || '').replace(/\\n/g, '\n')

          // Gather each incoming node's output individually (not pre-joined)
          const parts = incoming
            .map((e) => outputs[e.source])
            .filter((v) => v != null && v !== '')

          const wrapped = wrapEach
            ? parts.map((p) => renderTemplate(wrapEach, { input: p }))
            : parts

          const merged = (prefix ? prefix : '') + wrapped.join(separator) + (suffix ? suffix : '')
          outputs[nodeId] = merged
          onEvent({ type: 'token', node_id: nodeId, token: merged })
          onEvent({ type: 'node_done', node_id: nodeId, output: merged })
        } catch (err) {
          onEvent({ type: 'node_error', node_id: nodeId, error: err.message })
          return
        }
      } else if (kind === 'json_parse') {
        // ── JSON Parser: extract fields from JSON input ────────────────────
        try {
          const cfg = node.data.config || {}
          const path = cfg.json_path || ''
          const fallback = cfg.fallback_raw || 'return_raw'

          let result
          try {
            const parsed = JSON.parse(nodeInput)
            result = extractJsonPath(parsed, path)
          } catch (parseErr) {
            if (fallback === 'error') throw new Error(`JSON parse failed: ${parseErr.message}`)
            if (fallback === 'return_empty') result = ''
            else result = nodeInput // return_raw
          }

          outputs[nodeId] = result
          onEvent({ type: 'token', node_id: nodeId, token: result })
          onEvent({ type: 'node_done', node_id: nodeId, output: result })
        } catch (err) {
          onEvent({ type: 'node_error', node_id: nodeId, error: err.message })
          return
        }
      } else if (kind === 'template') {
        // ── Template: substitute {var} placeholders ─────────────────────────
        try {
          const cfg = node.data.config || {}
          const tpl = cfg.template || ''

          const vars = { input: nodeInput }
          // Add per-source-node values keyed by source node name or id
          for (const e of incoming) {
            const src = nodeMap[e.source]
            const val = outputs[e.source]
            if (val == null) continue
            if (src?.data?.name) vars[src.data.name] = val
            vars[e.source] = val
          }
          // Parse user variables JSON
          if (cfg.variables) {
            try {
              const userVars = JSON.parse(cfg.variables)
              Object.assign(vars, userVars)
            } catch { /* ignore parse error */ }
          }

          const result = renderTemplate(tpl, vars)
          outputs[nodeId] = result
          onEvent({ type: 'token', node_id: nodeId, token: result })
          onEvent({ type: 'node_done', node_id: nodeId, output: result })
        } catch (err) {
          onEvent({ type: 'node_error', node_id: nodeId, error: err.message })
          return
        }
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
