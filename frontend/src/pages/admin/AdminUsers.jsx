import { useCallback, useEffect, useState } from 'react'
import { Search, ShieldCheck, Trash2, UserCheck, UserX } from 'lucide-react'
import { adminApi } from '../../services'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { formatDate, getErrorMessage, initials } from '../../utils/format'
import { useDebounce, useDocumentTitle } from '../../hooks/useDebounce'
import PageHeader from '../../components/PageHeader'
import Pagination from '../../components/Pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import EmptyState from '../../components/EmptyState'
import { SkeletonRows } from '../../components/Loader'

export default function AdminUsers() {
  const { t, language } = useLanguage()
  const { user: currentUser } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const debounced = useDebounce(search, 400)
  useDocumentTitle(t('admin.usersTitle'))

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await adminApi.users({ q: debounced || undefined, role: role || undefined, page, per_page: 12 })
      setUsers(response.data?.data || [])
      setPagination(response.data?.pagination || null)
    } catch (err) {
      setError(getErrorMessage(err, t))
    } finally {
      setLoading(false)
    }
  }, [debounced, role, page, t])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [debounced, role])

  const updateUser = async (target, payload) => {
    setBusyId(target.id)
    try {
      const response = await adminApi.updateUser(target.id, payload)
      setUsers((current) => current.map((item) => (item.id === target.id ? response.data?.data : item)))
      toast.success(t('admin.userUpdated'))
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setBusyId(null)
    }
  }

  const removeUser = async () => {
    if (!deleteTarget) return
    try {
      await adminApi.deleteUser(deleteTarget.id)
      toast.success(t('admin.userDeleted'))
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    }
  }

  return (
    <div className="page admin-page">
      <PageHeader eyebrow={t('admin.usersSub')} title={t('admin.usersTitle')} actions={<ShieldCheck size={28} className="page-watermark" />} />

      <div className="table-toolbar panel">
        <div className="table-search">
          <Search size={17} />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('admin.searchUsers')} />
        </div>
        <select value={role} onChange={(event) => setRole(event.target.value)} aria-label={t('admin.role')}>
          <option value="">{t('admin.allRoles')}</option>
          <option value="admin">{t('admin.admins')}</option>
          <option value="user">{t('auth.demoUser')}</option>
        </select>
      </div>

      {error ? (
        <EmptyState icon={ShieldCheck} title={t('errors.loadError')} message={error} action={<button type="button" className="btn btn-primary" onClick={load}>{t('common.retry')}</button>} />
      ) : loading ? (
        <SkeletonRows count={8} />
      ) : users.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={t('common.noResults')} />
      ) : (
        <div className="table-wrap panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('auth.name')}</th>
                <th>{t('auth.email')}</th>
                <th>{t('admin.role')}</th>
                <th>{t('admin.active')}</th>
                <th>{t('admin.joined')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="table-user">
                      <span className="mini-avatar">{user.avatar ? <img src={user.avatar} alt={user.name} /> : initials(user.name)}</span>
                      <div><strong>{user.name}</strong>{user.is_admin ? <span className="badge badge-gold">{t('admin.admins')}</span> : null}</div>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      value={user.role}
                      disabled={busyId === user.id || user.id === currentUser.id}
                      onChange={(event) => updateUser(user, { role: event.target.value })}
                      aria-label={t('admin.changeRole')}
                    >
                      <option value="user">{t('auth.demoUser')}</option>
                      <option value="admin">{t('admin.admins')}</option>
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`toggle ${user.is_active ? 'on' : ''}`}
                      onClick={() => updateUser(user, { is_active: !user.is_active })}
                      disabled={busyId === user.id || user.id === currentUser.id}
                      aria-pressed={user.is_active}
                      title={user.is_active ? t('admin.deactivate') : t('admin.activate')}
                    >
                      <span />
                    </button>
                  </td>
                  <td>{formatDate(user.created_at, language)}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        disabled={busyId === user.id || user.id === currentUser.id}
                        onClick={() => updateUser(user, { is_active: !user.is_active })}
                        title={user.is_active ? t('admin.deactivate') : t('admin.activate')}
                      >
                        {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                      <button type="button" className="icon-btn danger" disabled={user.id === currentUser.id} onClick={() => setDeleteTarget(user)} title={t('admin.deleteUser')}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={pagination?.page || 1} pages={pagination?.pages || 1} total={pagination?.total} onPage={setPage} />
        </div>
      )}

      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={removeUser} title={t('admin.deleteUser')} message={`${deleteTarget?.name} · ${t('common.confirmDeleteText')}`} />
    </div>
  )
}
