import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchModelDetails, streamPull, deleteModel as ollamaDeleteModel } from '../ollamaClient'
import './ModelManager.css'

// Curated model catalog
const CATALOG = [
  {
    group: '초경량 (RAM 1~2GB)',
    models: [
      { name: 'tinyllama:1.1b', ram: 0.8, desc: '가장 가벼운 모델. 빠른 테스트용', tags: ['빠름'] },
      { name: 'qwen2.5:0.5b', ram: 0.7, desc: '0.5B 초소형. 간단한 분류·변환', tags: ['초경량'] },
      { name: 'qwen2.5:1.5b', ram: 1.2, desc: '1.5B, 한국어 지원 양호', tags: ['한국어'] },
      { name: 'llama3.2:1b', ram: 1.3, desc: 'Meta Llama 3.2 1B. 균형잡힌 소형', tags: [] },
      { name: 'deepseek-r1:1.5b', ram: 1.2, desc: '추론 특화 소형. CoT 지원', tags: ['추론'] },
      { name: 'gemma3:1b', ram: 0.9, desc: 'Google Gemma 3 1B. 대화에 강함', tags: [] },
    ],
  },
  {
    group: '경량 (RAM 2~4GB)',
    models: [
      { name: 'gemma3:4b', ram: 2.5, desc: 'Google Gemma 3 4B. 품질·속도 균형 최고', tags: ['추천'] },
      { name: 'qwen2.5:3b', ram: 2.0, desc: 'Qwen 2.5 3B. 한국어·코드 강함', tags: ['한국어'] },
      { name: 'llama3.2:3b', ram: 2.0, desc: 'Meta Llama 3.2 3B. 범용', tags: [] },
      { name: 'phi3:mini', ram: 2.3, desc: 'Microsoft Phi-3 Mini. 논리·수학 우수', tags: ['추론'] },
      { name: 'deepseek-r1:7b', ram: 4.4, desc: 'DeepSeek R1 7B. 고품질 추론', tags: ['추론'] },
      { name: 'mistral:7b', ram: 4.1, desc: 'Mistral 7B. 빠르고 균형 잡힌 범용 모델', tags: [] },
    ],
  },
  {
    group: '중형 (RAM 4~10GB)',
    models: [
      { name: 'llama3.1:8b', ram: 4.7, desc: 'Meta Llama 3.1 8B. 강력한 범용', tags: [] },
      { name: 'gemma2:9b', ram: 5.5, desc: 'Google Gemma 2 9B. 고품질 텍스트', tags: [] },
      { name: 'qwen2.5:7b', ram: 4.4, desc: 'Qwen 2.5 7B. 한국어·코드 매우 강함', tags: ['한국어'] },
      { name: 'deepseek-r1:8b', ram: 4.7, desc: 'DeepSeek R1 8B. 강력한 추론', tags: ['추론'] },
      { name: 'gemma3:12b', ram: 7.5, desc: 'Google Gemma 3 12B. 고품질', tags: [] },
      { name: 'codegemma:7b', ram: 4.2, desc: '코드 전용 모델. 리뷰·생성 특화', tags: ['코드'] },
      { name: 'codellama:7b', ram: 4.1, desc: 'Meta Code Llama 7B. 코드 특화', tags: ['코드'] },
    ],
  },
  {
    group: '기타',
    models: [
      { name: 'nomic-embed-text', ram: 0.3, desc: '텍스트 임베딩 전용 (RAG용)', tags: ['임베딩'] },
    ],
  },
]

function formatBytes(gb) {
  if (gb < 1) return `${Math.round(gb * 1024)}MB`
  return `${gb.toFixed(1)}GB`
}

function RamDot({ ram, available }) {
  if (available == null) return null
  const ok = available >= ram + 0.5
  const tight = available >= ram && available < ram + 1.5
  return (
    <span className={`ram-dot ${ok ? 'ok' : tight ? 'tight' : 'bad'}`} title={`약 ${formatBytes(ram)} 필요`}>
      {ok ? '🟢' : tight ? '🟡' : '🔴'}
    </span>
  )
}

