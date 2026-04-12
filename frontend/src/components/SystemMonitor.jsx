import { useRef } from 'react'
import { useI18n } from '../i18n/index'
import './SystemMonitor.css'

function RamBar({ percent }) {
  const level = percent >= 90 ? 'critical' : percent >= 75 ? 'warn' : 'ok'
  return (
    <div className={`ram-bar-track ${level}`}>
      <div className="ram-bar-fill" style={{ width: `${Math.min(percent, 100)}%` }} />
    </div>
  )
}

export default function SystemMonitor({ stats, compact = false }) {
  const prevSwap = useRef(0)
  const { t } = useI18n()

  if (!stats) {
    return (
      <div className="sys-monitor sys-monitor--loading">
        <span className="sys-label">{t('systemLoading')}</span>
      </div>
    )
  }

  const {
    ram_total_gb,
    ram_available_gb,
    ram_percent,
    cpu_percent,
    swap_used_gb,
    swap_total_gb,
    swap_percent,
  } = stats

  const ramLevel = ram_percent >= 90 ? 'critical' : ram_percent >= 75 ? 'warn' : 'ok'
  const swapActive = swap_used_gb > 0.1
  const swapCritical = swap_used_gb > 0.5
  const ramFree = ram_available_gb.toFixed(1)

  return (
    <div className={`sys-monitor ${compact ? 'sys-monitor--compact' : ''}`}>
      {/* RAM */}
      <div className={`sys-block sys-block--ram ${ramLevel}`}>
        <span className="sys-label">RAM</span>
        <RamBar percent={ram_percent} />
        <span className={`sys-value ram-${ramLevel}`}>
          {ramFree}GB {t('ramRemaining')}
        </span>
      </div>

      {/* CPU */}
      <div className="sys-block">
        <span className="sys-label">CPU</span>
        <span className={`sys-value ${cpu_percent >= 90 ? 'sys-critical' : cpu_percent >= 70 ? 'sys-warn' : ''}`}>
          {cpu_percent.toFixed(0)}%
        </span>
      </div>

      {/* Swap */}
      <div className={`sys-block ${swapCritical ? 'sys-block--swap-critical' : swapActive ? 'sys-block--swap-warn' : ''}`}>
        <span className="sys-label">SWAP</span>
        <span className={`sys-value ${swapCritical ? 'sys-critical' : swapActive ? 'sys-warn' : 'sys-ok'}`}>
          {swap_used_gb.toFixed(1)}GB
          {swapCritical && <span className="swap-alert"><svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2L1 14h14L8 2z"/><path d="M8 6v4"/><circle cx="8" cy="12" r="0.5" fill="currentColor"/></svg></span>}
        </span>
      </div>

      {/* Critical overlay badge */}
      {ram_percent >= 90 && (
        <div className="sys-critical-badge" title={t('ramDanger')}>
          🔴 {t('ramDanger')}
        </div>
      )}
    </div>
  )
}
