import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Compass, Filter, Search, SlidersHorizontal, X } from 'lucide-react'
import { categoriesApi, recipesApi } from '../services'
import { useLanguage } from '../context/LanguageContext'
import { getErrorMessage } from '../utils/format'
import { useDebounce, useDocumentTitle } from '../hooks/useDebounce'
import PageHeader from '../components/PageHeader'
import RecipeGrid from '../components/RecipeGrid'
import Pagination from '../components/Pagination'
import EmptyState from '../components/EmptyState'
import { InlineLoader, SkeletonGrid } from '../components/Loader'

const TIME_OPTIONS = [
  { value: '', key: 'explore.anyTime' },
  { value: '15', key: 'explore.under15' },
  { value: '30', key: 'explore.under30' },
  { value: '60', key: 'explore.under60' },
  { value: '90', key: 'explore.under90' },
]

const RATING_OPTIONS = [
  { value: '', key: 'explore.anyRating' },
  { value: '3', key: 'explore.threePlus' },
  { value: '4', key: 'explore.fourPlus' },
]

const SORT_OPTIONS = [
  { value: 'newest', key: 'explore.sortNewest' },
  { value: 'oldest', key: 'explore.sortOldest' },
  { value: 'rating', key: 'explore.sortRating' },
  { value: 'popular', key: 'explore.sortPopular' },
  { value: 'time_asc', key: 'explore.sortTimeAsc' },
  { value: 'time_desc', key: 'explore.sortTimeDesc' },
  { value: 'title', key: 'explore.sortTitle' },
]

