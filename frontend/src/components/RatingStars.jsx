import { Star } from 'lucide-react'

export default function RatingStars({ rating = 0, count, size = 15, showValue = false, className = '' }) {
  const rounded = Math.round(Number(rating) || 0)
  return (
    <span className={`rating-stars ${className}`} title={`${Number(rating || 0).toFixed(1)} / 5`}>
      <span className="stars-row">
        {[1, 2, 3, 4, 5].map((index) => (
          <Star key={index} size={size} className={index <= rounded ? 'star-filled' : 'star-empty'} fill={index <= rounded ? 'currentColor' : 'none'} />
        ))}
      </span>
      {showValue ? <strong>{Number(rating || 0).toFixed(1)}</strong> : null}
      {count !== undefined ? <span className="rating-count">({count})</span> : null}
    </span>
  )
}

export function RatingInput({ value, onChange, size = 26, label }) {
  return (
    <div className="rating-input" role="radiogroup" aria-label={label || 'Rating'}>
      {[1, 2, 3, 4, 5].map((index) => (
        <button
          key={index}
          type="button"
          role="radio"
          aria-checked={value === index}
          aria-label={`${index} star${index > 1 ? 's' : ''}`}
          className={index <= value ? 'active' : ''}
          onClick={() => onChange(index)}
        >
          <Star size={size} fill={index <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  )
}
