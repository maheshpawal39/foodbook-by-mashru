import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

function pagesAround(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}

export default function Pagination({ page = 1, pages = 1, onPage, total, perPage }) {
  const { t } = useLanguage()
  if (pages <= 1) return null
  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" className="page-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t('common.previous')}>
        <ChevronLeft size={17} />
        <span>{t('common.previous')}</span>
      </button>
      <div className="page-numbers">
        {pagesAround(page, pages).map((item, index) =>
          item === '…' ? (
            <span key={`ellipsis-${index}`} className="page-ellipsis">…</span>
          ) : (
            <button
              key={item}
              type="button"
              className={`page-number ${item === page ? 'active' : ''}`}
              onClick={() => onPage(item)}
              aria-current={item === page ? 'page' : undefined}
            >
              {item}
            </button>
          )
        )}
      </div>
      <button type="button" className="page-btn" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label={t('common.next')}>
        <span>{t('common.next')}</span>
        <ChevronRight size={17} />
      </button>
      {total !== undefined ? (
        <span className="page-summary">
          {total} {t('common.results')}
        </span>
      ) : null}
    </nav>
  )
}