export default function ModelManager({ onClose, onModelsChange }) {
  const ollamaUrl = localStorage.getItem('ollama_url') || 'http://localhost:11434'
  const [installed, setInstalled] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pulling, setPulling] = useState({}) // { modelName: { percent, status } }
  const [customModel, setCustomModel] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const pullAbortRefs = useRef({})

  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  const fetchInstalled = useCallback(() => {
    setLoading(true)
    fetchModelDetails(ollamaUrl)
      .then((models) => { setInstalled(models); setLoading(false) })
      .catch(() => setLoading(false))
  }, [ollamaUrl])

  useEffect(() => {
    fetchInstalled()
  }, [fetchInstalled])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCloseRef.current() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      Object.values(pullAbortRefs.current).forEach((ctrl) => ctrl?.abort())
    }
  }, [])

  const pullModel = useCallback((modelName) => {
    if (pulling[modelName]) return
    setPulling((p) => ({ ...p, [modelName]: { percent: 0, status: '연결 중...' } }))

    const ctrl = new AbortController()
    pullAbortRefs.current[modelName] = ctrl

    ;(async () => {
      try {
        for await (const progress of streamPull(ollamaUrl, modelName, ctrl.signal)) {
          setPulling((p) => ({
            ...p,
            [modelName]: { percent: progress.percent, status: progress.status },
          }))
          if (progress.status === 'success') break
        }
        setPulling((p) => { const n = { ...p }; delete n[modelName]; return n })
        delete pullAbortRefs.current[modelName]
        fetchInstalled()
        onModelsChange?.()
      } catch (err) {
        if (err.name === 'AbortError') return
        setPulling((p) => { const n = { ...p }; delete n[modelName]; return n })
        alert(`다운로드 실패: ${err.message}`)
      }
    })()
  }, [pulling, fetchInstalled, onModelsChange, ollamaUrl])

  const deleteModel = useCallback(async (modelName) => {
    try {
      await ollamaDeleteModel(ollamaUrl, modelName)
    } catch {
      // ignore
    }
    setDeleteConfirm(null)
    fetchInstalled()
    onModelsChange?.()
  }, [fetchInstalled, onModelsChange, ollamaUrl])

  const installedNames = new Set(installed.map((m) => m.name))

  const filteredCatalog = CATALOG.map((group) => ({
    ...group,
    models: group.models.filter(
      (m) =>
        !search ||
        m.name.includes(search.toLowerCase()) ||
        m.desc.includes(search) ||
        m.tags.some((t) => t.includes(search))
    ),
  })).filter((g) => g.models.length > 0)

  return (
    <div className="mm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mm-panel">
        <div className="mm-header">
          <div className="mm-title">
            <span className="mm-title-icon">◈</span>
            모델 관리
          </div>
          <button className="mm-close" onClick={onClose}>✕</button>
        </div>

        <div className="mm-body">
          <section className="mm-section">
            <h3 className="mm-section-title">설치된 모델 ({installed.length})</h3>
            {loading ? (
              <div className="mm-loading">로딩 중...</div>
            ) : installed.length === 0 ? (
              <div className="mm-empty">설치된 모델이 없습니다.</div>
            ) : (
              <div className="installed-list">
                {installed.map((m) => (
                  <div key={m.name} className="installed-item">
                    <div className="installed-info">
                      <span className="installed-name">{m.name}</span>
                      <span className="installed-size">{formatBytes(m.size_gb)} 저장</span>
                      <span className="installed-ram">RAM ~{formatBytes(m.estimated_ram_gb)}</span>
                    </div>
                    {deleteConfirm === m.name ? (
                      <div className="delete-confirm">
                        <span>삭제?</span>
                        <button className="btn-confirm-yes" onClick={() => deleteModel(m.name)}>삭제</button>
                        <button className="btn-confirm-no" onClick={() => setDeleteConfirm(null)}>취소</button>
                      </div>
                    ) : (
                      <button className="btn-delete" onClick={() => setDeleteConfirm(m.name)}>🗑</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mm-section">
            <h3 className="mm-section-title">모델 추가</h3>
            <div className="mm-search-row">
              <input
                className="mm-search"
                placeholder="이름·태그 검색 (예: 한국어, 추론, qwen)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="mm-custom-row">
              <input
                className="mm-custom-input"
                placeholder="직접 입력 (예: llama3.1:70b)"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customModel.trim()) {
                    pullModel(customModel.trim())
                    setCustomModel('')
                  }
                }}
              />
              <button
                className="btn-pull-custom"
                disabled={!customModel.trim() || !!pulling[customModel.trim()]}
                onClick={() => { pullModel(customModel.trim()); setCustomModel('') }}
              >
                다운로드
              </button>
            </div>
          </section>

          <section className="mm-section mm-section--catalog">
            {filteredCatalog.map((group) => (
              <div key={group.group} className="catalog-group">
                <div className="catalog-group-title">{group.group}</div>
                <div className="catalog-grid">
                  {group.models.map((m) => {
                    const isInstalled = installedNames.has(m.name)
                    const isPulling = !!pulling[m.name]
                    const pullInfo = pulling[m.name]

                    return (
                      <div key={m.name} className={`catalog-card ${isInstalled ? 'installed' : ''}`}>
                        <div className="catalog-card-top">
                          <RamDot ram={m.ram} available={null} />
                          <span className="catalog-name">{m.name}</span>
                          {isInstalled && <span className="catalog-badge-installed">설치됨</span>}
                          {m.tags.map((t) => (
                            <span key={t} className={`catalog-tag tag-${t}`}>{t}</span>
                          ))}
                        </div>
                        <p className="catalog-desc">{m.desc}</p>
                        <div className="catalog-footer">
                          <span className="catalog-ram">~{formatBytes(m.ram)}</span>
                          {isPulling ? (
                            <div className="pull-progress-inline">
                              <div className="pull-bar-track">
                                <div className="pull-bar-fill" style={{ width: `${pullInfo.percent}%` }} />
                              </div>
                              <span className="pull-pct">{pullInfo.percent > 0 ? `${pullInfo.percent}%` : pullInfo.status}</span>
                            </div>
                          ) : isInstalled ? (
                            <span className="catalog-installed-mark">✓ 완료</span>
                          ) : (
                            <button
                              className="btn-pull"
                              onClick={() => pullModel(m.name)}
                            >
                              ↓ 다운로드
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}
