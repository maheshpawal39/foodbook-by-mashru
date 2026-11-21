export default function StatCard({ icon: Icon, label, value, tone = 'maroon', detail }) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <span className="stat-icon">{Icon ? <Icon size={22} /> : null}</span>
      <div className="stat-copy">
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
        {detail ? <span className="stat-detail">{detail}</span> : null}
      </div>
    </div>
  )
}
