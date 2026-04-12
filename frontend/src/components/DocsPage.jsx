import { useState, useEffect } from 'react'
import { useI18n } from '../i18n/index'
import './DocsPage.css'

const SECTIONS = [
  { id: 'overview', icon: '⬡' },
  { id: 'quickstart', icon: '🚀' },
  { id: 'nodes', icon: '🔵' },
  { id: 'custom', icon: '⚡' },
  { id: 'utility', icon: '🔧' },
  { id: 'connectors', icon: '🌐' },
  { id: 'marketplace', icon: '🏪' },
  { id: 'workflow', icon: '▶' },
  { id: 'shortcuts', icon: '⌨' },
  { id: 'settings', icon: '⚙' },
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
            <span className="docs-nav-logo">⬡</span>
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
            <div className="docs-hero-glyph">⬡</div>
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
                ['☑ Task List', 'docs_util_tasklist'],
                ['🔊 TTS', 'docs_util_tts'],
                ['🎨 Image Gen', 'docs_util_imagegen'],
                ['💾 File Save', 'docs_util_filesave'],
                ['🎬 Video Compose', 'docs_util_video'],
                ['▶ YouTube Upload', 'docs_util_youtube'],
                ['⑃ Branch', 'docs_util_branch'],
                ['🔁 Loop', 'docs_util_loop'],
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
                <span className="docs-card-icon">🌐</span>
                <h3>{t('docs_conn_api_title')}</h3>
                <p>{t('docs_conn_api_desc')}</p>
                <div className="docs-code">{t('docs_conn_api_example')}</div>
              </div>
              <div className="docs-card docs-card--purple">
                <span className="docs-card-icon">📤</span>
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
                <span className="docs-card-icon">📤</span>
                <h3>{t('docs_mp_share_title')}</h3>
                <p>{t('docs_mp_share_desc')}</p>
              </div>
              <div className="docs-card">
                <span className="docs-card-icon">📥</span>
                <h3>{t('docs_mp_import_title')}</h3>
                <p>{t('docs_mp_import_desc')}</p>
              </div>
              <div className="docs-card">
                <span className="docs-card-icon">❤️</span>
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
