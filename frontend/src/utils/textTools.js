// Shared text utilities used by workflowRunner and utility nodes.

// ── JSON path extractor ──────────────────────────────────────────────────────
// Supports: "title", "data.name", "[*].title", "data.items[*].name", "[0].id"
export function extractJsonPath(data, path) {
  if (!path || !path.trim()) return data

  const tokens = []
  for (const part of path.split('.')) {
    const m = part.match(/^([^[]*)\[([^\]]*)\]$/)
    if (m) {
      if (m[1]) tokens.push({ type: 'key', val: m[1] })
      tokens.push({ type: 'index', val: m[2] })
    } else if (part) {
      tokens.push({ type: 'key', val: part })
    }
  }

  let current = data
  for (const tok of tokens) {
    if (current == null) return ''
    if (tok.type === 'key') {
      if (Array.isArray(current)) {
        current = current.map((item) => item?.[tok.val]).filter((v) => v !== undefined)
      } else {
        current = current[tok.val]
      }
    } else if (tok.type === 'index') {
      if (tok.val === '*') {
        if (!Array.isArray(current)) return ''
      } else {
        const idx = parseInt(tok.val)
        current = Array.isArray(current) ? current[idx] : current
      }
    }
  }

  if (Array.isArray(current)) {
    return current.map((item) =>
      typeof item === 'object' ? JSON.stringify(item) : String(item)
    ).join('\n')
  }
  if (typeof current === 'object') return JSON.stringify(current, null, 2)
  return String(current)
}

// ── Pure text transforms ─────────────────────────────────────────────────────
export function applyTextTransform(input, mode) {
  const text = String(input ?? '')
  switch (mode) {
    case 'uppercase':       return text.toUpperCase()
    case 'lowercase':       return text.toLowerCase()
    case 'capitalize':      return text.replace(/\b(\w)/g, (_, c) => c.toUpperCase())
    case 'trim':            return text.trim()
    case 'strip_markdown':  return stripMarkdown(text)
    case 'remove_empty_lines': return text.split('\n').filter((l) => l.trim()).join('\n')
    case 'normalize_whitespace': return text.replace(/\s+/g, ' ').trim()
    case 'json_pretty': {
      try { return JSON.stringify(JSON.parse(text), null, 2) } catch { return text }
    }
    case 'json_minify': {
      try { return JSON.stringify(JSON.parse(text)) } catch { return text }
    }
    default: return text
  }
}

function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .trim()
}

// ── Text splitter ────────────────────────────────────────────────────────────
/**
 * @param text
 * @param mode  'delimiter' | 'chunk_size' | 'lines' | 'paragraphs' | 'sentences'
 * @param value  delimiter string, or numeric size
 * @param maxChunks  safety cap
 */
export function splitText(text, mode, value, maxChunks = 50) {
  const src = String(text ?? '')
  let chunks = []
  switch (mode) {
    case 'delimiter': {
      const d = (value || '\n\n').replace(/\\n/g, '\n').replace(/\\t/g, '\t')
      chunks = src.split(d)
      break
    }
    case 'chunk_size': {
      const size = Math.max(1, parseInt(value) || 500)
      for (let i = 0; i < src.length; i += size) {
        chunks.push(src.slice(i, i + size))
      }
      break
    }
    case 'lines': {
      const n = Math.max(1, parseInt(value) || 10)
      const lines = src.split('\n')
      for (let i = 0; i < lines.length; i += n) {
        chunks.push(lines.slice(i, i + n).join('\n'))
      }
      break
    }
    case 'paragraphs': {
      chunks = src.split(/\n\s*\n/)
      break
    }
    case 'sentences': {
      chunks = src.match(/[^.!?。！？]+[.!?。！？]+(\s|$)/g) || [src]
      chunks = chunks.map((c) => c.trim()).filter(Boolean)
      break
    }
    default:
      chunks = [src]
  }
  chunks = chunks.map((c) => c.trim()).filter((c) => c.length > 0)
  if (chunks.length > maxChunks) chunks = chunks.slice(0, maxChunks)
  return chunks
}

// ── Template substitution ────────────────────────────────────────────────────
/**
 * Replace {key} occurrences in template with values from vars map.
 * Unknown keys are left untouched. Escaped braces via {{ and }} become literal { }.
 */
export function renderTemplate(template, vars) {
  if (!template) return ''
  // Handle literal {{ }} by temporary placeholders
  const LB = '\u0000LB\u0000'
  const RB = '\u0000RB\u0000'
  let out = String(template).replace(/\{\{/g, LB).replace(/\}\}/g, RB)
  out = out.replace(/\{([^{}]+)\}/g, (m, key) => {
    const trimmed = key.trim()
    if (trimmed in vars) return String(vars[trimmed] ?? '')
    return m
  })
  return out.replace(new RegExp(LB, 'g'), '{').replace(new RegExp(RB, 'g'), '}')
}
