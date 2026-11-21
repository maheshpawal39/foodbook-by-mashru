import { avatarUrl, initials } from '../utils/format'

export default function Avatar({ user, name, image, size = 38, className = '' }) {
  const displayName = name || user?.name
  const src = image ?? user?.profile_image
  const style = { width: size, height: size }
  return (
    <span className={`avatar ${className}`} style={style} title={displayName}>
      {src ? (
        <img src={avatarUrl(src)} alt={displayName || 'User'} onError={(event) => { event.currentTarget.style.display = 'none' }} />
      ) : null}
      <span className="avatar-fallback">{initials(displayName)}</span>
    </span>
  )
}
