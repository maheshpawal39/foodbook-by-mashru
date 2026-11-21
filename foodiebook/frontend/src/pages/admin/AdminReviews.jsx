import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Star, Trash2 } from 'lucide-react'
import Avatar from '../../components/Avatar'
import Pagination from '../../components/Pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import { PanelSkeleton } from '../../components/Loaders'
import { adminService } from '../../services/adminService'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useDebouncedValue } from '../../hooks/useUtils'
import { formatDate } from '../../utils/format'
import { getErrorMessage } from '../../utils/errors'

export default function AdminReviews() {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, 350)
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      setData(await adminService.reviews({ q: debounced, page, per_page: 15 }))
    } catch (err) {
      setError(err)
    }
  }

  useEffect(() => { load() }, [debounced, page]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1) }, [debounced])

  const remove = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await adminService.deleteReview(deleteTarget.id)
      toast.success(t('admin.reviewDeleted'))
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
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('admin.searchReviews')} />
          </div>
          <span className="admin-count">{data?.pagination?.total || 0} {t('admin.reviews')}</span>
        </div>

        {error ? <div className="alert alert-error">{getErrorMessage(error, t)}</div> : !data ? <PanelSkeleton rows={7} /> : data.items.length === 0 ? (
          <p className="table-empty">{t('admin.noReviews')}</p>
        ) : (
          <div className="review-admin-list">
            {data.items.map((review) => (
              <article className="review-admin-card" key={review.id}>
                <Avatar user={review.user} size={38} />
                <div className="review-admin-body">
                  <div className="review-admin-head">
                    <div>
                      <strong>{review.user?.name}</strong>
                      <span className="muted"> → </span>
                      <Link to={`/recipes/${review.recipe?.id}`}>{review.recipe?.title}</Link>
                    </div>
                    <div className="review-admin-meta">
                      <span className="rating-inline"><Star size={13} fill="currentColor" /> {review.rating}</span>
                      <span>{formatDate(review.created_at, language)}</span>
                    </div>
                  </div>
                  <p>{review.comment || '—'}</p>
                </div>
                <button type="button" className="icon-btn danger" onClick={() => setDeleteTarget(review)} title={t('admin.deleteReview')}><Trash2 size={16} /></button>
              </article>
            ))}
          </div>
        )}

        {data?.pagination && <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} onChange={setPage} />}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        title={t('admin.deleteReview')}
        message={t('recipe.deleteReviewConfirm')}
        loading={busy}
      />
    </div>
  )
}
