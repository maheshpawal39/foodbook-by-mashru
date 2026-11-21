import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ListChecks, Plus, ShoppingBasket, Trash2, X } from 'lucide-react'
import { shoppingApi } from '../services'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { getErrorMessage } from '../utils/format'
import { AISLES } from '../utils/constants'
import { useDocumentTitle } from '../hooks/useDebounce'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { InlineLoader, SkeletonRows } from '../components/Loader'

const FILTERS = [
  { value: 'all', key: 'shopping.all' },
  { value: 'pending', key: 'shopping.pending' },
  { value: 'purchased', key: 'shopping.purchased' },
]

export default function ShoppingList() {
  const { t } = useLanguage()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState({ name: '', quantity: '', unit: '', category: 'Produce' })
  const [adding, setAdding] = useState(false)
  const [clearing, setClearing] = useState(false)
  useDocumentTitle(t('shopping.title'))

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await shoppingApi.get()
      setData(response.data?.data || null)
    } catch (err) {
      setError(getErrorMessage(err, t))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const items = data?.items || []
  const filtered = useMemo(() => {
    if (filter === 'pending') return items.filter((item) => !item.is_purchased)
    if (filter === 'purchased') return items.filter((item) => item.is_purchased)
    return items
  }, [items, filter])

  const grouped = useMemo(() => {
    const map = new Map()
    filtered.forEach((item) => {
      const key = item.category || 'Other'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    })
    return Array.from(map.entries())
  }, [filtered])

  const progress = data?.total ? Math.round((data.purchased / data.total) * 100) : 0

  const addItem = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) return
    setAdding(true)
    try {
      const response = await shoppingApi.add({ ...form, name: form.name.trim() })
      setData(response.data?.data || data)
      setForm({ name: '', quantity: '', unit: '', category: form.category })
      toast.success(t('shopping.added'))
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setAdding(false)
    }
  }

  const toggleItem = async (item) => {
    try {
      const response = await shoppingApi.update(item.id, { is_purchased: !item.is_purchased })
      setData(response.data?.data || data)
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    }
  }

  const removeItem = async (item) => {
    try {
      const response = await shoppingApi.remove(item.id)
      setData(response.data?.data || data)
      toast.success(t('shopping.removed'))
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    }
  }

  const clearPurchased = async () => {
    setClearing(true)
    try {
      const response = await shoppingApi.clearPurchased()
      setData(response.data?.data || data)
      toast.success(t('shopping.cleared'))
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="page shopping-page">
      <PageHeader
        eyebrow={t('shopping.subtitle')}
        title={t('shopping.title')}
        actions={data?.purchased ? (
          <button type="button" className="btn btn-ghost" onClick={clearPurchased} disabled={clearing}>
            {clearing ? <InlineLoader /> : <><Trash2 size={16} /> {t('shopping.clearPurchased')}</>}
          </button>
        ) : <ShoppingBasket size={28} className="page-watermark" />}
      />

      {loading ? <SkeletonRows count={6} /> : error ? (
        <EmptyState icon={ShoppingBasket} title={t('shopping.loadError')} message={error} action={<button type="button" className="btn btn-primary" onClick={load}>{t('common.retry')}</button>} />
      ) : (
        <div className="shopping-layout">
          <div className="shopping-main">
            <div className="shopping-summary panel">
              <div>
                <span className="eyebrow">{t('shopping.title')}</span>
                <strong>{t('shopping.progress', { done: data?.purchased || 0, total: data?.total || 0 })}</strong>
              </div>
              <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
            </div>

            <div className="tabs tabs-compact">
              {FILTERS.map((tab) => (
                <button key={tab.value} type="button" className={filter === tab.value ? 'active' : ''} onClick={() => setFilter(tab.value)}>
                  {t(tab.key)}
                  {tab.value === 'pending' ? <span className="tab-count">{items.filter((i) => !i.is_purchased).length}</span> : null}
                </button>
              ))}
            </div>

            {items.length === 0 ? (
              <EmptyState icon={ShoppingBasket} title={t('shopping.empty')} message={t('shopping.emptyHint')} />
            ) : filtered.length === 0 ? (
              <EmptyState icon={ListChecks} title={t('common.noResults')} />
            ) : (
              <div className="shopping-groups">
                {grouped.map(([category, categoryItems]) => (
                  <section className="shopping-group panel" key={category}>
                    <h3>{t(`shopping.sections.${category}`) || category}<span>{categoryItems.length}</span></h3>
                    <ul>
                      {categoryItems.map((item) => (
                        <li key={item.id} className={item.is_purchased ? 'purchased' : ''}>
                          <button type="button" className="shop-check" onClick={() => toggleItem(item)} aria-label={item.name} aria-pressed={item.is_purchased}>
                            {item.is_purchased ? <Check size={14} /> : null}
                          </button>
                          <span className="shop-name">{item.name}</span>
                          <span className="shop-qty">{[item.quantity, item.unit].filter(Boolean).join(' ')}</span>
                          <button type="button" className="icon-btn danger" onClick={() => removeItem(item)} aria-label={t('shopping.delete')}>
                            <X size={15} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}

            <p className="shopping-hint">
              <ListChecks size={15} /> {t('shopping.emptyHint')}
              <Link to="/explore">{t('favorites.explore')} →</Link>
            </p>
          </div>

          <aside className="shopping-aside">
            <form className="panel add-item-card" onSubmit={addItem}>
              <h3><Plus size={18} /> {t('shopping.addItem')}</h3>
              <div className="field">
                <label htmlFor="item-name">{t('shopping.itemName')}</label>
                <input id="item-name" type="text" value={form.name} onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} placeholder={t('shopping.itemPlaceholder')} />
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="item-qty">{t('shopping.qty')}</label>
                  <input id="item-qty" type="text" value={form.quantity} onChange={(event) => setForm((c) => ({ ...c, quantity: event.target.value }))} placeholder="2" />
                </div>
                <div className="field">
                  <label htmlFor="item-unit">{t('form.unit')}</label>
                  <input id="item-unit" type="text" value={form.unit} onChange={(event) => setForm((c) => ({ ...c, unit: event.target.value }))} placeholder="g" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="item-category">{t('shopping.category')}</label>
                <select id="item-category" value={form.category} onChange={(event) => setForm((c) => ({ ...c, category: event.target.value }))}>
                  {AISLES.map((aisle) => <option key={aisle} value={aisle}>{t(`shopping.sections.${aisle}`)}</option>)}
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={adding || !form.name.trim()}>
                {adding ? <InlineLoader /> : <><Plus size={16} /> {t('shopping.add')}</>}
              </button>
            </form>

            <div className="panel shopping-tip-card">
              <h3><ListChecks size={18} /> {t('common.addToShopping')}</h3>
              <p>{t('detail.addedToList')}</p>
              <Link to="/explore" className="text-link">{t('favorites.explore')} →</Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
