import { useState, useEffect } from 'react'
import { useI18n } from '../i18n/index'
import './DocsPage.css'

const SECTIONS = [
  { id: 'overview', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8.66 5v10L12 22l-8.66-5V7z"/></svg> },
  { id: 'quickstart', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
  { id: 'nodes', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg> },
  { id: 'custom', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
  { id: 'utility', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> },
  { id: 'connectors', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
  { id: 'marketplace', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { id: 'workflow', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> },
  { id: 'shortcuts', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><line x1="6" y1="8" x2="6" y2="8"/><line x1="10" y1="8" x2="10" y2="8"/><line x1="14" y1="8" x2="14" y2="8"/><line x1="18" y1="8" x2="18" y2="8"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="6" y1="16" x2="18" y2="16"/></svg> },
  { id: 'settings', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
]

export default function DocsPage({ onClose }) {
  const { t } = useI18n()
  const [active, setActive] = useState('overview')

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const scrollTo = (id) => {
    setActive(id)
    document.getElementById(`docs-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleScroll = (e) => {
    const container = e.target
    for (const sec of [...SECTIONS].reverse()) {
      const el = document.getElementById(`docs-${sec.id}`)
      if (el && el.offsetTop - container.scrollTop < 120) {
        setActive(sec.id)
        break
      }
    }
  }

  return (
    <div className="docs-overlay">
      <div className="docs-page">
        {/* Sidebar nav */}
        <nav className="docs-nav">
          <div className="docs-nav-header">
            <span className="docs-nav-logo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8.66 5v10L12 22l-8.66-5V7z"/></svg></span>
            <span className="docs-nav-title">AI Factory</span>
          </div>
          <div className="docs-nav-list">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                className={`docs-nav-item ${active === s.id ? 'active' : ''}`}
                onClick={() => scrollTo(s.id)}
              >
                <span className="docs-nav-icon">{s.icon}</span>
                <span>{t(`docs_nav_${s.id}`)}</span>
              </button>
            ))}
          </div>
          <button className="docs-close-btn" onClick={onClose}>{t('docsClose')}</button>
        </nav>

        {/* Content */}
        <div className="docs-content" onScroll={handleScroll}>
          {/* Hero */}
          <div className="docs-hero">
            <div className="docs-hero-glyph"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8.66 5v10L12 22l-8.66-5V7z"/></svg></div>
            <h1 className="docs-hero-title">AI Factory</h1>
            <p className="docs-hero-sub">{t('docs_heroSub')}</p>
          </div>

          {/* Overview */}
          <section id="docs-overview" className="docs-section">
            <h2>{t('docs_nav_overview')}</h2>
            <p>{t('docs_overview_1')}</p>
            <div className="docs-card-grid">
              <div className="docs-card">
                <span className="docs-card-icon">🧩</span>
                <h3>{t('docs_overview_card1_title')}</h3>
                <p>{t('docs_overview_card1_desc')}</p>
              </div>
              <div className="docs-card">
                <span className="docs-card-icon">🤖</span>
                <h3>{t('docs_overview_card2_title')}</h3>
                <p>{t('docs_overview_card2_desc')}</p>
              </div>
              <div className="docs-card">
                <span className="docs-card-icon">🔗</span>
                <h3>{t('docs_overview_card3_title')}</h3>
                <p>{t('docs_overview_card3_desc')}</p>
              </div>
            </div>
          </section>

          {/* Quick Start */}
          <section id="docs-quickstart" className="docs-section">
            <h2>{t('docs_nav_quickstart')}</h2>
            <div className="docs-steps">
              <div className="docs-step">
                <span className="docs-step-num">1</span>
                <div>
                  <h3>{t('docs_qs_step1_title')}</h3>
                  <p>{t('docs_qs_step1_desc')}</p>
                </div>
              </div>
              <div className="docs-step">
                <span className="docs-step-num">2</span>
                <div>
                  <h3>{t('docs_qs_step2_title')}</h3>
                  <p>{t('docs_qs_step2_desc')}</p>
                </div>
              </div>
              <div className="docs-step">
                <span className="docs-step-num">3</span>
                <div>
                  <h3>{t('docs_qs_step3_title')}</h3>
                  <p>{t('docs_qs_step3_desc')}</p>
                </div>
              </div>
              <div className="docs-step">
                <span className="docs-step-num">4</span>
                <div>
                  <h3>{t('docs_qs_step4_title')}</h3>
                  <p>{t('docs_qs_step4_desc')}</p>
                </div>
              </div>
            </div>
          </section>

          {/* AI Agent Node */}
          <section id="docs-nodes" className="docs-section">
            <h2>{t('docs_nav_nodes')}</h2>
            <p>{t('docs_nodes_intro')}</p>
            <div className="docs-feature-list">
              <div className="docs-feature">
                <span className="docs-feature-label">{t('docs_nodes_name')}</span>
                <span className="docs-feature-desc">{t('docs_nodes_name_desc')}</span>
              </div>
              <div className="docs-feature">
                <span className="docs-feature-label">{t('docs_nodes_role')}</span>
                <span className="docs-feature-desc">{t('docs_nodes_role_desc')}</span>
              </div>
              <div className="docs-feature">
                <span className="docs-feature-label">{t('docs_nodes_model')}</span>
                <span className="docs-feature-desc">{t('docs_nodes_model_desc')}</span>
              </div>
              <div className="docs-feature">
                <span className="docs-feature-label">{t('docs_nodes_return')}</span>
                <span className="docs-feature-desc">{t('docs_nodes_return_desc')}</span>
              </div>
              <div className="docs-feature">
                <span className="docs-feature-label">{t('docs_nodes_params')}</span>
                <span className="docs-feature-desc">{t('docs_nodes_params_desc')}</span>
              </div>
            </div>
          </section>

          {/* Custom Nodes */}
          <section id="docs-custom" className="docs-section">
            <h2>{t('docs_nav_custom')}</h2>
            <p>{t('docs_custom_intro')}</p>
            <div className="docs-tip-box">
              <span className="docs-tip-icon">💡</span>
              <p>{t('docs_custom_tip')}</p>
            </div>
          </section>

          {/* Utility Nodes */}
          <section id="docs-utility" className="docs-section">
            <h2>{t('docs_nav_utility')}</h2>
            <p>{t('docs_utility_intro')}</p>
            <div className="docs-table">
              <div className="docs-table-row docs-table-header">
                <span>{t('docs_utility_col_node')}</span>
                <span>{t('docs_utility_col_desc')}</span>
              </div>
              {[
                ['Task List', 'docs_util_tasklist'],
                ['TTS', 'docs_util_tts'],
                ['Image Gen', 'docs_util_imagegen'],
                ['File Save', 'docs_util_filesave'],
                ['Video Compose', 'docs_util_video'],
                ['YouTube Upload', 'docs_util_youtube'],
                ['Branch', 'docs_util_branch'],
                ['Loop', 'docs_util_loop'],
              ].map(([name, key]) => (
                <div className="docs-table-row" key={key}>
                  <span className="docs-table-name">{name}</span>
                  <span>{t(key)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Connector Nodes */}
          <section id="docs-connectors" className="docs-section">
            <h2>{t('docs_nav_connectors')}</h2>
            <p>{t('docs_connectors_intro')}</p>
            <div className="docs-card-grid">
              <div className="docs-card docs-card--cyan">
                <span className="docs-card-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span>
                <h3>{t('docs_conn_api_title')}</h3>
                <p>{t('docs_conn_api_desc')}</p>
                <div className="docs-code">{t('docs_conn_api_example')}</div>
              </div>
              <div className="docs-card docs-card--purple">
                <span className="docs-card-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></span>
                <h3>{t('docs_conn_webhook_title')}</h3>
                <p>{t('docs_conn_webhook_desc')}</p>
                <div className="docs-code">{t('docs_conn_webhook_example')}</div>
              </div>
            </div>
            <div className="docs-tip-box">
              <span className="docs-tip-icon">🔑</span>
              <p>{t('docs_connectors_jsonpath')}</p>
            </div>
          </section>

          {/* Marketplace */}
          <section id="docs-marketplace" className="docs-section">
            <h2>{t('docs_nav_marketplace')}</h2>
            <p>{t('docs_marketplace_intro')}</p>
            <div className="docs-card-grid">
              <div className="docs-card">
                <span className="docs-card-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></span>
                <h3>{t('docs_mp_share_title')}</h3>
                <p>{t('docs_mp_share_desc')}</p>
              </div>
              <div className="docs-card">
                <span className="docs-card-icon">📥</span>
                <h3>{t('docs_mp_import_title')}</h3>
                <p>{t('docs_mp_import_desc')}</p>
              </div>
              <div className="docs-card">
                <span className="docs-card-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>
                <h3>{t('docs_mp_like_title')}</h3>
                <p>{t('docs_mp_like_desc')}</p>
              </div>
            </div>
            <div className="docs-tip-box">
              <span className="docs-tip-icon">💡</span>
              <p>{t('docs_mp_tip')}</p>
            </div>
          </section>

          {/* Running Workflows */}
          <section id="docs-workflow" className="docs-section">
            <h2>{t('docs_nav_workflow')}</h2>
            <p>{t('docs_workflow_intro')}</p>
            <div className="docs-feature-list">
              <div className="docs-feature">
                <span className="docs-feature-label">{t('docs_wf_run')}</span>
                <span className="docs-feature-desc">{t('docs_wf_run_desc')}</span>
              </div>
              <div className="docs-feature">
                <span className="docs-feature-label">{t('docs_wf_stop')}</span>
                <span className="docs-feature-desc">{t('docs_wf_stop_desc')}</span>
              </div>
              <div className="docs-feature">
                <span className="docs-feature-label">{t('docs_wf_time')}</span>
                <span className="docs-feature-desc">{t('docs_wf_time_desc')}</span>
              </div>
              <div className="docs-feature">
                <span className="docs-feature-label">{t('docs_wf_notif')}</span>
                <span className="docs-feature-desc">{t('docs_wf_notif_desc')}</span>
              </div>
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section id="docs-shortcuts" className="docs-section">
            <h2>{t('docs_nav_shortcuts')}</h2>
            <div className="docs-kbd-grid">
              {[
                ['Cmd/Ctrl + C', 'docs_kbd_copy'],
                ['Cmd/Ctrl + V', 'docs_kbd_paste'],
                ['Cmd/Ctrl + F', 'docs_kbd_search'],
                ['Shift + Click', 'docs_kbd_multisel'],
                ['Q + Drag', 'docs_kbd_rectsel'],
                ['Delete / Backspace', 'docs_kbd_delete'],
                ['Esc', 'docs_kbd_esc'],
              ].map(([keys, descKey]) => (
                <div className="docs-kbd-row" key={descKey}>
                  <kbd className="docs-kbd">{keys}</kbd>
                  <span>{t(descKey)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Settings */}
          <section id="docs-settings" className="docs-section">
            <h2>{t('docs_nav_settings')}</h2>
            <p>{t('docs_settings_intro')}</p>
            <div className="docs-feature-list">
              <div className="docs-feature">
                <span className="docs-feature-label">{t('docs_set_ollama')}</span>
                <span className="docs-feature-desc">{t('docs_set_ollama_desc')}</span>
              </div>
              <div className="docs-feature">
                <span className="docs-feature-label">{t('docs_set_lang')}</span>
                <span className="docs-feature-desc">{t('docs_set_lang_desc')}</span>
              </div>
              <div className="docs-feature">
                <span className="docs-feature-label">{t('docs_set_minimap')}</span>
                <span className="docs-feature-desc">{t('docs_set_minimap_desc')}</span>
              </div>
              <div className="docs-feature">
                <span className="docs-feature-label">{t('docs_set_save')}</span>
                <span className="docs-feature-desc">{t('docs_set_save_desc')}</span>
              </div>
            </div>
          </section>

          <div className="docs-footer">
            <p>AI Factory — {t('docs_footer')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
