import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Flag, Trash2, XCircle } from 'lucide-react'
import ConfirmDialog from '../../components/ConfirmDialog'
import { PanelSkeleton } from '../../components/Loaders'
import { adminService } from '../../services/adminService'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { formatDate } from '../../utils/format'
import { getErrorMessage } from '../../utils/errors'

export default function AdminReports() {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const [status, setStatus] = useState('open')
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      setItems(null)
      const data = await adminService.reports({ status })
      setItems(data.items)
    } catch (err) {
      setError(err)
    }
  }

  useEffect(() => { load() }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  const update = async (report, nextStatus, deleteContent = false) => {
    try {
      await adminService.updateReport(report.id, { status: nextStatus, delete_content: deleteContent })
      toast.success(t('admin.reportUpdated'))
      setDeleteTarget(null)
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    }
  }

  const deleteContent = async () => {
    if (!deleteTarget) return
    setBusy(true)
    await update(deleteTarget, 'resolved', true)
    setBusy(false)
  }

  return (
    <div className="admin-section">
      <div className="panel">
        <div className="admin-toolbar">
          <div className="panel-heading compact">
            <div><h2>{t('admin.reportedContent')}</h2><p>{t('admin.reason')}</p></div>
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label={t('admin.reportStatus')}>
            <option value="open">{t('admin.open')}</option>
            <option value="resolved">{t('admin.resolved')}</option>
            <option value="dismissed">{t('admin.dismissed')}</option>
          </select>
          <span className="admin-count">{items?.length || 0}</span>
        </div>

        {error ? <div className="alert alert-error">{getErrorMessage(error, t)}</div> : !items ? <PanelSkeleton rows={5} /> : items.length === 0 ? (
          <p className="table-empty">{t('admin.noReports')}</p>
        ) : (
          <div className="report-list">
            {items.map((report) => (
              <article className="report-card" key={report.id}>
                <span className={`report-icon ${report.status}`}><Flag size={18} /></span>
                <div className="report-body">
                  <div className="report-head">
                    <div>
                      <span className={`status-pill ${report.status === 'open' ? 'inactive' : report.status === 'resolved' ? 'active' : ''}`}>{t(`admin.${report.status}`)}</span>
                      <strong>{t('admin.reason')}: {report.reason}</strong>
                    </div>
                    <span>{formatDate(report.created_at, language)}</span>
                  </div>
                  <p className="report-meta">
                    {t('admin.reporter')}: <strong>{report.reporter?.name}</strong> · {report.target_type}:
                    {report.target ? (
                      report.target.kind === 'recipe' ? (
                        <Link to={`/recipes/${report.target.id}`}> {report.target.label}</Link>
                      ) : (
                        <Link to={`/recipes/${report.target.recipe_id}#reviews`}> {report.target.label || '—'}</Link>
                      )
                    ) : (
                      <em> {t('errors.not_found')}</em>
                    )}
                  </p>
                  {report.status === 'open' && (
                    <div className="report-actions">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => update(report, 'resolved')}><CheckCircle2 size={14} /> {t('admin.resolve')}</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => update(report, 'dismissed')}><XCircle size={14} /> {t('admin.dismiss')}</button>
                      <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => setDeleteTarget(report)}><Trash2 size={14} /> {t('admin.deleteContent')}</button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteContent}
        title={t('admin.deleteContent')}
        message={`${deleteTarget?.target?.label || ''} — ${t('common.confirm')}?`}
        loading={busy}
      />
    </div>
  )
}
