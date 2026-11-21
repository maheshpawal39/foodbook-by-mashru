import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck, Trash2 } from 'lucide-react'
import { notificationsApi } from '../services'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { formatRelative, getErrorMessage } from '../utils/format'
import { useDocumentTitle } from '../hooks/useDebounce'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { SkeletonRows } from '../components/Loader'

export default function Notifications() {
  const { t, language } = useLanguage()
  const toast = useToast()
  const [data, setData] = useState({ notifications: [], unread: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useDocumentTitle(t('notifications.title'))

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await notificationsApi.list()
      setData(response.data?.data || { notifications: [], unread: 0 })
    } catch (err) {
      setError(getErrorMessage(err, t))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const markRead = async (note) => {
    if (note.is_read) return
    try {
      await notificationsApi.markRead(note.id)
      setData((current) => ({
        notifications: current.notifications.map((item) => (item.id === note.id ? { ...item, is_read: true } : item)),
        unread: Math.max(0, current.unread - 1),
      }))
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    }
  }

  const markAll = async () => {
    try {
      await notificationsApi.markAll()
      setData((current) => ({ notifications: current.notifications.map((item) => ({ ...item, is_read: true })), unread: 0 }))
      toast.success(t('notifications.readAll'))
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    }
  }

  const remove = async (note) => {
    try {
      await notificationsApi.remove(note.id)
      setData((current) => ({ notifications: current.notifications.filter((item) => item.id !== note.id), unread: note.is_read ? current.unread : Math.max(0, current.unread - 1) }))
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    }
  }

  return (
    <div className="page notifications-page">
      <PageHeader
        eyebrow={t('notifications.subtitle')}
        title={t('notifications.title')}
        actions={data.unread ? <button type="button" className="btn btn-ghost" onClick={markAll}><CheckCheck size={16} /> {t('notifications.markAll')}</button> : null}
      />

      {error ? (
        <EmptyState icon={Bell} title={t('errors.loadError')} message={error} action={<button type="button" className="btn btn-primary" onClick={load}>{t('common.retry')}</button>} />
      ) : loading ? (
        <SkeletonRows count={6} />
      ) : data.notifications.length === 0 ? (
        <EmptyState icon={Bell} title={t('notifications.empty')} />
      ) : (
        <div className="notification-page-list">
          {data.notifications.map((note) => (
            <article key={note.id} className={`notification-row panel ${note.is_read ? '' : 'unread'}`}>
              <span className={`notif-mark notif-${note.type || 'info'}`} />
              <div className="notification-copy">
                <div className="notification-title">
                  <strong>{note.title}</strong>
                  <span>{formatRelative(note.created_at, language)}</span>
                </div>
                {note.message ? <p>{note.message}</p> : null}
                {note.link ? (
                  <Link to={note.link} className="text-link" onClick={() => markRead(note)}>{t('notifications.view')} →</Link>
                ) : null}
              </div>
              <div className="notification-actions">
                {!note.is_read ? <button type="button" className="icon-btn" onClick={() => markRead(note)} title={t('notifications.markAll')}><CheckCheck size={16} /></button> : null}
                {note.user_id === null ? null : <button type="button" className="icon-btn danger" onClick={() => remove(note)} title={t('notifications.delete')}><Trash2 size={16} /></button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
