import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export default function Pagination({ page = 1, pages = 1, onChange, total, perPage }) {
  const { t } = useLanguage()
  if (!pages || pages <= 1) return null
  const windowSize = 5
  let start = Math.max(1, page - 2)
  let end = Math.min(pages, start + windowSize - 1)
  start = Math.max(1, end - windowSize + 1)
  const numbers = []
  for (let i = start; i <= end; i += 1) numbers.push(i)

  return (
    <div className="pagination-wrap">
      {typeof total === 'number' && (
        <p className="pagination-total">
          {t('common.page')} {page} {t('common.of')} {pages} · {total} {t('common.items')}
        </p>
      )}
      <nav className="pagination" aria-label="Pagination">
        <button type="button" className="page-btn" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label={t('common.previous')}>
          <ChevronLeft size={17} />
        </button>
        {start > 1 && (
          <>
            <button type="button" className="page-btn" onClick={() => onChange(1)}>1</button>
            {start > 2 && <span className="page-gap">…</span>}
          </>
        )}
        {numbers.map((number) => (
          <button
            key={number}
            type="button"
            className={`page-btn ${number === page ? 'active' : ''}`}
            onClick={() => onChange(number)}
          >
            {number}
          </button>
        ))}
        {end < pages && (
          <>
            {end < pages - 1 && <span className="page-gap">…</span>}
            <button type="button" className="page-btn" onClick={() => onChange(pages)}>{pages}</button>
          </>
        )}
        <button type="button" className="page-btn" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label={t('common.next')}>
          <ChevronRight size={17} />
        </button>
      </nav>
    </div>
  )
}
