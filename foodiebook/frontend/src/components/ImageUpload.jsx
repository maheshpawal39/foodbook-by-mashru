import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2, Upload } from 'lucide-react'
import { uploadService } from '../services/userService'
import { useLanguage } from '../context/LanguageContext'
import { mediaUrl } from '../utils/format'
import { getErrorMessage } from '../utils/errors'

export default function ImageUpload({ value, onChange, kind = 'recipe', label, shape = 'wide' }) {
  const { t } = useLanguage()
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const handleFile = async (file) => {
    setError('')
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError(t('recipeForm.imageTypeError'))
      return
    }
    setUploading(true)
    try {
      const data = await uploadService.image(file, kind)
      onChange?.(data.path)
    } catch (err) {
      setError(getErrorMessage(err, t))
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={`image-upload ${shape === 'circle' ? 'circle' : ''}`}>
      <div
        className={`image-drop ${value ? 'has-image' : ''} ${dragOver ? 'dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          handleFile(event.dataTransfer.files?.[0])
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && inputRef.current?.click()}
      >
        {value ? (
          <img src={mediaUrl(value)} alt={label || 'Preview'} />
        ) : (
          <div className="image-placeholder">
            <span className="image-placeholder-icon"><ImagePlus size={26} /></span>
            <strong>{label || t('recipeForm.media')}</strong>
            <span>{t('recipeForm.imageHint')}</span>
          </div>
        )}
        {uploading && (
          <div className="image-uploading">
            <Loader2 className="spin" size={22} />
            <span>{t('common.uploading')}</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => handleFile(event.target.files?.[0])}
          hidden
        />
      </div>
      <div className="image-upload-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Upload size={14} />
          {value ? t('recipeForm.changeImage') : t('common.upload')}
        </button>
        {value && (
          <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => onChange?.('')} disabled={uploading}>
            <Trash2 size={14} />
            {t('recipeForm.removeImage')}
          </button>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
