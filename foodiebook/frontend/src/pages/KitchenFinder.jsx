import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChefHat,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { InlineLoader } from '../components/Loaders'
import { ingredientService } from '../services/catalogService'
import { recipeService } from '../services/recipeService'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { useDebouncedValue, useDocumentTitle } from '../hooks/useUtils'
import { mediaUrl } from '../utils/format'
import { getErrorMessage } from '../utils/errors'

export default function KitchenFinder() {
  const { t, pick } = useLanguage()
  const { toast } = useToast()
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [popular, setPopular] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selected, setSelected] = useState([])
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const wrapperRef = useRef(null)
  const debounced = useDebouncedValue(input, 250)
  useDocumentTitle(t('kitchen.title'))

  useEffect(() => {
    ingredientService.search('', 12).then((data) => setPopular(data.items)).catch(() => {})
  }, [])

  useEffect(() => {
    let active = true
    ingredientService.search(debounced, 12)
      .then((data) => { if (active) setSuggestions(data.items) })
      .catch(() => {})
    return () => { active = false }
  }, [debounced])

  useEffect(() => {
    const onClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const addIngredient = (ingredient) => {
    const name = (ingredient?.name || input).trim()
    if (!name) return
    const exists = selected.some((item) => item.name.toLowerCase() === name.toLowerCase())
    if (exists) {
      setInput('')
      return
    }
    setSelected((current) => [...current, { id: ingredient?.id, name, name_hi: ingredient?.name_hi }])
    setInput('')
    setShowSuggestions(false)
    setResults(null)
  }

  const removeIngredient = (name) => {
    setSelected((current) => current.filter((item) => item.name !== name))
    setResults(null)
  }

  const clearAll = () => {
    setSelected([])
    setResults(null)
    setInput('')
    setError('')
  }

  const findRecipes = async (event) => {
    event?.preventDefault()
    if (!selected.length) {
      setError(t('kitchen.addHint'))
      return
    }
    setSearching(true)
    setError('')
    try {
      const data = await recipeService.match(selected)
      setResults(data.items)
    } catch (err) {
      const message = getErrorMessage(err, t)
      setError(message)
      toast.error(message)
    } finally {
      setSearching(false)
    }
  }

  const suggestionsToShow = input ? suggestions : popular

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={t('nav.kitchen')}
        title={t('kitchen.title')}
        subtitle={t('kitchen.subtitle')}
        actions={
          selected.length > 0 && (
            <button type="button" className="btn btn-ghost" onClick={clearAll}>
              <Trash2 size={15} /> {t('kitchen.clearAll')}
            </button>
          )
        }
      />

      <section className="kitchen-hero">
        <div className="kitchen-hero-copy">
          <span className="eyebrow"><Sparkles size={13} /> {t('kitchen.pantryTitle')}</span>
          <h2>{t('kitchen.title')}</h2>
          <p>{t('kitchen.pantryHint')}</p>
          <form className="kitchen-search" onSubmit={findRecipes}>
            <div className="ingredient-input" ref={wrapperRef}>
              <Utensils size={18} />
              <input
                value={input}
                onChange={(event) => {
                  setInput(event.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    if (input.trim()) addIngredient()
                    else findRecipes()
                  }
                }}
                placeholder={t('kitchen.inputPlaceholder')}
                aria-label={t('kitchen.inputPlaceholder')}
              />
              <button type="button" className="icon-btn" onClick={() => addIngredient()} disabled={!input.trim()} aria-label={t('kitchen.addIngredient')}>
                <Plus size={18} />
              </button>
              {showSuggestions && suggestionsToShow.length > 0 && (
                <div className="suggestion-menu">
                  <span className="suggestion-label">{t('kitchen.suggestionTitle')}</span>
                  {suggestionsToShow.map((item) => (
                    <button type="button" key={item.id} onClick={() => addIngredient(item)}>
                      <span>{pick(item.name, item.name_hi)}</span>
                      <Plus size={14} />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" className="btn btn-gold btn-lg" disabled={searching || !selected.length}>
              <Search size={17} /> {searching ? t('kitchen.searching') : t('kitchen.find')}
            </button>
          </form>

          {selected.length > 0 && (
            <div className="selected-ingredients">
              <span>{t('kitchen.selected')}:</span>
              {selected.map((item) => (
                <button type="button" key={item.name} className="chip chip-removable" onClick={() => removeIngredient(item.name)}>
                  {pick(item.name, item.name_hi)} <X size={12} />
                </button>
              ))}
            </div>
          )}
          {error && <p className="field-error">{error}</p>}
        </div>
        <div className="kitchen-hero-art">
          <div className="pantry-illustration">
            <span>🍅</span><span>🧄</span><span>🌿</span>
            <span>🧀</span><span>🍋</span><span>🌶️</span>
          </div>
        </div>
      </section>

      <section className="kitchen-results">
        {searching ? (
          <div className="panel"><InlineLoader label={t('kitchen.searching')} /></div>
        ) : results === null ? (
          <EmptyState
            icon={ChefHat}
            title={t('kitchen.pantryHint')}
            message={t('kitchen.addHint')}
            compact
          />
        ) : results.length === 0 ? (
          <EmptyState
            icon={Search}
            title={t('kitchen.noResults')}
            message={t('kitchen.noResultsHint')}
          />
        ) : (
          <>
            <div className="results-bar">
              <strong>{results.length === 1 ? t('kitchen.resultOne') : t('kitchen.results', { count: results.length })}</strong>
              <span className="muted">{selected.map((item) => item.name).join(' · ')}</span>
            </div>
            <div className="match-grid">
              {results.map((recipe) => (
                <article className="match-card" key={recipe.id}>
                  <Link to={`/recipes/${recipe.id}`} className="match-image">
                    <img src={mediaUrl(recipe.image)} alt={pick(recipe.title, recipe.title_hi)} loading="lazy" />
                    <span className="match-percent">{t('kitchen.match', { percent: recipe.match_percentage })}</span>
                  </Link>
                  <div className="match-body">
                    <div className="match-top">
                      <span className="recipe-cuisine">{pick(recipe.cuisine, recipe.cuisine_hi)}</span>
                      <span className="chip chip-tiny">{recipe.category ? pick(recipe.category.name, recipe.category.name_hi) : ''}</span>
                    </div>
                    <h3><Link to={`/recipes/${recipe.id}`}>{pick(recipe.title, recipe.title_hi)}</Link></h3>
                    <div className="match-bar"><span style={{ width: `${recipe.match_percentage}%` }} /></div>
                    <div className="match-stats">
                      <span>{t('kitchen.matchedOf', { matched: recipe.matched_count, total: recipe.total_ingredients })}</span>
                      <strong>{recipe.match_percentage}%</strong>
                    </div>
                    {recipe.missing_ingredients?.length ? (
                      <div className="missing-list">
                        <span>{t('kitchen.missing')}:</span>
                        {recipe.missing_ingredients.slice(0, 4).map((name) => <span className="chip chip-missing" key={name}>{name}</span>)}
                        {recipe.missing_ingredients.length > 4 && <span className="chip chip-missing">+{recipe.missing_ingredients.length - 4}</span>}
                      </div>
                    ) : (
                      <div className="exact-match"><Sparkles size={14} /> {t('kitchen.exactMatch')}</div>
                    )}
                    <Link to={`/recipes/${recipe.id}`} className="btn btn-outline btn-sm btn-block">{t('common.viewRecipe')}</Link>
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
