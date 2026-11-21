import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import Modal from './Modal'

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel, danger = true, busy = false }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      onClose?.()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || t('common.confirmDelete')}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleConfirm}
            disabled={loading || busy}
          >
            {loading || busy ? t('common.saving') : confirmLabel || t('common.yesDelete')}
          </button>
        </>
      }
    >
      <p className="confirm-text">{message || t('common.confirmDeleteText')}</p>
    </Modal>
  )
}
