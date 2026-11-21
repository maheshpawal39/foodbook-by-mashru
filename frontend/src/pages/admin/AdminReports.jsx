import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Flag, X } from 'lucide-react'
import { adminApi } from '../../services'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { formatDate, getErrorMessage } from '../../utils/format'
import { useDocumentTitle } from '../../hooks/useDebounce'
import PageHeader from '../../components/PageHeader'
import Pagination from '../../components/Pagination'
import EmptyState from '../../components/EmptyState'
import { SkeletonRows } from '../../components/Loader'

const FILTERS = [
  { value: '', key: 'admin.allReports' },
  { value: 'pending', key: 'admin.pending' },
  { value: 'resolved', key: 'admin.resolved' },
  { value: 'dismissed', key: 'admin.dismissed' },
]

export default function AdminReports() {
  const { t, language } = useLanguage()
  const toast = useToast()
  const [reports, setReports] = useState([])
  const [pagination, setPagination] = useState(null)
  const [status, setStatus] = useState('pending')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  useDocumentTitle(t('admin.reportsTitle'))

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await adminApi.reports({ status: status || undefined, page, per_page: 10 })
      setReports(response.data?.data || [])
      setPagination(response.data?.pagination || null)
    } catch (err) {
      setError(getErrorMessage(err, t))
    } finally {
      setLoading(false)
    }
  }, [status, page, t])

  useEffect(() => {
    load()
  }, [load])

  const updateReport = async (report, nextStatus) => {
    setBusyId(report.id)
    try {
      await adminApi.updateReport(report.id, nextStatus)
      toast.success(t('admin.reportUpdated'))
      load()
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page admin-page">
      <PageHeader eyebrow={t('admin.reportsSub')} title={t('admin.reportsTitle')} actions={<Flag size={28} className="page-watermark" />} />

      <div className="tabs">
        {FILTERS.map((filter) => (
          <button key={filter.value} type="button" className={status === filter.value ? 'active' : ''} onClick={() => { setStatus(filter.value); setPage(1) }}>
            {t(filter.key)}
          </button>
        ))}
      </div>

      {error ? (
        <EmptyState icon={Flag} title={t('errors.loadError')} message={error} action={<button type="button" className="btn btn-primary" onClick={load}>{t('common.retry')}</button>} />
      ) : loading ? (
        <SkeletonRows count={6} />
      ) : reports.length === 0 ? (
        <EmptyState icon={Flag} title={t('admin.noReports')} />
      ) : (
        <>
          <div className="report-list">
            {reports.map((report) => (
              <article className="report-card panel" key={report.id}>
                <div className="report-card-head">
                  <span className={`report-status status-${report.status}`}>{t(`admin.${report.status}`)}</span>
                  <span className="report-date">{formatDate(report.created_at, language)}</span>
                </div>
                <h3>{report.reason}</h3>
                {report.details ? <p>{report.details}</p> : null}
                <div className="report-target">
                  {report.recipe ? (
                    <Link to={`/recipes/${report.recipe.id}`} className="report-recipe">
                      {report.recipe.image ? <img src={report.recipe.image} alt={report.recipe.title} /> : null}
                      <span><small>{t('form.name')}</small><strong>{report.recipe.title}</strong></span>
                    </Link>
                  ) : null}
                  {report.review ? (
                    <div className="report-review">
                      <small>{t('detail.reviewsTitle')}</small>
                      <p>“{report.review.comment}”</p>
                      <span>{report.review.user?.name} · {report.review.rating}★</span>
                    </div>
                  ) : null}
                </div>
                <div className="report-foot">
                  <span>{t('admin.reportedBy', { name: report.reporter?.name || '—' })}</span>
                  {report.status === 'pending' ? (
                    <div>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => updateReport(report, 'dismissed')} disabled={busyId === report.id}>
                        <X size={15} /> {t('admin.dismiss')}
                      </button>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => updateReport(report, 'resolved')} disabled={busyId === report.id}>
                        <Check size={15} /> {t('admin.resolve')}
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
          <Pagination page={pagination?.page || 1} pages={pagination?.pages || 1} total={pagination?.total} onPage={setPage} />
        </>
      )}
    </div>
  )
}
