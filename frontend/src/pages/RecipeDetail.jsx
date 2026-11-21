import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Check, ChefHat, Clock, Download, Flame, Globe2, Heart, ListChecks, Minus, Pencil, Play,
  Printer, Share2, ShoppingBasket, Star, Timer, Trash2, TriangleAlert, UsersRound, Utensils,
} from 'lucide-react'
import { favoritesApi, recipesApi, reviewsApi, shoppingApi } from '../services'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { formatDate, getErrorMessage } from '../utils/format'
import { REPORT_REASONS } from '../utils/constants'
import { useDocumentTitle } from '../hooks/useDebounce'
import ImageWithFallback from '../components/ImageWithFallback'
import RatingStars, { RatingInput } from '../components/RatingStars'
import FavoriteButton from '../components/FavoriteButton'
import RecipeGrid from '../components/RecipeGrid'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'
import Field from '../components/Field'
import { FullPageLoader, InlineLoader } from '../components/Loader'

function youtubeEmbed(url) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtu.be')) return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v') || parsed.pathname.split('/').pop()
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    return null
  } catch {
    return null
  }
}

export default function RecipeDetail() {
  const { id } = useParams()
  const { t, language } = useLanguage()
  const { isAuthenticated, user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [recipe, setRecipe] = useState(null)
  const [similar, setSimilar] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checked, setChecked] = useState({})
  const [addingList, setAddingList] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [editingReview, setEditingReview] = useState(false)
  const [reviewBusy, setReviewBusy] = useState(false)
  const [deleteReviewTarget, setDeleteReviewTarget] = useState(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportForm, setReportForm] = useState({ reason: REPORT_REASONS[0], details: '' })
  const [reportBusy, setReportBusy] = useState(false)
  useDocumentTitle(recipe?.title || t('detail.reviewsTitle'))

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [response, similarResponse] = await Promise.all([
        recipesApi.get(id),
        recipesApi.similar(id).catch(() => null),
      ])
      const data = response.data?.data
      setRecipe(data)
      setSimilar(similarResponse?.data?.data || [])
      if (data?.user_review) {
        setReviewForm({ rating: data.user_review.rating, comment: data.user_review.comment || '' })
      }
    } catch (err) {
      setError(getErrorMessage(err, t))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => {
    load()
    setChecked({})
    setEditingReview(false)
  }, [load])

  const toggleIngredient = (ingredientId) => {
    setChecked((current) => ({ ...current, [ingredientId]: !current[ingredientId] }))
  }

  const addIngredients = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } })
      return
    }
    setAddingList(true)
    try {
      const response = await shoppingApi.fromRecipe(recipe.id)
      toast.success(t('detail.addedToList'))
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setAddingList(false)
    }
  }

  const share = async () => {
    const shareData = {
      title: recipe.title,
      text: recipe.short_description,
      url: window.location.href,
    }
    try {
      if (navigator.share) await navigator.share(shareData)
      else {
        await navigator.clipboard.writeText(window.location.href)
        toast.success(t('detail.shareCopied'))
      }
    } catch (err) {
      if (err?.name !== 'AbortError') toast.error(t('errors.generic'))
    }
  }

  const submitReview = async (event) => {
    event.preventDefault()
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } })
      return
    }
    if (!reviewForm.comment.trim()) {
      toast.error(t('errors.required'))
      return
    }
    setReviewBusy(true)
    try {
      if (recipe.user_review) {
        await reviewsApi.update(recipe.user_review.id, reviewForm)
        toast.success(t('detail.reviewUpdated'))
      } else {
        await reviewsApi.create(recipe.id, reviewForm)
        toast.success(t('detail.reviewPosted'))
      }
      setEditingReview(false)
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setReviewBusy(false)
    }
  }

  const deleteReview = async () => {
    if (!deleteReviewTarget) return
    try {
      await reviewsApi.remove(deleteReviewTarget.id)
      toast.success(t('detail.reviewDeleted'))
      setDeleteReviewTarget(null)
      setEditingReview(false)
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    }
  }

  const submitReport = async (event) => {
    event.preventDefault()
    setReportBusy(true)
    try {
      await reviewsApi.report({ recipe_id: recipe.id, ...reportForm })
      toast.success(t('detail.reportSubmitted'))
      setReportOpen(false)
      setReportForm({ reason: REPORT_REASONS[0], details: '' })
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setReportBusy(false)
    }
  }

  const distribution = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    ;(recipe?.reviews || []).forEach((review) => {
      counts[review.rating] = (counts[review.rating] || 0) + 1
    })
    return counts
  }, [recipe?.reviews])

  if (loading) return <FullPageLoader label={t('common.loading')} />

  if (error || !recipe) {
    return (
      <div className="page">
        <EmptyState
          icon={Utensils}
          title={t('errors.recipeNotFound')}
          message={error}
          action={<Link to="/explore" className="btn btn-primary">{t('explore.title')}</Link>}
        />
      </div>
    )
  }

  const categoryName = language === 'hi' && recipe.category?.name_hi ? recipe.category.name_hi : recipe.category?.name
  const embed = youtubeEmbed(recipe.video_url)
  const nutritionLabels = {
    protein: t('form.protein'), carbs: t('form.carbs'), fat: t('form.fat'), fiber: t('form.fiber'),
    sugar: t('form.sugar'), sodium: t('form.sodium'), calories: t('detail.calories'),
  }

  return (
    <div className="page detail-page">
      <Link to="/explore" className="back-link"><ArrowLeft size={16} /> {t('explore.title')}</Link>

      <section className="detail-hero">
        <div className="detail-hero-media">
          <ImageWithFallback src={recipe.image} alt={recipe.title} />
          <div className="detail-hero-shade" />
          <div className="detail-hero-badges">
            <span className={`diet-pill ${recipe.diet === 'veg' ? 'is-veg' : 'is-nonveg'}`}>
              <span className="diet-dot" /> {recipe.diet === 'veg' ? t('common.veg') : t('common.nonVeg')}
            </span>
            {recipe.is_featured ? <span className="featured-pill"><Flame size={12} /> {t('common.featured')}</span> : null}
            {categoryName ? <span className="category-pill">{categoryName}</span> : null}
          </div>
        </div>

        <div className="detail-hero-copy">
          <span className="eyebrow">{recipe.cuisine} · {recipe.difficulty === 'Easy' ? t('common.easy') : recipe.difficulty === 'Hard' ? t('common.hard') : t('common.medium')}</span>
          <h1>{recipe.title}</h1>
          <p className="detail-short">{recipe.short_description}</p>

          <div className="detail-author">
            <span className="author-avatar">{recipe.author?.name?.slice(0, 1).toUpperCase()}</span>
            <div>
              <span>{t('common.author')}</span>
              <strong>{recipe.author?.name}</strong>
            </div>
            <span className="detail-date">{formatDate(recipe.created_at, language)}</span>
          </div>

          <div className="detail-rating-line">
            <RatingStars rating={recipe.average_rating} size={17} showValue />
            <span>{t('detail.basedOn', { count: recipe.review_count })}</span>
            <span className="dot-sep" />
            <span>{recipe.view_count} views</span>
          </div>

          <div className="detail-meta-grid">
            <div><Clock size={18} /><span>{t('detail.prep')}</span><strong>{recipe.prep_time} {t('common.min')}</strong></div>
            <div><Flame size={18} /><span>{t('detail.cook')}</span><strong>{recipe.cook_time} {t('common.min')}</strong></div>
            <div><Timer size={18} /><span>{t('detail.total')}</span><strong>{recipe.total_time} {t('common.min')}</strong></div>
            <div><UsersRound size={18} /><span>{t('detail.serves')}</span><strong>{recipe.servings}</strong></div>
            <div><Utensils size={18} /><span>{t('detail.calories')}</span><strong>{recipe.calories || '—'} {recipe.calories ? t('common.kcal') : ''}</strong></div>
          </div>

          <div className="detail-actions">
            <FavoriteButton recipe={recipe} showLabel />
            <button type="button" className="btn btn-ghost" onClick={share}><Share2 size={16} /> {t('common.share')}</button>
            <button type="button" className="btn btn-ghost" onClick={() => window.print()}><Printer size={16} /> {t('common.print')}</button>
            <a className="btn btn-ghost" href={recipesApi.pdfUrl(recipe.id)} target="_blank" rel="noreferrer">
              <Download size={16} /> {t('common.downloadPdf')}
            </a>
            <Link className="btn btn-gold" to={`/timer?minutes=${recipe.total_time || 30}&title=${encodeURIComponent(recipe.title)}`}>
              <Timer size={16} /> {t('common.startTimer')}
            </Link>
            {recipe.can_edit ? (
              <Link className="btn btn-ghost" to={`/recipes/${recipe.id}/edit`}><Pencil size={16} /> {t('common.edit')}</Link>
            ) : null}
          </div>
        </div>
      </section>

      <div className="detail-layout">
        <div className="detail-main">
          {recipe.description ? (
            <section className="panel">
              <h2>{t('detail.about')}</h2>
              <p className="prose">{recipe.description}</p>
            </section>
          ) : null}

          <section className="panel" id="ingredients">
            <div className="panel-head">
              <h2><ShoppingBasket size={20} /> {t('detail.ingredients')}</h2>
              <button type="button" className="text-btn" onClick={addIngredients} disabled={addingList}>
                {addingList ? <InlineLoader /> : <><ListChecks size={16} /> {t('common.addToShopping')}</>}
              </button>
            </div>
            <ul className="ingredient-list">
              {recipe.ingredients.map((ingredient) => (
                <li key={ingredient.id} className={checked[ingredient.id] ? 'checked' : ''}>
                  <label>
                    <input type="checkbox" checked={Boolean(checked[ingredient.id])} onChange={() => toggleIngredient(ingredient.id)} />
                    <span className="ingredient-check">{checked[ingredient.id] ? <Check size={13} /> : null}</span>
                    <span className="ingredient-name">
                      {language === 'hi' && ingredient.name_hi ? ingredient.name_hi : ingredient.name}
                      {ingredient.notes ? <small>{ingredient.notes}</small> : null}
                    </span>
                    <span className="ingredient-amount">
                      {[ingredient.quantity, ingredient.unit].filter(Boolean).join(' ')}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <Link to="/shopping-list" className="text-link">{t('detail.viewShopping')} →</Link>
          </section>

          <section className="panel" id="instructions">
            <h2><ChefHat size={20} /> {t('detail.instructions')}</h2>
            <ol className="step-list">
              {recipe.steps.map((step) => (
                <li key={step.id}>
                  <span className="step-number">{step.step_number}</span>
                  <div className="step-body">
                    <p>{step.instruction}</p>
                    {step.timer_seconds ? (
                      <Link
                        className="step-timer"
                        to={`/timer?seconds=${step.timer_seconds}&title=${encodeURIComponent(recipe.title)}`}
                      >
                        <Timer size={14} /> {t('detail.stepTimer')} · {Math.round(step.timer_seconds / 60)} {t('common.min')}
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {recipe.tips ? (
            <section className="panel tips-panel">
              <h2><SparkleIcon /> {t('detail.tips')}</h2>
              <p className="prose">{recipe.tips}</p>
            </section>
          ) : null}

          {embed ? (
            <section className="panel">
              <h2><Play size={20} /> {t('detail.video')}</h2>
              <div className="video-embed">
                <iframe src={embed} title={recipe.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
            </section>
          ) : null}

          <section className="panel" id="reviews">
            <div className="review-summary">
              <div className="review-score">
                <strong>{recipe.average_rating ? recipe.average_rating.toFixed(1) : '—'}</strong>
                <RatingStars rating={recipe.average_rating} size={18} />
                <span>{t('detail.basedOn', { count: recipe.review_count })}</span>
              </div>
              <div className="review-bars">
                {[5, 4, 3, 2, 1].map((star) => {
                  const total = recipe.review_count || 1
                  const percent = Math.round(((distribution[star] || 0) / total) * 100)
                  return (
                    <div key={star} className="review-bar-row">
                      <span>{star} <Star size={12} fill="currentColor" /></span>
                      <div className="review-bar"><span style={{ width: `${percent}%` }} /></div>
                      <span>{distribution[star] || 0}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="review-compose">
              {!isAuthenticated ? (
                <div className="review-login-prompt">
                  <p>{t('detail.loginToReview')}</p>
                  <Link to="/login" className="btn btn-primary btn-sm">{t('auth.signIn')}</Link>
                </div>
              ) : recipe.user_review && !editingReview ? (
                <div className="your-review">
                  <div className="your-review-head">
                    <strong>{t('detail.yourReview')}</strong>
                    <div className="your-review-actions">
                      <button type="button" className="text-btn" onClick={() => setEditingReview(true)}><Pencil size={14} /> {t('common.edit')}</button>
                      <button type="button" className="text-btn danger" onClick={() => setDeleteReviewTarget(recipe.user_review)}><Trash2 size={14} /> {t('common.delete')}</button>
                    </div>
                  </div>
                  <RatingStars rating={recipe.user_review.rating} size={16} />
                  <p>{recipe.user_review.comment}</p>
                </div>
              ) : (
                <form className="review-form" onSubmit={submitReview}>
                  <h3>{recipe.user_review ? t('detail.editReview') : t('detail.writeReview')}</h3>
                  <div className="review-form-rating">
                    <span>{t('detail.yourRating')}</span>
                    <RatingInput value={reviewForm.rating} onChange={(rating) => setReviewForm((current) => ({ ...current, rating }))} />
                  </div>
                  <textarea
                    rows={4}
                    value={reviewForm.comment}
                    onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))}
                    placeholder={t('detail.reviewPlaceholder')}
                    maxLength={2000}
                  />
                  <div className="review-form-actions">
                    {editingReview ? (
                      <button type="button" className="btn btn-ghost" onClick={() => setEditingReview(false)}>{t('common.cancel')}</button>
                    ) : null}
                    <button type="submit" className="btn btn-primary" disabled={reviewBusy}>
                      {reviewBusy ? <InlineLoader /> : recipe.user_review ? t('detail.updateReview') : t('detail.submitReview')}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="reviews-list">
              {recipe.reviews.length === 0 ? (
                <EmptyState icon={Star} title={t('detail.noReviews')} />
              ) : (
                recipe.reviews.map((review) => (
                  <article className="review-item" key={review.id}>
                    <span className="review-avatar">{review.user?.name?.slice(0, 1).toUpperCase()}</span>
                    <div className="review-item-body">
                      <div className="review-item-head">
                        <div>
                          <strong>{review.user?.name}</strong>
                          <span>{formatDate(review.created_at, language)}</span>
                        </div>
                        <RatingStars rating={review.rating} size={14} />
                      </div>
                      <p>{review.comment}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          {recipe.nutrition && Object.keys(recipe.nutrition).length ? (
            <section className="panel">
              <h2>{t('detail.nutrition')}</h2>
              <p className="panel-note">{t('detail.nutritionNote')}</p>
              <div className="nutrition-grid">
                {Object.entries(recipe.nutrition).map(([key, value]) => (
                  <div key={key} className="nutrition-item">
                    <span>{nutritionLabels[key] || key}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="detail-aside">
          <div className="panel aside-card">
            <h3>{t('detail.ingredients')}</h3>
            <p>{recipe.ingredients.length} · {recipe.servings} {t('common.servings')}</p>
            <button type="button" className="btn btn-ghost btn-block" onClick={addIngredients} disabled={addingList}>
              <ListChecks size={16} /> {t('common.addToShopping')}
            </button>
            <Link to="/timer" className="btn btn-ghost btn-block"><Timer size={16} /> {t('common.startTimer')}</Link>
          </div>
          <div className="panel aside-card">
            <h3><Globe2 size={17} /> {recipe.cuisine}</h3>
            <div className="aside-facts">
              <div><span>{t('explore.difficulty')}</span><strong>{recipe.difficulty}</strong></div>
              <div><span>{t('explore.diet')}</span><strong>{recipe.diet === 'veg' ? t('common.veg') : t('common.nonVeg')}</strong></div>
              <div><span>{t('detail.total')}</span><strong>{recipe.total_time} {t('common.min')}</strong></div>
              <div><span>{t('common.reviews')}</span><strong>{recipe.review_count}</strong></div>
            </div>
          </div>
          <button type="button" className="text-btn danger report-link" onClick={() => {
            if (!isAuthenticated) navigate('/login', { state: { from: location } })
            else setReportOpen(true)
          }}>
            <TriangleAlert size={15} /> {t('common.report')}
          </button>
        </aside>
      </div>

      {similar.length ? (
        <section>
          <div className="section-header">
            <div><span className="eyebrow">{t('detail.similar')}</span><h2>{t('detail.similar')}</h2></div>
          </div>
          <RecipeGrid recipes={similar} />
        </section>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteReviewTarget)}
        onClose={() => setDeleteReviewTarget(null)}
        onConfirm={deleteReview}
        title={t('detail.deleteReview')}
        message={t('common.confirmDeleteText')}
      />

      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title={t('detail.reportTitle')}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setReportOpen(false)}>{t('common.cancel')}</button>
            <button type="submit" form="report-form" className="btn btn-danger" disabled={reportBusy}>
              {reportBusy ? <InlineLoader /> : t('common.report')}
            </button>
          </>
        }
      >
        <form id="report-form" onSubmit={submitReport}>
          <Field label={t('detail.reportReason')} htmlFor="report-reason">
            <select id="report-reason" value={reportForm.reason} onChange={(event) => setReportForm((c) => ({ ...c, reason: event.target.value }))}>
              {REPORT_REASONS.map((reason) => <option key={reason}>{reason}</option>)}
            </select>
          </Field>
          <Field label={t('detail.reportDetails')} htmlFor="report-details">
            <textarea id="report-details" rows={4} value={reportForm.details} onChange={(event) => setReportForm((c) => ({ ...c, details: event.target.value }))} />
          </Field>
        </form>
      </Modal>
    </div>
  )
}

function SparkleIcon() {
  return <Star size={20} />
}
