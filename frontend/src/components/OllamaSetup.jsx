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

// ── Troubleshooting guide (accordion) ────────────────────────────────────────
const TS_ITEMS = [
  {
    title: '"address already in use" 오류가 나와요',
    cause: 'Ollama가 이미 실행 중입니다. 기존 프로세스를 종료한 뒤 다시 시작하세요.',
    code: 'pkill ollama\nOLLAMA_ORIGINS="*" ollama serve',
  },
  {
    title: '종료해도 Ollama가 계속 다시 살아나요',
    cause: 'macOS의 자동 시작 서비스(LaunchAgent)가 등록되어 있을 수 있습니다.',
    code:
      '# 자동 재시작 서비스 해제\n'
      + 'launchctl unload ~/Library/LaunchAgents/com.ollama.keepalive.plist\n'
      + 'launchctl unload ~/Library/LaunchAgents/com.ollama.startup.plist\n\n'
      + '# 종료 후 재시작\n'
      + 'pkill ollama\n'
      + 'OLLAMA_ORIGINS="*" ollama serve',
    note: '위 명령 실행 후에도 계속 살아나면 아래 3번을 확인하세요.',
  },
  {
    title: 'LaunchAgent 해제해도 여전히 살아나요',
    cause: 'Ollama 데스크탑 앱이 백그라운드에서 실행 중입니다. Dock에는 안 보여도 프로세스가 살아있습니다.',
    code:
      '# Ollama 앱(Electron) 완전 종료\n'
      + 'killall Ollama\n\n'
      + '# CORS 허용으로 수동 시작\n'
      + 'OLLAMA_ORIGINS="*" ollama serve',
    note: 'killall Ollama — 대문자 O입니다. 앱이 내부적으로 ollama serve를 관리하므로, 앱을 종료해야 수동으로 시작할 수 있습니다.',
  },
  {
    title: 'CORS 오류 / 연결 실패인데 Ollama는 실행 중이에요',
    cause: '브라우저에서 직접 Ollama에 접근하려면 CORS 허용이 필수입니다.',
    code: 'OLLAMA_ORIGINS="*" ollama serve',
    note: '반드시 OLLAMA_ORIGINS="*"를 앞에 붙여서 실행하세요. 일반 ollama serve로는 브라우저 연결이 차단됩니다.',
  },
  {
    title: 'Windows에서 실행하고 싶어요',
    cause: 'Windows에서는 환경변수를 먼저 설정한 뒤 실행합니다.',
    codes: [
      { label: 'PowerShell:', code: '$env:OLLAMA_ORIGINS="*"\nollama serve' },
      { label: 'CMD:', code: 'set OLLAMA_ORIGINS=*\nollama serve' },
    ],
  },
]

function TroubleshootPanel({ onBack }) {
  const [openIdx, setOpenIdx] = useState(null)
  const toggle = (i) => setOpenIdx(openIdx === i ? null : i)

  return (
    <div className="setup-backdrop">
      <div className="setup-panel ts-panel">
        <div className="setup-header">
          <span className="setup-logo">🔧</span>
          <h1 className="setup-title">문제 해결 가이드</h1>
          <p className="setup-sub">해당하는 증상을 클릭하세요</p>
        </div>

        <div className="setup-body ts-body">
          {TS_ITEMS.map((item, i) => (
            <div key={i} className={`ts-issue ${openIdx === i ? 'ts-open' : ''}`}>
              <button className="ts-issue-header" onClick={() => toggle(i)}>
                <span className="ts-num">{i + 1}</span>
                <span className="ts-issue-title">{item.title}</span>
                <span className="ts-chevron">{openIdx === i ? '▾' : '▸'}</span>
              </button>
              {openIdx === i && (
                <div className="ts-issue-body">
                  <p className="ts-cause">{item.cause}</p>
                  {item.code && <CodeBlock code={item.code} />}
                  {item.codes?.map((c, j) => (
                    <div key={j}>
                      <p className="ts-sub-label">{c.label}</p>
                      <CodeBlock code={c.code} />
                    </div>
                  ))}
                  {item.note && <p className="ts-note">{item.note}</p>}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="setup-footer">
          <button className="btn-back" onClick={onBack}>← 돌아가기</button>
        </div>
      </div>
    </div>
  )
}

export default function OllamaSetup({ onComplete }) {
  const [step, setStep] = useState('method')   // method | guide | connect | troubleshoot
  const [prevStep, setPrevStep] = useState('method')
  const [method, setMethod] = useState(null)   // 'local' | 'tunnel'
  const [url, setUrl] = useState('http://localhost:11434')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null) // null | 'ok' | 'fail' | 'cors'
  const [models, setModels] = useState([])

  const openTroubleshoot = () => { setPrevStep(step); setStep('troubleshoot') }

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

  // ── Step: troubleshoot ───────────────────────────────────────────────────
  if (step === 'troubleshoot') return (
    <TroubleshootPanel onBack={() => setStep(prevStep)} />
  )

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
          <button className="btn-troubleshoot" onClick={openTroubleshoot}>
            🔧 문제 해결
          </button>
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
          <button className="btn-troubleshoot" onClick={openTroubleshoot}>
            🔧 문제 해결
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
