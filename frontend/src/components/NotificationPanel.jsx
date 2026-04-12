import { useState } from 'react'
import { useI18n } from '../i18n/index'
import './NotificationPanel.css'

const ICON_MAP = {
  workflow_done: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  workflow_error: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  update: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  system: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  tip: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>,
}

function timeAgo(ts, t) {
  const diff = Date.now() - ts
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return t('justNow')
  const min = Math.floor(sec / 60)
  if (min < 60) return t('minutesAgo', { n: min })
  const hr = Math.floor(min / 60)
  if (hr < 24) return t('hoursAgo', { n: hr })
  const d = Math.floor(hr / 24)
  return t('daysAgo', { n: d })
}

export default function NotificationPanel({ notifications, onClear, onClearAll, onClose }) {
  const { t } = useI18n()
  return (
    <>
      <div className="notif-overlay" onClick={onClose} />
      <div className="notif-panel">
      <div className="notif-header">
        <span className="notif-title">{t('notifications')}</span>
        {notifications.length > 0 && (
          <button className="notif-clear-all" onClick={onClearAll}>
            {t('clearAll')}
          </button>
        )}
      </div>

      <div className="notif-list">
        {notifications.length === 0 ? (
          <div className="notif-empty">{t('noNotifications')}</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`notif-item ${n.read ? '' : 'notif-unread'}`}
              onClick={() => onClear(n.id)}
            >
              <span className="notif-icon">{ICON_MAP[n.type] || <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}</span>
              <div className="notif-content">
                <div className="notif-msg">{n.message}</div>
                <div className="notif-time">{timeAgo(n.timestamp, t)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
    </>
  )
}
