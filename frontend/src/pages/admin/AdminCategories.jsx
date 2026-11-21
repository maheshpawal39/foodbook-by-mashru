import { useCallback, useEffect, useState } from 'react'
import { LayoutGrid, Pencil, Plus, Trash2 } from 'lucide-react'
import { categoriesApi } from '../../services'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { getErrorMessage } from '../../utils/format'
import { useDocumentTitle } from '../../hooks/useDebounce'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'
import Field from '../../components/Field'
import ConfirmDialog from '../../components/ConfirmDialog'
import EmptyState from '../../components/EmptyState'
import ImageWithFallback from '../../components/ImageWithFallback'
import { InlineLoader, SkeletonGrid } from '../../components/Loader'

const ICONS = ['UtensilsCrossed', 'EggFried', 'Sun', 'Moon', 'Cookie', 'CakeSlice', 'CupSoda', 'Flame', 'Soup', 'Pizza', 'Store', 'Leaf', 'Sprout', 'Drumstick']

const EMPTY = { name: '', name_hi: '', description: '', icon: 'UtensilsCrossed', image: '', sort_order: 0 }

export default function AdminCategories() {
  const { t, language } = useLanguage()
  const toast = useToast()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  useDocumentTitle(t('admin.categoriesTitle'))

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await categoriesApi.list()
      setCategories(response.data?.data || [])
    } catch (err) {
      setError(getErrorMessage(err, t))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (category) => {
    setEditing(category)
    setForm({
      name: category.name || '',
      name_hi: category.name_hi || '',
      description: category.description || '',
      icon: category.icon || 'UtensilsCrossed',
      image: category.image || '',
      sort_order: category.sort_order || 0,
    })
    setErrors({})
    setModalOpen(true)
  }

  const save = async (event) => {
    event.preventDefault()
    if (form.name.trim().length < 2) {
      setErrors({ name: t('common.required') })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await categoriesApi.update(editing.id, form)
        toast.success(t('admin.categoryUpdated'))
      } else {
        await categoriesApi.create(form)
        toast.success(t('admin.categoryCreated'))
      }
      setModalOpen(false)
      load()
    } catch (err) {
      if (err.errors) setErrors(err.errors)
      toast.error(getErrorMessage(err, t))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!deleteTarget) return
    try {
      await categoriesApi.remove(deleteTarget.id)
      toast.success(t('admin.categoryDeleted'))
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    }
  }

  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow={t('admin.categoriesSub')}
        title={t('admin.categoriesTitle')}
        actions={<button type="button" className="btn btn-primary" onClick={openCreate}><Plus size={16} /> {t('admin.addCategory')}</button>}
      />

      {error ? (
        <EmptyState icon={LayoutGrid} title={t('errors.loadError')} message={error} action={<button type="button" className="btn btn-primary" onClick={load}>{t('common.retry')}</button>} />
      ) : loading ? (
        <SkeletonGrid count={9} />
      ) : categories.length === 0 ? (
        <EmptyState icon={LayoutGrid} title={t('common.noResults')} action={<button type="button" className="btn btn-primary" onClick={openCreate}>{t('admin.addCategory')}</button>} />
      ) : (
        <div className="admin-category-grid">
          {categories.map((category) => (
            <article className="admin-category-card panel" key={category.id}>
              <div className="admin-category-media">
                <ImageWithFallback src={category.image} alt={category.name} />
                <span>{category.recipe_count} {t('common.results')}</span>
              </div>
              <div className="admin-category-body">
                <div>
                  <h3>{language === 'hi' && category.name_hi ? category.name_hi : category.name}</h3>
                  <p>{category.description || `#${category.slug}`}</p>
                </div>
                <div className="table-actions">
                  <button type="button" className="icon-btn" onClick={() => openEdit(category)} title={t('common.edit')}><Pencil size={16} /></button>
                  <button type="button" className="icon-btn danger" onClick={() => setDeleteTarget(category)} title={t('common.delete')}><Trash2 size={16} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('admin.editCategory') : t('admin.addCategory')}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</button>
            <button type="submit" form="category-form" className="btn btn-primary" disabled={saving}>
              {saving ? <InlineLoader /> : t('common.save')}
            </button>
          </>
        }
      >
        <form id="category-form" onSubmit={save} className="category-form">
          <div className="form-row">
            <Field label={t('admin.categoryName')} htmlFor="category-name" error={errors.name} required>
              <input id="category-name" type="text" value={form.name} onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} />
            </Field>
            <Field label={t('admin.categoryNameHi')} htmlFor="category-name-hi">
              <input id="category-name-hi" type="text" value={form.name_hi} onChange={(event) => setForm((c) => ({ ...c, name_hi: event.target.value }))} />
            </Field>
          </div>
          <Field label={t('admin.description')} htmlFor="category-description">
            <textarea id="category-description" rows={3} value={form.description} onChange={(event) => setForm((c) => ({ ...c, description: event.target.value }))} />
          </Field>
          <div className="form-row">
            <Field label={t('admin.icon')} htmlFor="category-icon">
              <select id="category-icon" value={form.icon} onChange={(event) => setForm((c) => ({ ...c, icon: event.target.value }))}>
                {ICONS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
              </select>
            </Field>
            <Field label={t('admin.sortOrder')} htmlFor="category-order">
              <input id="category-order" type="number" min="0" value={form.sort_order} onChange={(event) => setForm((c) => ({ ...c, sort_order: event.target.value }))} />
            </Field>
          </div>
          <Field label={t('admin.imageUrl')} htmlFor="category-image" hint="https://…">
            <input id="category-image" type="url" value={form.image} onChange={(event) => setForm((c) => ({ ...c, image: event.target.value }))} />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={remove} title={t('common.confirmDelete')} message={deleteTarget?.name} />
    </div>
  )
}
