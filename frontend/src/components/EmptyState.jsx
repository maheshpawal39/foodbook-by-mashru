import { UtensilsCrossed } from 'lucide-react'

export default function EmptyState({ icon: Icon = UtensilsCrossed, title, message, action, className = '' }) {
  return (
    <div className={`empty-state ${className}`}>
      <span className="empty-icon">
        <Icon size={30} />
      </span>
      <h3>{title}</h3>
      {message ? <p>{message}</p> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  )
}
