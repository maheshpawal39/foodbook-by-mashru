import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Filter, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import RecipeCard from '../components/RecipeCard'
import Pagination from '../components/Pagination'
import EmptyState from '../components/EmptyState'
import { RecipeGridSkeleton } from '../components/Loaders'
import { categoryService } from '../services/catalogService'
import { recipeService } from '../services/recipeService'
import { useLanguage } from '../context/LanguageContext'
import { useAsync, useDocumentTitle } from '../hooks/useUtils'
import { CUISINES, DIFFICULTIES, SORTS } from '../utils/format'
import { getErrorMessage } from '../utils/errors'

const EMPTY_FILTERS = {
  q: '',
  category: '',
  cuisine: '',
  food_type: '',
  max_time: '',
  difficulty: '',
  min_rating: '',
  ingredient: '',
  sort: 'newest',
  author_id: '',
}

export default function Explore() {
  const { t, pick } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryString = searchParams.toString()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [categories, setCategories] = useState([])
  const [filters, setFilters] = useState(() => {
    const initial = { ...EMPTY_FILTERS }
    searchParams.forEach((value, key) => {
      if (key in initial) initial[key] = value
    })
    return initial
  })

  const apiParams = useMemo(() => {
    const params = {}
    searchParams.forEach((value, key) => {
      if (value) params[key] = value
    })
    if (!params.per_page) params.per_page = 12
    return params
  }, [queryString])

  const { data, loading, error, refresh } = useAsync(
    () => recipeService.list(apiParams),
    [queryString],
  )
  useDocumentTitle(t('explore.title'))

  useEffect(() => {
    categoryService.list().then((res) => setCategories(res.items)).catch(() => {})
  }, [])

  useEffect(() => {
    const next = { ...EMPTY_FILTERS }
    searchParams.forEach((value, key) => {
      if (key in next) next[key] = value
    })
    setFilters(next)
  }, [queryString])

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))

  const applyFilters = (event) => {
    event?.preventDefault()
    const next = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value && !(key === 'sort' && value === 'newest')) next.set(key, value)
    })
    setSearchParams(next)
    setFiltersOpen(false)
  }

  const clearFilters = () => {
    setFilters({ ...EMPTY_FILTERS })
    setSearchParams(new URLSearchParams())
    setFiltersOpen(false)
  }

  const setPage = (page) => {
    const next = new URLSearchParams(searchParams)
    if (page <= 1) next.delete('page')
    else next.set('page', String(page))
    setSearchParams(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const removeFilter = (key) => {
    const next = new URLSearchParams(searchParams)
    next.delete(key)
    next.delete('page')
    if (key === 'q') setFilters((current) => ({ ...current, q: '' }))
    setSearchParams(next)
  }

  const activeChips = Array.from(searchParams.entries()).filter(
    ([key, value]) => value && !['page', 'per_page', 'sort'].includes(key),
  )

  const total = data?.pagination?.total ?? 0

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={t('nav.explore')}
        title={t('explore.title')}
        subtitle={t('explore.subtitle')}
        actions={
          <button type="button" className="btn btn-outline filter-toggle" onClick={() => setFiltersOpen((v) => !v)}>
            <SlidersHorizontal size={16} /> {t('common.filters')}
          </button>
        }
      />

      <div className="explore-search">
        <form onSubmit={applyFilters} className="search-hero">
          <Search size={19} />
          <input
            value={filters.q}
            onChange={(event) => updateFilter('q', event.target.value)}
            placeholder={t('explore.searchPlaceholder')}
            aria-label={t('explore.searchPlaceholder')}
          />
          {filters.q && (
            <button type="button" className="icon-btn" onClick={() => updateFilter('q', '')} aria-label={t('common.clear')}>
              <X size={16} />
            </button>
          )}
          <button type="submit" className="btn btn-primary">{t('common.search')}</button>
        </form>
      </div>

      <div className={`explore-layout ${filtersOpen ? 'filters-open' : ''}`}>
        <aside className="filter-panel">
          <div className="filter-head">
            <span><Filter size={16} /> {t('explore.filters')}</span>
            <button type="button" className="link-btn" onClick={clearFilters}>
              <RotateCcw size={14} /> {t('explore.clearFilters')}
            </button>
          </div>

          <form onSubmit={applyFilters} className="filter-form">
            <div className="field">
              <label>{t('explore.category')}</label>
              <select value={filters.category} onChange={(event) => updateFilter('category', event.target.value)}>
                <option value="">{t('explore.allCategories')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>{pick(category.name, category.name_hi)}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>{t('explore.cuisine')}</label>
              <select value={filters.cuisine} onChange={(event) => updateFilter('cuisine', event.target.value)}>
                <option value="">{t('explore.allCuisines')}</option>
                {CUISINES.map((cuisine) => <option key={cuisine} value={cuisine}>{cuisine}</option>)}
              </select>
            </div>

            <div className="field">
              <label>{t('explore.foodType')}</label>
              <div className="segmented">
                <button type="button" className={!filters.food_type ? 'active' : ''} onClick={() => updateFilter('food_type', '')}>{t('explore.any')}</button>
                <button type="button" className={filters.food_type === 'veg' ? 'active' : ''} onClick={() => updateFilter('food_type', 'veg')}>{t('foodType.veg')}</button>
                <button type="button" className={filters.food_type === 'non-veg' ? 'active' : ''} onClick={() => updateFilter('food_type', 'non-veg')}>{t('foodType.non-veg')}</button>
              </div>
            </div>

            <div className="field">
              <label>{t('explore.cookTime')}</label>
              <select value={filters.max_time} onChange={(event) => updateFilter('max_time', event.target.value)}>
                <option value="">{t('explore.anyTime')}</option>
                <option value="15">{t('explore.under15')}</option>
                <option value="30">{t('explore.under30')}</option>
                <option value="45">{t('explore.under45')}</option>
                <option value="60">{t('explore.under60')}</option>
              </select>
            </div>

            <div className="field">
              <label>{t('explore.difficulty')}</label>
              <select value={filters.difficulty} onChange={(event) => updateFilter('difficulty', event.target.value)}>
                <option value="">{t('explore.anyDifficulty')}</option>
                {DIFFICULTIES.map((level) => <option key={level} value={level}>{t(`difficulty.${level}`)}</option>)}
              </select>
            </div>

            <div className="field">
              <label>{t('explore.rating')}</label>
              <select value={filters.min_rating} onChange={(event) => updateFilter('min_rating', event.target.value)}>
                <option value="">{t('explore.anyRating')}</option>
                <option value="4">{t('explore.fourPlus')}</option>
                <option value="3">{t('explore.threePlus')}</option>
              </select>
            </div>

            <div className="field">
              <label>{t('explore.ingredient')}</label>
              <input
                value={filters.ingredient}
                onChange={(event) => updateFilter('ingredient', event.target.value)}
                placeholder={t('explore.ingredientPlaceholder')}
              />
            </div>

            <div className="field">
              <label>{t('explore.sort')}</label>
              <select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}>
                {SORTS.map((sort) => <option key={sort} value={sort}>{t(`sort.${sort}`)}</option>)}
              </select>
            </div>

            <button type="submit" className="btn btn-primary btn-block">{t('explore.applyFilters')}</button>
            <button type="button" className="btn btn-ghost btn-block" onClick={clearFilters}>{t('explore.clearFilters')}</button>
          </form>
        </aside>

        <section className="explore-results">
          <div className="results-bar">
            <div>
              <strong>{loading ? t('explore.searching') : total === 1 ? t('explore.resultOne') : t('explore.results', { count: total })}</strong>
              {searchParams.get('q') && <span> · {t('explore.searchFor', { query: searchParams.get('q') })}</span>}
            </div>
            {activeChips.length > 0 && (
              <div className="active-chips">
                {activeChips.map(([key, value]) => (
                  <button type="button" key={key} className="chip chip-removable" onClick={() => removeFilter(key)}>
                    {value} <X size={12} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {error ? (
            <div className="alert alert-error">
              {getErrorMessage(error, t)}
              <button type="button" className="btn btn-outline btn-sm" onClick={refresh}>{t('common.retry')}</button>
            </div>
          ) : loading ? (
            <RecipeGridSkeleton count={6} />
          ) : data?.items?.length ? (
            <>
              <div className="recipe-grid">
                {data.items.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}
              </div>
              <Pagination
                page={data.pagination.page}
                pages={data.pagination.pages}
                total={data.pagination.total}
                onChange={setPage}
              />
            </>
          ) : (
            <EmptyState
              icon={Search}
              title={t('explore.noResults')}
              message={t('explore.noResultsHint')}
              action={t('explore.clearFilters')}
              actionTo="/explore"
            />
          )}
        </section>
      </div>
    </div>
  )
}
