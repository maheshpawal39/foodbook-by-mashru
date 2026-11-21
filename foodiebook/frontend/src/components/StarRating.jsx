import { Star } from 'lucide-react'

export default function StarRating({
  value = 0,
  onChange,
  size = 16,
  showValue = false,
  count,
  className = '',
}) {
  const stars = [1, 2, 3, 4, 5]
  const interactive = typeof onChange === 'function'
  return (
    <span className={`star-rating ${interactive ? 'interactive' : ''} ${className}`}>
      <span className="stars" role={interactive ? 'radiogroup' : undefined}>
        {stars.map((star) => {
          const filled = value >= star - 0.25
          return interactive ? (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={Math.round(value) === star}
              aria-label={`${star} star`}
              className={filled ? 'star filled' : 'star'}
              onClick={() => onChange(star)}
            >
              <Star size={size} fill={filled ? 'currentColor' : 'none'} />
            </button>
          ) : (
            <Star key={star} size={size} className={filled ? 'star filled' : 'star'} fill={filled ? 'currentColor' : 'none'} />
          )
        })}
      </span>
      {showValue && <span className="rating-value">{Number(value || 0).toFixed(1)}</span>}
      {typeof count === 'number' && <span className="rating-count">({count})</span>}
    </span>
  )
}
