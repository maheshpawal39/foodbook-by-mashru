import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChefHat, Plus, Search, ShoppingBasket, Sparkles, X } from 'lucide-react'
import { recipesApi, shoppingApi } from '../services'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { getErrorMessage } from '../utils/format'
import { useDocumentTitle } from '../hooks/useDebounce'
import PageHeader from '../components/PageHeader'
import ImageWithFallback from '../components/ImageWithFallback'
import RatingStars from '../components/RatingStars'
import EmptyState from '../components/EmptyState'
import { InlineLoader, SkeletonGrid } from '../components/Loader'

export default function KitchenFinder() {
  const { t } = useLanguage()
  const toast = useToast()
  const [suggestions, setSuggestions] = useState([])
  const [selected, setSelected] = useState([])
  const [input, setInput] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [addingId, setAddingId] = useState(null)
  const inputRef = useRef(null)
  useDocumentTitle(t('kitchen.title'))

  useEffect(() => {
    recipesApi.filters()
      .then((response) => {
        const ingredients = response.data?.data?.ingredients || []
        const seen = new Set()
        const unique = ingredients.filter((item) => {
          const key = item.name.toLowerCase()
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        setSuggestions(unique.slice(0, 24))
      })
      .catch(() => {})
  }, [])

  const addIngredient = (value) => {
    const name = value.trim().replace(/,$/, '')
    if (!name) return
    setSelected((current) => {
      if (current.some((item) => item.toLowerCase() === name.toLowerCase())) return current
      return [...current, name]
    })
    setInput('')
  }

  const removeIngredient = (name) => setSelected((current) => current.filter((item) => item !== name))

  const search = async () => {
    if (!selected.length) {
      toast.info(t('kitchen.emptySelection'))
      inputRef.current?.focus()
      return
    }
    setLoading(true)
    setResults(null)
    try {
      const response = await recipesApi.kitchen(selected.join(','))
      setResults(response.data?.data?.results || [])
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setLoading(false)
    }
  }

  const addMissing = async (result) => {
    setAddingId(result.recipe.id)
    try {
      for (const name of result.missing_ingredients) {
        await shoppingApi.add({ name, category: 'Other' })
      }
      toast.success(t('kitchen.missingAdded'))
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setAddingId(null)
    }
  }

  const selectedLower = useMemo(() => new Set(selected.map((item) => item.toLowerCase())), [selected])
  const filteredSuggestions = suggestions.filter((item) => !selectedLower.has(item.name.toLowerCase())).slice(0, 12)

  return (
    <div className="page kitchen-page">
      <PageHeader eyebrow={t('kitchen.subtitle')} title={t('kitchen.title')} actions={<ChefHat size={28} className="page-watermark" />} />

      <section className="kitchen-hero panel">
        <div className="kitchen-hero-copy">
          <span className="eyebrow gold"><Sparkles size={14} /> {t('kitchen.suggestions')}</span>
          <h2>{t('kitchen.selected')}</h2>
          <div className="kitchen-input">
            <Search size={18} />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ',') {
                  event.preventDefault()
                  addIngredient(input)
                }
                if (event.key === 'Backspace' && !input && selected.length) removeIngredient(selected[selected.length - 1])
              }}
              placeholder={t('kitchen.inputPlaceholder')}
            />
            <button type="button" className="btn btn-gold btn-sm" onClick={() => addIngredient(input)} disabled={!input.trim()}>
              <Plus size={15} /> {t('common.add')}
            </button>
          </div>

          {selected.length ? (
            <div className="selected-chips">
              {selected.map((name) => (
                <span className="selected-chip" key={name}>
                  {name}
                  <button type="button" onClick={() => removeIngredient(name)} aria-label={name}><X size={13} /></button>
                </span>
              ))}
            </div>
          ) : (
            <p className="kitchen-empty">{t('kitchen.emptySelection')}</p>
          )}

          <div className="kitchen-actions">
            <button type="button" className="btn btn-primary" onClick={search} disabled={loading}>
              {loading ? <InlineLoader /> : <><Search size={16} /> {t('kitchen.find')}</>}
            </button>
            {selected.length ? (
              <button type="button" className="text-btn" onClick={() => { setSelected([]); setResults(null); setInput('') }}>{t('kitchen.clear')}</button>
            ) : null}
          </div>
        </div>

        <div className="kitchen-suggestions">
          <span className="suggestion-label">{t('kitchen.suggestions')}</span>
          <div className="suggestion-chips">
            {filteredSuggestions.map((item) => (
              <button type="button" key={item.name} className="suggestion-chip" onClick={() => addIngredient(item.name)}>
                <Plus size={12} /> {item.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="kitchen-results">
        {loading ? (
          <SkeletonGrid count={6} />
        ) : results === null ? (
          <EmptyState icon={ChefHat} title={t('kitchen.pickHint')} message={t('kitchen.subtitle')} />
        ) : results.length === 0 ? (
          <EmptyState icon={ChefHat} title={t('kitchen.noMatches')} message={t('kitchen.noMatchesHint')} />
        ) : (
          <>
            <div className="section-header">
              <div>
                <span className="eyebrow">{t('kitchen.results')}</span>
                <h2>{t('kitchen.results')}</h2>
              </div>
              <span className="result-count">{results.length} {t('common.results')}</span>
            </div>
            <div className="kitchen-result-grid">
              {results.map((result) => (
                <article className="kitchen-card" key={result.recipe.id}>
                  <Link to={`/recipes/${result.recipe.id}`} className="kitchen-card-media">
                    <ImageWithFallback src={result.recipe.image} alt={result.recipe.title} />
                    <div className="match-badge">{t('kitchen.match', { percent: result.match_percentage })}</div>
                  </Link>
                  <div className="kitchen-card-body">
                    <Link to={`/recipes/${result.recipe.id}`}><h3>{result.recipe.title}</h3></Link>
                    <div className="kitchen-card-meta">
                      <RatingStars rating={result.recipe.average_rating} size={13} count={result.recipe.review_count} />
                      <span>{result.recipe.total_time} {t('common.min')}</span>
                    </div>
                    <div className="match-bar"><span style={{ width: `${result.match_percentage}%` }} /></div>
                    <div className="ingredient-groups">
                      <p><strong>{t('kitchen.matched')}</strong> {result.matched_ingredients.join(', ')}</p>
                      {result.missing_ingredients.length ? (
                        <p><strong>{t('kitchen.missing')}</strong> {result.missing_ingredients.slice(0, 6).join(', ')}{result.missing_ingredients.length > 6 ? '…' : ''}</p>
                      ) : null}
                    </div>
                    <div className="kitchen-card-actions">
                      <Link to={`/recipes/${result.recipe.id}`} className="btn btn-primary btn-sm">{t('common.viewRecipe')}</Link>
                      {result.missing_ingredients.length ? (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => addMissing(result)} disabled={addingId === result.recipe.id}>
                          {addingId === result.recipe.id ? <InlineLoader /> : <><ShoppingBasket size={15} /> {t('kitchen.addMissing')}</>}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
