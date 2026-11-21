import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Search, Star, Trash2 } from 'lucide-react'
import { adminApi } from '../../services'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { formatDate, getErrorMessage, initials } from '../../utils/format'
import { useDebounce, useDocumentTitle } from '../../hooks/useDebounce'
import PageHeader from '../../components/PageHeader'
import RatingStars from '../../components/RatingStars'
import Pagination from '../../components/Pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import EmptyState from '../../components/EmptyState'
import { SkeletonRows } from '../../components/Loader'

export default function AdminReviews() {
  const { t, language } = useLanguage()
  const toast = useToast()
  const [reviews, setReviews] = useState([])
  const [pagination, setPagination] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const debounced = useDebounce(search, 400)
  useDocumentTitle(t('admin.reviewsTitle'))

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await adminApi.reviews({ q: debounced || undefined, page, per_page: 12 })
      setReviews(response.data?.data || [])
      setPagination(response.data?.pagination || null)
    } catch (err) {
      setError(getErrorMessage(err, t))
    } finally {
      setLoading(false)
    }
  }, [debounced, page, t])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [debounced])

  const removeReview = async () => {
    if (!deleteTarget) return
    try {
      await adminApi.deleteReview(deleteTarget.id)
      toast.success(t('admin.reviewDeleted'))
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    }
  }

  return (
    <div className="page admin-page">
      <PageHeader eyebrow={t('admin.reviewsSub')} title={t('admin.reviewsTitle')} actions={<MessageSquare size={28} className="page-watermark" />} />

      <div className="table-toolbar panel">
        <div className="table-search">
          <Search size={17} />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('admin.searchReviews')} />
        </div>
      </div>

      {error ? (
        <EmptyState icon={MessageSquare} title={t('errors.loadError')} message={error} action={<button type="button" className="btn btn-primary" onClick={load}>{t('common.retry')}</button>} />
      ) : loading ? (
        <SkeletonRows count={8} />
      ) : reviews.length === 0 ? (
        <EmptyState icon={MessageSquare} title={t('common.noResults')} />
      ) : (
        <div className="table-wrap panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('common.author')}</th>
                <th>{t('form.name')}</th>
                <th>{t('common.rating')}</th>
                <th>{t('common.reviews')}</th>
                <th>{t('common.date')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id}>
                  <td>
                    <div className="table-user">
                      <span className="mini-avatar">{initials(review.user?.name || '')}</span>
                      <div><strong>{review.user?.name}</strong><span>{formatDate(review.created_at, language)}</span></div>
                    </div>
                  </td>
                  <td>{review.recipe_title ? <Link to={`/recipes/${review.recipe_id}#reviews`}>{review.recipe_title}</Link> : '—'}</td>
                  <td><RatingStars rating={review.rating} size={13} showValue /></td>
                  <td className="table-comment">{review.comment}</td>
                  <td>{formatDate(review.created_at, language)}</td>
                  <td>
                    <button type="button" className="icon-btn danger" onClick={() => setDeleteTarget(review)} title={t('admin.deleteReview')}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={pagination?.page || 1} pages={pagination?.pages || 1} total={pagination?.total} onPage={setPage} />
        </div>
      )}

      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={removeReview} title={t('admin.deleteReview')} message={deleteTarget?.comment} />
    </div>
  )
}