export default function Explore() {
  const { t } = useLanguage()
  const [params, setParams] = useSearchParams()
  const [categories, setCategories] = useState([])
  const [meta, setMeta] = useState({ cuisines: [], difficulties: [] })
  const [recipes, setRecipes] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchText, setSearchText] = useState(params.get('q') || '')
  const [ingredientText, setIngredientText] = useState(params.get('ingredient') || '')
  const [filtersOpen, setFiltersOpen] = useState(false)
  useDocumentTitle(t('explore.title'))

  const debouncedSearch = useDebounce(searchText, 450)
  const debouncedIngredient = useDebounce(ingredientText, 550)
  const queryString = params.toString()

  useEffect(() => {
    Promise.all([categoriesApi.list(), recipesApi.filters()])
      .then(([categoryResponse, metaResponse]) => {
        setCategories(categoryResponse.data?.data || [])
        setMeta(metaResponse.data?.data || { cuisines: [], difficulties: [] })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const next = new URLSearchParams(params)
    let changed = false
    if ((next.get('q') || '') !== debouncedSearch && (debouncedSearch || next.get('q'))) {
      if (debouncedSearch) next.set('q', debouncedSearch)
      else next.delete('q')
      changed = true
    }
    if ((next.get('ingredient') || '') !== debouncedIngredient && (debouncedIngredient || next.get('ingredient'))) {
      if (debouncedIngredient) next.set('ingredient', debouncedIngredient)
      else next.delete('ingredient')
      changed = true
    }
    if (changed) {
      next.delete('page')
      setParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, debouncedIngredient])

  useEffect(() => {
    const nextSearch = params.get('q') || ''
    const nextIngredient = params.get('ingredient') || ''
    setSearchText((current) => (current === nextSearch ? current : nextSearch))
    setIngredientText((current) => (current === nextIngredient ? current : nextIngredient))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('q'), params.get('ingredient')])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await recipesApi.list(Object.fromEntries(params))
      setRecipes(response.data?.data || [])
      setPagination(response.data?.pagination || null)
    } catch (err) {
      setError(getErrorMessage(err, t))
    } finally {
      setLoading(false)
    }
  }, [queryString, t])

  useEffect(() => {
    load()
  }, [load])

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  const clearFilters = () => {
    setSearchText('')
    setIngredientText('')
    setParams({})
  }

  const categoryName = (slug) => {
    const category = categories.find((item) => item.slug === slug)
    return category?.name || slug
  }

  const activeChips = useMemo(() => {
    const chips = []
    const add = (key, label) => chips.push({ key, label })
    if (params.get('q')) add('q', `“${params.get('q')}”`)
    if (params.get('category')) add('category', categoryName(params.get('category')))
    if (params.get('cuisine')) add('cuisine', params.get('cuisine'))
    if (params.get('diet')) add('diet', params.get('diet') === 'veg' ? t('common.veg') : t('common.nonVeg'))
    if (params.get('difficulty')) add('difficulty', t(`common.${params.get('difficulty')?.toLowerCase()}`))
    if (params.get('max_time')) add('max_time', `${params.get('max_time')} ${t('common.min')}`)
    if (params.get('min_rating')) add('min_rating', `${params.get('min_rating')}★+`)
    if (params.get('ingredient')) add('ingredient', params.get('ingredient'))
    if (params.get('author_id')) add('author_id', t('common.author'))
    return chips
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString, categories, t])

  const hasFilters = activeChips.length > 0

  return (
    <div className="page explore-page">
      <PageHeader
        eyebrow={t('explore.subtitle')}
        title={t('explore.title')}
        subtitle={t('brand.promise')}
        actions={
          <button type="button" className="btn btn-ghost mobile-filter-btn" onClick={() => setFiltersOpen((v) => !v)}>
            <SlidersHorizontal size={17} /> {t('explore.filtersButton')}
          </button>
        }
      />

      <div className="explore-toolbar">
        <div className="explore-search">
          <Search size={18} />
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={t('common.searchPlaceholder')}
            aria-label={t('common.search')}
          />
          {searchText ? (
            <button type="button" onClick={() => setSearchText('')} aria-label={t('common.reset')}><X size={16} /></button>
          ) : null}
        </div>
        <div className="sort-control">
          <label htmlFor="sort">{t('common.sortBy')}</label>
          <select id="sort" value={params.get('sort') || 'newest'} onChange={(event) => setFilter('sort', event.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>{t(option.key)}</option>
            ))}
          </select>
        </div>
      </div>

      {activeChips.length ? (
        <div className="active-filters">
          {activeChips.map((chip) => (
            <button key={chip.key} type="button" className="filter-chip" onClick={() => setFilter(chip.key, '')}>
              {chip.label} <X size={13} />
            </button>
          ))}
          <button type="button" className="text-btn" onClick={clearFilters}>{t('explore.clear')}</button>
        </div>
      ) : null}

      <div className={`explore-layout ${filtersOpen ? 'filters-open' : ''}`}>
        <div className="filters-overlay" onClick={() => setFiltersOpen(false)} aria-hidden="true" />
        <aside className={`filter-panel ${filtersOpen ? 'open' : ''}`}>
          <div className="filter-panel-head">
            <h3><Filter size={17} /> {t('explore.filters')}</h3>
            <button type="button" className="icon-btn filter-close" onClick={() => setFiltersOpen(false)} aria-label={t('common.close')}>
              <X size={18} />
            </button>
            {hasFilters ? <button type="button" className="text-btn" onClick={clearFilters}>{t('explore.clear')}</button> : null}
          </div>

          <div className="filter-group">
            <label htmlFor="filter-category">{t('explore.category')}</label>
            <select id="filter-category" value={params.get('category') || ''} onChange={(event) => setFilter('category', event.target.value)}>
              <option value="">{t('common.all')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>{category.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filter-cuisine">{t('explore.cuisine')}</label>
            <select id="filter-cuisine" value={params.get('cuisine') || ''} onChange={(event) => setFilter('cuisine', event.target.value)}>
              <option value="">{t('common.all')}</option>
              {meta.cuisines.map((cuisine) => (
                <option key={cuisine} value={cuisine}>{cuisine}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label">{t('explore.diet')}</span>
            <div className="segmented">
              {[
                { value: '', label: t('common.all') },
                { value: 'veg', label: t('common.veg') },
                { value: 'nonveg', label: t('common.nonVeg') },
              ].map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={(params.get('diet') || '') === option.value ? 'active' : ''}
                  onClick={() => setFilter('diet', option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label htmlFor="filter-time">{t('explore.cookTime')}</label>
            <select id="filter-time" value={params.get('max_time') || ''} onChange={(event) => setFilter('max_time', event.target.value)}>
              {TIME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{t(option.key)}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filter-difficulty">{t('explore.difficulty')}</label>
            <select id="filter-difficulty" value={params.get('difficulty') || ''} onChange={(event) => setFilter('difficulty', event.target.value)}>
              <option value="">{t('common.all')}</option>
              {(meta.difficulties?.length ? meta.difficulties : ['Easy', 'Medium', 'Hard']).map((difficulty) => (
                <option key={difficulty} value={difficulty}>{t(`common.${difficulty.toLowerCase()}`)}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filter-rating">{t('explore.minRating')}</label>
            <select id="filter-rating" value={params.get('min_rating') || ''} onChange={(event) => setFilter('min_rating', event.target.value)}>
              {RATING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{t(option.key)}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filter-ingredient">{t('explore.ingredient')}</label>
            <div className="filter-search">
              <Search size={15} />
              <input
                id="filter-ingredient"
                type="text"
                value={ingredientText}
                onChange={(event) => setIngredientText(event.target.value)}
                placeholder={t('explore.ingredientPlaceholder')}
              />
            </div>
          </div>

          <button type="button" className="btn btn-primary btn-block filter-apply" onClick={() => setFiltersOpen(false)}>
            {t('common.done')}
          </button>
        </aside>

        <section className="explore-results">
          <div className="results-head">
            <div>
              <h2>{params.get('q') ? t('explore.resultsFor', { query: params.get('q') }) : t('explore.title')}</h2>
              {pagination ? (
                <p>{t(pagination.total === 1 ? 'explore.recipeFound' : 'explore.recipesFound', { count: pagination.total })}</p>
              ) : null}
            </div>
            {loading ? <InlineLoader /> : null}
          </div>

          {error ? (
            <EmptyState
              icon={Compass}
              title={t('explore.loadError')}
              message={error}
              action={<button type="button" className="btn btn-primary" onClick={load}>{t('common.retry')}</button>}
            />
          ) : loading ? (
            <SkeletonGrid count={9} />
          ) : recipes.length ? (
            <>
              <RecipeGrid recipes={recipes} />
              <Pagination
                page={pagination?.page || 1}
                pages={pagination?.pages || 1}
                total={pagination?.total}
                onPage={(page) => setFilter('page', String(page))}
              />
            </>
          ) : (
            <EmptyState
              icon={Compass}
              title={t('explore.emptyTitle')}
              message={t('explore.emptyText')}
              action={<button type="button" className="btn btn-ghost" onClick={clearFilters}>{t('explore.clear')}</button>}
            />
          )}
        </section>
      </div>
    </div>
  )
}
