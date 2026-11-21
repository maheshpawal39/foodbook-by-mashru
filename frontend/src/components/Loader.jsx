export function Spinner({ size = 22 }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />
}

export function FullPageLoader({ label = 'Loading…' }) {
  return (
    <div className="page-loader">
      <Spinner size={34} />
      <p>{label}</p>
    </div>
  )
}

export function InlineLoader({ label }) {
  return (
    <span className="inline-loader">
      <Spinner size={16} />
      {label ? <span>{label}</span> : null}
    </span>
  )
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-image" />
      <div className="skeleton-body">
        <div className="skeleton skeleton-line w-40" />
        <div className="skeleton skeleton-line w-90" />
        <div className="skeleton skeleton-line w-70" />
        <div className="skeleton skeleton-line w-50" />
      </div>
    </div>
  )
}

export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="recipe-grid">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  )
}

export function SkeletonRows({ count = 5 }) {
  return (
    <div className="skeleton-rows">
      {Array.from({ length: count }).map((_, index) => (
        <div className="skeleton skeleton-line" key={index} />
      ))}
    </div>
  )
}
