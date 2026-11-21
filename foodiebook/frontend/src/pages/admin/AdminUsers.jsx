import { useEffect, useState } from 'react'
import { Search, Trash2, UserCheck, UserX } from 'lucide-react'
import Avatar from '../../components/Avatar'
import Pagination from '../../components/Pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import { PanelSkeleton } from '../../components/Loaders'
import { adminService } from '../../services/adminService'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useDebouncedValue } from '../../hooks/useUtils'
import { formatDate } from '../../utils/format'
import { getErrorMessage } from '../../utils/errors'

export default function AdminUsers() {
  const { t, language } = useLanguage()
  const { user: me } = useAuth()
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, 350)
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await adminService.users({ q: debounced, page, per_page: 15 }))
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, page])

  useEffect(() => { setPage(1) }, [debounced])

  const update = async (target, payload) => {
    try {
      await adminService.updateUser(target.id, payload)
      toast.success(t('admin.userUpdated'))
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    }
  }

  const remove = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await adminService.deleteUser(deleteTarget.id)
      toast.success(t('admin.userDeleted'))
      setDeleteTarget(null)
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-section">
      <div className="panel">
        <div className="admin-toolbar">
          <div className="search-inline">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('admin.searchUsers')} />
          </div>
          <span className="admin-count">{data?.pagination?.total || 0} {t('admin.users')}</span>
        </div>

        {error ? (
          <div className="alert alert-error">{getErrorMessage(error, t)}</div>
        ) : loading ? (
          <PanelSkeleton rows={8} />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('auth.name')}</th>
                  <th>{t('admin.role')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('admin.recipesCount')}</th>
                  <th>{t('admin.joined')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {data?.items?.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="table-user">
                        <Avatar user={user} size={36} />
                        <div><strong>{user.name}</strong><span>{user.email}</span></div>
                      </div>
                    </td>
                    <td>
                      <select
                        value={user.role}
                        disabled={user.id === me?.id}
                        onChange={(event) => update(user, { role: event.target.value })}
                        aria-label={t('admin.role')}
                      >
                        <option value="user">{t('settings.user')}</option>
                        <option value="admin">{t('settings.admin')}</option>
                      </select>
                    </td>
                    <td>
                      <span className={`status-pill ${user.is_active ? 'active' : 'inactive'}`}>
                        {user.is_active ? t('admin.active') : t('admin.inactive')}
                      </span>
                    </td>
                    <td>{user.recipe_count}</td>
                    <td>{formatDate(user.created_at, language)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title={user.is_active ? t('admin.deactivate') : t('admin.activate')}
                          onClick={() => update(user, { is_active: !user.is_active })}
                          disabled={user.id === me?.id}
                        >
                          {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button type="button" className="icon-btn danger" onClick={() => setDeleteTarget(user)} disabled={user.id === me?.id} title={t('admin.deleteUser')}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.items?.length && <p className="table-empty">{t('admin.noUsers')}</p>}
          </div>
        )}

        {data?.pagination && <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} onChange={setPage} />}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        title={t('admin.deleteUser')}
        message={deleteTarget ? t('admin.deleteUserConfirm', { name: deleteTarget.name }) : ''}
        loading={busy}
      />
    </div>
  )
}
