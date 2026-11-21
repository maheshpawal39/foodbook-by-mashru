import { useEffect, useState } from 'react'
import { Edit3, Plus, Sparkles, Trash2 } from 'lucide-react'
import Modal from '../../components/Modal'
import ImageUpload from '../../components/ImageUpload'
import ConfirmDialog from '../../components/ConfirmDialog'
import CategoryIcon from '../../components/CategoryIcon'
import EmptyState from '../../components/EmptyState'
import { PanelSkeleton } from '../../components/Loaders'
import { adminService } from '../../services/adminService'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { mediaUrl } from '../../utils/format'
import { getErrorMessage } from '../../utils/errors'

const ICON_NAMES = ['Utensils', 'Coffee', 'Sun', 'MoonStar', 'Cookie', 'CakeSlice', 'CupSoda', 'Flame', 'Soup', 'Pizza', 'Store', 'Salad', 'Leaf', 'Drumstick']

const emptyCategory = {
  name: '',
  name_hi: '',
  description: '',
  description_hi: '',
  icon: 'Utensils',
  image: '',
  is_active: true,
}

export default function AdminCategories() {
  const { t, pick } = useLanguage()
  const { toast } = useToast()
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyCategory)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const data = await adminService.categories()
      setItems(data.items)
    } catch (err) {
      setError(err)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyCategory)
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (category) => {
    setEditing(category)
    setForm({
      name: category.name || '',
      name_hi: category.name_hi || '',
      description: category.description || '',
      description_hi: category.description_hi || '',
      icon: category.icon || 'Utensils',
      image: category.image || '',
      is_active: category.is_active,
    })
    setFormError('')
    setModalOpen(true)
  }

  const save = async () => {
    setFormError('')
    if (form.name.trim().length < 2 || !form.name_hi.trim()) {
      setFormError(t('validation.required'))
      return
    }
    setSaving(true)
    try {
      if (editing) await adminService.updateCategory(editing.id, form)
      else await adminService.createCategory(form)
      toast.success(t('admin.categorySaved'))
      setModalOpen(false)
      await load()
    } catch (err) {
      setFormError(getErrorMessage(err, t))
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (category) => {
    try {
      await adminService.updateCategory(category.id, { is_active: !category.is_active })
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    }
  }

  const remove = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await adminService.deleteCategory(deleteTarget.id)
      toast.success(t('admin.categoryDeleted'))
      setDeleteTarget(null)
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setBusy(false)
    }
  }

  if (error) return <div className="alert alert-error">{getErrorMessage(error, t)}</div>
  if (!items) return <PanelSkeleton rows={6} />

  return (
    <div className="admin-section">
      <div className="panel">
        <div className="panel-heading">
          <div><h2>{t('admin.manageCategories')}</h2><p>{t('admin.categoriesHint')}</p></div>
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={15} /> {t('admin.addCategory')}</button>
        </div>

        {items.length === 0 ? (
          <EmptyState icon={Sparkles} title={t('categories.empty')} message={t('categories.emptyHint')} />
        ) : (
          <div className="admin-category-grid">
            {items.map((category) => (
              <article className="admin-category-card" key={category.id}>
                <div className="admin-category-image">
                  <img src={mediaUrl(category.image)} alt="" />
                  <span className="category-icon-wrap"><CategoryIcon name={category.icon} size={20} /></span>
                </div>
                <div className="admin-category-body">
                  <div>
                    <h3>{pick(category.name, category.name_hi)}</h3>
                    <span>{category.name_hi}</span>
                  </div>
                  <span className={`status-pill clickable ${category.is_active ? 'active' : 'inactive'}`} onClick={() => toggleActive(category)}>
                    {category.is_active ? t('admin.active') : t('admin.inactive')}
                  </span>
                  <p>{t('categories.recipes', { count: category.recipe_count })}</p>
                  <div className="table-actions">
                    <button type="button" className="icon-btn" onClick={() => openEdit(category)} title={t('common.edit')}><Edit3 size={15} /></button>
                    <button type="button" className="icon-btn danger" onClick={() => setDeleteTarget(category)} title={t('common.delete')}><Trash2 size={15} /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('admin.editCategory') : t('admin.addCategory')}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? t('common.saving') : t('admin.saveCategory')}</button>
          </>
        }
      >
        {formError && <div className="alert alert-error">{formError}</div>}
        <div className="form-grid two">
          <div className="field">
            <label>{t('admin.categoryName')}</label>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </div>
          <div className="field">
            <label>{t('admin.categoryNameHi')}</label>
            <input value={form.name_hi} onChange={(event) => setForm({ ...form, name_hi: event.target.value })} />
          </div>
        </div>
        <div className="field">
          <label>{t('admin.categoryDescription')}</label>
          <textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </div>
        <div className="form-grid two">
          <div className="field">
            <label>{t('admin.categoryIcon')}</label>
            <select value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })}>
              {ICON_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>{t('admin.categoryActive')}</label>
            <label className="checkbox"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /><span>{t('admin.categoryActive')}</span></label>
          </div>
        </div>
        <div className="field">
          <label>{t('admin.categoryImage')}</label>
          <ImageUpload value={form.image} onChange={(value) => setForm({ ...form, image: value })} />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        title={t('admin.deleteCategory')}
        message={deleteTarget ? `${pick(deleteTarget.name, deleteTarget.name_hi)}? ${t('admin.categoryInUse')}` : ''}
        loading={busy}
      />
    </div>
  )
}
