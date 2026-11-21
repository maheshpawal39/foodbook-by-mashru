import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'
import { useLanguage } from '../context/LanguageContext'

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel, loading = false, danger = true }) {
  const { t } = useLanguage()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || t('common.confirm')}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={loading}>
            {loading ? t('common.saving') : confirmLabel || t('common.confirm')}
          </button>
        </>
      }
    >
      <div className="confirm-body">
        <span className={`confirm-icon ${danger ? 'danger' : ''}`}>
          <AlertTriangle size={22} />
        </span>
        <p>{message}</p>
      </div>
    </Modal>
  )
}
