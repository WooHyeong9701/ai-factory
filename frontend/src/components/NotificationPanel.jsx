import { useState } from 'react'
import { useI18n } from '../i18n/index'
import './NotificationPanel.css'

const ICON_MAP = {
  workflow_done: '✅',
  workflow_error: '❌',
  update: '🆕',
  system: '💡',
  tip: '💡',
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
              <span className="notif-icon">{ICON_MAP[n.type] || '🔔'}</span>
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
