import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  Circle,
  Plus,
  RotateCcw,
  ShoppingBasket,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { PanelSkeleton } from '../components/Loaders'
import { shoppingService } from '../services/userService'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { useDocumentTitle } from '../hooks/useUtils'
import { getErrorMessage } from '../utils/errors'

export default function ShoppingList() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [list, setList] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ name: '', quantity: '', unit: '' })
  const [adding, setAdding] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [busy, setBusy] = useState(false)
  useDocumentTitle(t('shopping.title'))

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await shoppingService.get()
      setList(data.shopping_list)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const addItem = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) return
    setAdding(true)
    try {
      const data = await shoppingService.addItem({
        name: form.name.trim(),
        quantity: form.quantity.trim(),
        unit: form.unit.trim(),
      })
      setForm({ name: '', quantity: '', unit: '' })
      toast.success(t('shopping.added'))
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setAdding(false)
    }
  }

  const toggleItem = async (item) => {
    setBusyId(item.id)
    try {
      const data = await shoppingService.updateItem(item.id, { is_purchased: !item.is_purchased })
      setList((current) => ({
        ...current,
        items: current.items.map((row) => (row.id === item.id ? data.item : row)),
        purchased: current.purchased + (data.item.is_purchased ? 1 : -1),
      }))
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setBusyId(null)
    }
  }

  const deleteItem = async (item) => {
    setBusyId(item.id)
    try {
      await shoppingService.deleteItem(item.id)
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setBusyId(null)
    }
  }

  const clearPurchased = async () => {
    setBusy(true)
    try {
      await shoppingService.clearPurchased()
      toast.success(t('shopping.cleared'))
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setBusy(false)
    }
  }

  const clearAll = async () => {
    setBusy(true)
    try {
      await shoppingService.clearAll()
      setConfirmClear(false)
      toast.success(t('shopping.cleared'))
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setBusy(false)
    }
  }

  const items = list?.items || []
  const remaining = items.filter((item) => !item.is_purchased)
  const purchased = items.filter((item) => item.is_purchased)
  const progress = items.length ? Math.round((purchased.length / items.length) * 100) : 0

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={t('nav.shoppingList')}
        title={t('shopping.title')}
        subtitle={t('shopping.subtitle')}
        actions={
          <>
            <button type="button" className="btn btn-outline" onClick={clearPurchased} disabled={!purchased.length || busy}>
              <RotateCcw size={15} /> {t('shopping.clearPurchased')}
            </button>
            <button type="button" className="btn btn-ghost text-danger" onClick={() => setConfirmClear(true)} disabled={!items.length}>
              <Trash2 size={15} /> {t('shopping.clearAll')}
            </button>
          </>
        }
      />

      {error ? (
        <div className="alert alert-error">{getErrorMessage(error, t)}<button type="button" className="btn btn-outline btn-sm" onClick={load}>{t('common.retry')}</button></div>
      ) : loading ? (
        <PanelSkeleton rows={7} />
      ) : (
        <div className="shopping-layout">
          <div className="shopping-main">
            <section className="panel">
              <form className="shopping-add" onSubmit={addItem}>
                <div className="shopping-add-name">
                  <ShoppingBasket size={18} />
                  <input
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    placeholder={t('shopping.addPlaceholder')}
                    aria-label={t('shopping.addPlaceholder')}
                  />
                </div>
                <input className="small" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} placeholder={t('shopping.quantity')} aria-label={t('shopping.quantity')} />
                <input className="small" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder={t('shopping.unit')} aria-label={t('shopping.unit')} />
                <button type="submit" className="btn btn-primary" disabled={adding || !form.name.trim()}>
                  <Plus size={16} /> {t('shopping.add')}
                </button>
              </form>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>{remaining.length ? t('shopping.remaining', { count: remaining.length }) : t('shopping.allDone')}</h2>
                  <p>{t('shopping.progress', { done: purchased.length, total: items.length })}</p>
                </div>
                <span className="shopping-count">{t('shopping.totalItems', { count: items.length })}</span>
              </div>

              <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>

              {items.length === 0 ? (
                <EmptyState
                  icon={ShoppingBasket}
                  title={t('shopping.empty')}
                  message={t('shopping.emptyHint')}
                  action={t('favorites.browse')}
                  actionTo="/explore"
                  compact
                />
              ) : (
                <ul className="shopping-list">
                  {items.map((item) => (
                    <li key={item.id} className={item.is_purchased ? 'purchased' : ''}>
                      <button type="button" className="check-btn" onClick={() => toggleItem(item)} disabled={busyId === item.id} aria-label={t('shopping.markPurchased')}>
                        {item.is_purchased ? <Check size={15} /> : <Circle size={15} />}
                      </button>
                      <span className="shopping-name">{item.name}</span>
                      <span className="shopping-qty">{[item.quantity, item.unit].filter(Boolean).join(' ')}</span>
                      {item.recipe_id && (
                        <Link to={`/recipes/${item.recipe_id}`} className="chip chip-tiny"><UtensilsCrossed size={11} /> {t('shopping.fromRecipe')}</Link>
                      )}
                      <button type="button" className="icon-btn danger" onClick={() => deleteItem(item)} disabled={busyId === item.id} aria-label={t('shopping.delete')}>
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="shopping-side">
            <section className="panel shopping-summary">
              <h3>{t('shopping.listProgress')}</h3>
              <div className="progress-ring" style={{ '--progress': `${progress}%` }}>
                <div>
                  <strong>{progress}%</strong>
                  <span>{t('shopping.purchased')}</span>
                </div>
              </div>
              <ul>
                <li><span>{t('shopping.totalItems', { count: items.length })}</span><strong>{items.length}</strong></li>
                <li><span>{t('shopping.purchased')}</span><strong>{purchased.length}</strong></li>
                <li><span>{t('shopping.remaining', { count: remaining.length })}</span><strong>{remaining.length}</strong></li>
              </ul>
              <Link to="/explore" className="btn btn-outline btn-block"><UtensilsCrossed size={15} /> {t('favorites.browse')}</Link>
            </section>
            <section className="panel shopping-tip">
              <h3>{t('recipe.addToShoppingList')}</h3>
              <p>{t('shopping.emptyHint')}</p>
            </section>
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={clearAll}
        title={t('shopping.clearAll')}
        message={t('shopping.clearConfirm')}
        loading={busy}
      />
    </div>
  )
}
