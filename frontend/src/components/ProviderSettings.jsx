import { useState, useEffect } from 'react'
import { useI18n } from '../i18n/index'
import {
  PROVIDERS, getApiKey, setApiKey, getBaseUrl, setBaseUrl, isProviderConfigured,
} from '../providers/index'
import './ProviderSettings.css'

function ProviderRow({ provider, onChange }) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const [apiKey, setLocalKey] = useState(() => getApiKey(provider.id))
  const [baseUrl, setLocalUrl] = useState(() => getBaseUrl(provider.id))
  const [revealKey, setRevealKey] = useState(false)

  const configured = isProviderConfigured(provider)

  const handleSaveKey = (v) => {
    setLocalKey(v)
    setApiKey(provider.id, v)
    onChange?.()
  }
  const handleSaveUrl = (v) => {
    setLocalUrl(v)
    setBaseUrl(provider.id, v.trim())
    onChange?.()
  }
  const handleClear = () => {
    setLocalKey('')
    setLocalUrl('')
    setApiKey(provider.id, '')
    setBaseUrl(provider.id, '')
    onChange?.()
  }

  if (provider.id === 'ollama') {
    return (
      <div className="ps-row">
        <div className="ps-row-head">
          <div className="ps-row-title">
            <span className="ps-row-name">{provider.name}</span>
            <span className="ps-row-badge ps-badge-local">{t('ps_local')}</span>
          </div>
          <span className="ps-row-desc">{provider.description}</span>
        </div>
        <div className="ps-row-note">{t('ps_ollamaHint')}</div>
      </div>
    )
  }

  return (
    <div className={`ps-row ${configured ? 'ps-row--configured' : ''}`}>
      <div className="ps-row-head" onClick={() => setExpanded((v) => !v)}>
        <div className="ps-row-title">
          <span className="ps-row-name">{provider.name}</span>
          {configured && <span className="ps-row-badge ps-badge-ok">{t('ps_connected')}</span>}
          {provider.badge === 'custom' && (
            <span className="ps-row-badge ps-badge-custom">{t('ps_custom')}</span>
          )}
        </div>
        <div className="ps-row-right">
          <span className="ps-row-desc">{provider.description}</span>
          <span className={`ps-chev ${expanded ? 'open' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4"/></svg>
          </span>
        </div>
      </div>

      {expanded && (
        <div className="ps-row-body">
          {provider.requiresKey !== false && (
            <div className="ps-field">
              <label className="ps-label">
                {t('ps_apiKey')}
                {provider.keyHelpUrl && (
                  <a href={provider.keyHelpUrl} target="_blank" rel="noreferrer" className="ps-help-link">
                    {t('ps_getKey')} ↗
                  </a>
                )}
              </label>
              <div className="ps-input-row">
                <input
                  type={revealKey ? 'text' : 'password'}
                  className="ps-input"
                  placeholder={provider.keyPlaceholder || ''}
                  value={apiKey}
                  onChange={(e) => handleSaveKey(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="ps-ghost-btn"
                  onClick={() => setRevealKey((v) => !v)}
                  title={revealKey ? t('ps_hide') : t('ps_show')}
                >
                  {revealKey ? (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2l12 12"/><path d="M6.5 6.5A2 2 0 008 10a2 2 0 001.5-.7"/><path d="M3 8s2-4 5-4c1 0 1.8.3 2.5.8M13 8s-2 4-5 4c-1 0-1.8-.3-2.5-.8"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {provider.baseUrlEditable && (
            <div className="ps-field">
              <label className="ps-label">
                {t('ps_baseUrl')}
                <span className="ps-label-hint">{t('ps_baseUrlHint')}</span>
              </label>
              <input
                type="text"
                className="ps-input"
                placeholder={provider.defaultBaseUrl}
                value={baseUrl}
                onChange={(e) => handleSaveUrl(e.target.value)}
                spellCheck={false}
                autoComplete="off"
              />
            </div>
          )}

          {(apiKey || baseUrl) && (
            <button type="button" className="ps-clear-btn" onClick={handleClear}>
              {t('ps_clear')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProviderSettings({ onClose, onChange }) {
  const { t } = useI18n()
  const [, setTick] = useState(0)
  const refresh = () => { setTick((x) => x + 1); onChange?.() }

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="ps-overlay" onClick={onClose}>
      <div className="ps-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ps-header">
          <div className="ps-header-left">
            <h2 className="ps-title">{t('ps_title')}</h2>
            <p className="ps-sub">{t('ps_sub')}</p>
          </div>
          <button className="ps-close" onClick={onClose} title="Esc">✕</button>
        </div>

        <div className="ps-warning">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2L1 14h14L8 2z"/><path d="M8 6v4"/><circle cx="8" cy="12" r="0.5" fill="currentColor"/>
          </svg>
          <span>{t('ps_securityWarn')}</span>
        </div>

        <div className="ps-list">
          {PROVIDERS.map((p) => (
            <ProviderRow key={p.id} provider={p} onChange={refresh} />
          ))}
        </div>

        <div className="ps-footer">
          <button className="ps-done" onClick={onClose}>{t('ps_done')}</button>
        </div>
      </div>
    </div>
  )
}
