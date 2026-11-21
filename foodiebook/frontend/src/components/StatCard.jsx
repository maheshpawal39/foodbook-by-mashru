export default function StatCard({ icon: Icon, label, value, hint, tone = 'maroon' }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-icon">{Icon && <Icon size={20} />}</div>
      <div className="stat-copy">
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
        {hint && <span className="stat-hint">{hint}</span>}
      </div>
    </div>
  )
}
