import { useLanguage } from '../context/LanguageContext'

export default function StatusBadge({ status }) {
  const { t } = useLanguage()
  return (
    <span className={`badge ${status === 'published' ? 'badge-published' : status === 'draft' ? 'badge-draft' : 'badge-neutral'}`}>
      {status === 'published' ? t('common.published') : status === 'draft' ? t('common.draft') : status}
    </span>
  )
}
