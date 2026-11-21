import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function SectionHeader({ eyebrow, title, subtitle, actionLabel, actionTo, onAction, icon: Icon }) {
  return (
    <div className="section-header">
      <div>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h2>
          {Icon ? <Icon size={20} className="section-icon" /> : null}
          {title}
        </h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actionLabel && actionTo ? (
        <Link to={actionTo} className="text-link">
          {actionLabel} <ArrowRight size={15} />
        </Link>
      ) : null}
      {actionLabel && onAction ? (
        <button type="button" className="text-link" onClick={onAction}>
          {actionLabel} <ArrowRight size={15} />
        </button>
      ) : null}
    </div>
  )
}
