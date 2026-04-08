import { useState, useCallback } from 'react'
import { testConnection, fetchModels } from '../ollamaClient'
import './OllamaSetup.css'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button className="copy-btn" onClick={copy}>
      {copied ? '✓ 복사됨' : '복사'}
    </button>
  )
}

function CodeBlock({ code }) {
  return (
    <div className="code-block">
      <pre>{code}</pre>
      <CopyButton text={code} />
    </div>
  )
}

export default function OllamaSetup({ onComplete }) {
  const [step, setStep] = useState('method')   // method | guide | connect
  const [method, setMethod] = useState(null)   // 'local' | 'tunnel'
  const [url, setUrl] = useState('http://localhost:11434')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null) // null | 'ok' | 'fail' | 'cors'
  const [models, setModels] = useState([])

  const doTest = useCallback(async (testUrl) => {
    setTesting(true)
    setTestResult(null)
    try {
      await testConnection(testUrl)
      const { models: m } = await fetchModels(testUrl)
      setModels(m)
      setTestResult('ok')
    } catch (err) {
      // Distinguish CORS / mixed-content errors (TypeError: Failed to fetch)
      // from genuine connection errors
      if (err instanceof TypeError) {
        setTestResult('cors')
      } else {
        setTestResult('fail')
      }
    } finally {
      setTesting(false)
    }
  }, [])

  const handleComplete = () => {
    localStorage.setItem('ollama_url', url)
    onComplete(url, models)
  }

  // ── Step: method ─────────────────────────────────────────────────────────
  if (step === 'method') return (
    <div className="setup-backdrop">
      <div className="setup-panel">
        <div className="setup-header">
          <span className="setup-logo">⬡</span>
          <h1 className="setup-title">AI Factory에 오신 걸 환영합니다</h1>
          <p className="setup-sub">노드 기반 AI 워크플로우 빌더</p>
        </div>

        <div className="setup-body">
          <p className="setup-question">Ollama는 어디서 실행 중인가요?</p>

          <div className="method-cards">
            <button
              className={`method-card ${method === 'local' ? 'active' : ''}`}
              onClick={() => setMethod('local')}
            >
              <span className="method-icon">💻</span>
              <span className="method-label">이 컴퓨터</span>
              <span className="method-desc">지금 이 PC에서 Ollama 실행</span>
            </button>
            <button
              className={`method-card ${method === 'tunnel' ? 'active' : ''}`}
              onClick={() => setMethod('tunnel')}
            >
              <span className="method-icon">🌐</span>
              <span className="method-label">외부 서버 / Tunnel</span>
              <span className="method-desc">Cloudflare Tunnel로 연결</span>
            </button>
          </div>

          {method === 'local' && (
            <div className="method-hint">
              <p>Ollama가 설치되어 있지 않다면:</p>
              <CodeBlock code="brew install ollama" />
              <p>CORS 허용 설정으로 Ollama 시작 <span className="hint-required">(필수)</span>:</p>
              <CodeBlock code={'OLLAMA_ORIGINS="*" ollama serve'} />
              <p className="hint-why">브라우저에서 Ollama에 직접 연결하려면 CORS 허용이 필요합니다.</p>
            </div>
          )}

          {method === 'tunnel' && (
            <div className="method-hint tunnel-hint">
              <p>⭐ 클라우드 서비스 이용 시 권장 방식입니다.</p>
              <p>본인의 Ollama를 안전하게 외부에 노출합니다.</p>
            </div>
          )}
        </div>

        <div className="setup-footer">
          <button
            className="btn-next"
            disabled={!method}
            onClick={() => {
              if (method === 'local') {
                setUrl('http://localhost:11434')
                setStep('connect')
              } else {
                setStep('guide')
              }
            }}
          >
            다음 →
          </button>
        </div>
      </div>
    </div>
  )

  // ── Step: guide (Cloudflare Tunnel) ──────────────────────────────────────
  if (step === 'guide') return (
    <div className="setup-backdrop">
      <div className="setup-panel">
        <div className="setup-header">
          <span className="setup-logo">🌐</span>
          <h1 className="setup-title">Cloudflare Tunnel 설정</h1>
          <p className="setup-sub">3단계로 5분 안에 완료됩니다</p>
        </div>

        <div className="setup-body guide-body">
          <div className="guide-step">
            <div className="guide-num">1</div>
            <div className="guide-content">
              <p className="guide-label">cloudflared 설치</p>
              <CodeBlock code="brew install cloudflare/cloudflare/cloudflared" />
              <p className="guide-hint">Windows: <a href="https://github.com/cloudflare/cloudflared/releases" target="_blank" rel="noreferrer">여기서 다운로드</a></p>
            </div>
          </div>

          <div className="guide-step">
            <div className="guide-num">2</div>
            <div className="guide-content">
              <p className="guide-label">Ollama를 외부에 노출</p>
              <CodeBlock code="cloudflared tunnel --url http://localhost:11434" />
              <p className="guide-hint">실행 후 터미널에 이런 URL이 나타납니다:</p>
              <div className="guide-example">
                https://<strong>랜덤이름</strong>.trycloudflare.com
              </div>
            </div>
          </div>

          <div className="guide-step">
            <div className="guide-num">3</div>
            <div className="guide-content">
              <p className="guide-label">OLLAMA_ORIGINS 설정 (CORS 허용)</p>
              <CodeBlock code={'OLLAMA_ORIGINS="*" ollama serve'} />
              <p className="guide-hint">또는 이미 실행 중이라면 재시작하세요.</p>
            </div>
          </div>

          <div className="guide-note">
            <span>💡</span>
            <span>무료로 사용 가능합니다. Cloudflare 계정 불필요. 세션마다 새 URL이 발급됩니다.</span>
          </div>
        </div>

        <div className="setup-footer">
          <button className="btn-back" onClick={() => setStep('method')}>← 이전</button>
          <button className="btn-next" onClick={() => setStep('connect')}>
            URL 입력하기 →
          </button>
        </div>
      </div>
    </div>
  )

  // ── Step: connect ─────────────────────────────────────────────────────────
  if (step === 'connect') return (
    <div className="setup-backdrop">
      <div className="setup-panel">
        <div className="setup-header">
          <span className="setup-logo">🔌</span>
          <h1 className="setup-title">Ollama 연결 테스트</h1>
          <p className="setup-sub">URL을 입력하고 연결을 확인하세요</p>
        </div>

        <div className="setup-body">
          <label className="connect-label">Ollama URL</label>
          <div className="connect-row">
            <input
              className="connect-input"
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setTestResult(null) }}
              placeholder="https://랜덤이름.trycloudflare.com"
              spellCheck={false}
            />
            <button
              className="btn-test"
              onClick={() => doTest(url)}
              disabled={testing || !url.trim()}
            >
              {testing ? <span className="test-spinner" /> : '테스트'}
            </button>
          </div>

          {method === 'local' && (
            <p className="connect-hint">
              로컬 실행 중이라면 기본값 <code>http://localhost:11434</code>을 그대로 사용하세요.
            </p>
          )}

          {testResult === 'ok' && (
            <div className="test-result ok">
              <span className="result-icon">✓</span>
              <div>
                <strong>연결 성공!</strong>
                <p>{models.length}개 모델 확인됨{models.length > 0 ? `: ${models.slice(0, 3).join(', ')}${models.length > 3 ? ` 외 ${models.length - 3}개` : ''}` : ''}</p>
              </div>
            </div>
          )}

          {testResult === 'cors' && (
            <div className="test-result fail">
              <span className="result-icon">✕</span>
              <div>
                <strong>CORS 오류 — Ollama 재시작 필요</strong>
                <p>아래 명령어로 Ollama를 다시 시작하세요:</p>
                <CodeBlock code={'OLLAMA_ORIGINS="*" ollama serve'} />
                {method === 'tunnel' && <p>tunnel URL이 HTTPS인지도 확인하세요.</p>}
              </div>
            </div>
          )}

          {testResult === 'fail' && (
            <div className="test-result fail">
              <span className="result-icon">✕</span>
              <div>
                <strong>연결 실패</strong>
                <p>Ollama가 실행 중인지 확인하고, URL이 올바른지 확인하세요.</p>
                {method === 'local' && (
                  <p>터미널에서 <code>OLLAMA_ORIGINS="*" ollama serve</code>로 실행하세요.</p>
                )}
                {method === 'tunnel' && <p>cloudflared가 실행 중인지 확인하세요.</p>}
              </div>
            </div>
          )}

          {models.length > 0 && (
            <div className="model-list-preview">
              <p className="model-list-label">설치된 모델</p>
              <div className="model-chips">
                {models.map(m => <span key={m} className="model-chip">{m}</span>)}
              </div>
            </div>
          )}
        </div>

        <div className="setup-footer">
          <button className="btn-back" onClick={() => setStep(method === 'tunnel' ? 'guide' : 'method')}>
            ← 이전
          </button>
          <button
            className="btn-complete"
            disabled={testResult !== 'ok'}
            onClick={handleComplete}
          >
            시작하기 ✓
          </button>
        </div>
      </div>
    </div>
  )

  return null
}
