import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { favoritesApi } from '../services'
import { getErrorMessage } from '../utils/format'

export default function FavoriteButton({ recipe, className = '', showLabel = false, onChange }) {
  const { isAuthenticated } = useAuth()
  const { t } = useLanguage()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [saved, setSaved] = useState(Boolean(recipe?.is_favorite))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setSaved(Boolean(recipe?.is_favorite))
  }, [recipe?.is_favorite, recipe?.id])

  const toggle = async (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!isAuthenticated) {
      toast.info(t('errors.unauthorized'))
      navigate('/login', { state: { from: location } })
      return
    }
    if (busy) return
    setBusy(true)
    try {
      if (saved) {
        await favoritesApi.remove(recipe.id)
        setSaved(false)
        toast.success(t('favorites.removed'))
        onChange?.(false)
      } else {
        await favoritesApi.add(recipe.id)
        setSaved(true)
        toast.success(t('favorites.added'))
        onChange?.(true)
      }
    } catch (error) {
      toast.error(getErrorMessage(error, t))
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={`favorite-btn ${showLabel ? 'btn' : ''} ${saved ? 'is-saved' : ''} ${className}`}
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? t('common.removeFromFavorites') : t('common.addToFavorites')}
      title={saved ? t('common.removeFromFavorites') : t('common.addToFavorites')}
    >
      <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
      {showLabel ? <span>{saved ? t('common.removeFromFavorites') : t('common.addToFavorites')}</span> : null}
    </button>
  )
}
