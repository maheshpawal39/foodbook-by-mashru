import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  ChefHat,
  Clock,
  Download,
  Flag,
  Flame,
  Heart,
  Minus,
  PlayCircle,
  Plus,
  Printer,
  Share2,
  ShoppingBasket,
  Sparkles,
  Star,
  Timer,
  Trash2,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import StarRating from '../components/StarRating'
import Avatar from '../components/Avatar'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { InlineLoader, PanelSkeleton } from '../components/Loaders'
import { recipeService } from '../services/recipeService'
import { shoppingService } from '../services/userService'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { useAsync, useDocumentTitle } from '../hooks/useUtils'
import { formatDate, formatMinutes, mediaUrl } from '../utils/format'
import { getErrorMessage } from '../utils/errors'

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t, pick, language } = useLanguage()
  const { toast } = useToast()
  const { data, loading, error, refresh, setData } = useAsync(() => recipeService.get(id), [id])
  const recipe = data?.recipe

  const [favorited, setFavorited] = useState(false)
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [servings, setServings] = useState(2)
  const [reviews, setReviews] = useState({ items: [], pagination: null, rating_avg: 0, rating_count: 0 })
  const [reviewPage, setReviewPage] = useState(1)
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [deleteReviewTarget, setDeleteReviewTarget] = useState(null)
  const [reportTarget, setReportTarget] = useState(null)
  const [reportReason, setReportReason] = useState('')
  const [reportBusy, setReportBusy] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  useDocumentTitle(recipe ? pick(recipe.title, recipe.title_hi) : t('recipe.notFound'))

  useEffect(() => {
    if (!recipe) return
    setFavorited(Boolean(recipe.is_favorited))
    setFavoriteCount(recipe.favorite_count || 0)
    setServings(recipe.servings || 2)
    if (recipe.user_review) {
      setRating(recipe.user_review.rating)
      setComment(recipe.user_review.comment || '')
    } else {
      setRating(0)
      setComment('')
    }
  }, [recipe])

  const loadReviews = async (page = 1) => {
    setReviewsLoading(true)
    try {
      const result = await recipeService.reviews(id, { page, per_page: 8 })
      setReviews(result)
      setReviewPage(page)
    } catch (err) {
      /* keep previous */
    } finally {
      setReviewsLoading(false)
    }
  }

  useEffect(() => {
    loadReviews(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const factor = recipe ? servings / Math.max(1, recipe.servings) : 1

  const scaledIngredients = useMemo(() => {
    if (!recipe) return []
    return recipe.ingredients.map((item) => {
      const numeric = Number.parseFloat(item.quantity)
      if (!Number.isFinite(numeric)) return item
      const value = Math.round(numeric * factor * 100) / 100
      return { ...item, quantity: String(value) }
    })
  }, [recipe, factor])

  const toggleFavorite = async () => {
    if (!recipe) return
    setActionBusy(true)
    try {
      const result = await recipeService.toggleFavorite(recipe.id)
      setFavorited(result.is_favorited)
      setFavoriteCount(result.favorite_count)
      setData((current) => current ? { recipe: { ...current.recipe, is_favorited: result.is_favorited, favorite_count: result.favorite_count } } : current)
      toast.success(result.is_favorited ? t('recipe.favoriteAdded') : t('recipe.favoriteRemoved'))
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setActionBusy(false)
    }
  }

  const shareRecipe = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: pick(recipe.title, recipe.title_hi), text: recipe.short_description, url })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success(t('recipe.linkCopied'))
      }
    } catch (err) {
      /* user cancelled share */
    }
  }

  const downloadPdf = async () => {
    setActionBusy(true)
    try {
      const blob = await recipeService.downloadPdf(recipe.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `FoodieBook-${pick(recipe.title, recipe.title_hi)}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(t('recipe.pdfError'))
    } finally {
      setActionBusy(false)
    }
  }

  const addToShopping = async () => {
    setActionBusy(true)
    try {
      const result = await shoppingService.fromRecipe(recipe.id)
      toast.success(t('recipe.ingredientsAdded', { count: result.added }))
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setActionBusy(false)
    }
  }

  const startTimer = () => {
    navigate(`/timer?minutes=${recipe.cook_time || recipe.total_time || 10}`)
  }

  const submitReview = async (event) => {
    event.preventDefault()
    setReviewError('')
    if (rating < 1) {
      setReviewError(t('validation.reviewRating'))
      return
    }
    setReviewBusy(true)
    try {
      if (recipe.user_review) {
        await recipeService.updateReview(recipe.user_review.id, { rating, comment })
        toast.success(t('recipe.reviewUpdated'))
      } else {
        await recipeService.createReview(recipe.id, { rating, comment })
        toast.success(t('recipe.reviewThanks'))
      }
      await Promise.all([refresh(), loadReviews(1)])
    } catch (err) {
      setReviewError(getErrorMessage(err, t))
    } finally {
      setReviewBusy(false)
    }
  }

  const deleteReview = async () => {
    if (!deleteReviewTarget) return
    setReviewBusy(true)
    try {
      await recipeService.deleteReview(deleteReviewTarget)
      toast.success(t('recipe.reviewDeleted'))
      setDeleteReviewTarget(null)
      setRating(0)
      setComment('')
      await Promise.all([refresh(), loadReviews(1)])
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setReviewBusy(false)
    }
  }

  const submitReport = async (event) => {
    event.preventDefault()
    if (reportReason.trim().length < 5) return
    setReportBusy(true)
    try {
      await recipeService.report({
        target_type: reportTarget.type,
        target_id: reportTarget.id,
        reason: reportReason.trim(),
      })
      toast.success(t('recipe.reportSubmitted'))
      setReportTarget(null)
      setReportReason('')
    } catch (err) {
      toast.error(getErrorMessage(err, t))
    } finally {
      setReportBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="page-stack">
        <div className="skeleton skeleton-hero" />
        <div className="detail-skeleton">
          <PanelSkeleton rows={5} />
          <PanelSkeleton rows={6} />
        </div>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title={t('recipe.notFound')}
        message={t('recipe.notFoundHint')}
        action={t('recipe.backToExplore')}
        actionTo="/explore"
      />
    )
  }

  const canEdit = user && (user.id === recipe.author?.id || user.role === 'admin')
  const isOwn = user?.id === recipe.author?.id

  return (
    <div className="page-stack recipe-detail-page">
      <div className="detail-back">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> {t('common.back')}
        </button>
      </div>

      {recipe.status === 'draft' && <div className="alert alert-warning">{t('recipe.draftNotice')}</div>}

      <section className="detail-hero">
        <img src={mediaUrl(recipe.image)} alt={pick(recipe.title, recipe.title_hi)} className="detail-hero-image" />
        <div className="detail-hero-overlay" />
        <div className="detail-hero-content">
          <div className="detail-badges">
            <span className="badge badge-gold">{recipe.category ? pick(recipe.category.name, recipe.category.name_hi) : t('common.category')}</span>
            <span className={`badge badge-food ${recipe.food_type}`}><span className="food-dot" />{t(`foodType.${recipe.food_type}`)}</span>
            <span className="badge badge-glass"><Star size={12} fill="currentColor" /> {Number(recipe.rating_avg).toFixed(1)} ({recipe.rating_count})</span>
            {recipe.is_featured && <span className="badge badge-gold">{t('common.featured')}</span>}
          </div>
          <h1>{pick(recipe.title, recipe.title_hi)}</h1>
          <p>{pick(recipe.short_description, recipe.short_description_hi)}</p>
          <div className="detail-author-row">
            <Avatar user={recipe.author} size={42} />
            <div>
              <span>{t('recipe.author')}</span>
              <strong>{recipe.author?.name}</strong>
            </div>
            <span className="detail-dot">·</span>
            <span className="detail-date"><CalendarDays size={14} /> {formatDate(recipe.created_at, language)}</span>
          </div>
          <div className="detail-actions">
            <button type="button" className={`btn ${favorited ? 'btn-gold' : 'btn-glass'}`} onClick={toggleFavorite} disabled={actionBusy}>
              <Heart size={16} fill={favorited ? 'currentColor' : 'none'} />
              {favorited ? t('common.favorites') : t('common.favorites')}
              <span className="action-count">{favoriteCount}</span>
            </button>
            <button type="button" className="btn btn-glass" onClick={shareRecipe}><Share2 size={16} /> {t('common.share')}</button>
            <button type="button" className="btn btn-glass" onClick={downloadPdf} disabled={actionBusy}><Download size={16} /> {t('common.downloadPdf')}</button>
            <button type="button" className="btn btn-glass" onClick={() => window.print()}><Printer size={16} /> {t('common.print')}</button>
            {canEdit && <Link to={`/recipes/${recipe.id}/edit`} className="btn btn-gold">{t('recipe.editRecipe')}</Link>}
          </div>
        </div>
      </section>

      <div className="detail-info-bar">
        <div><Clock size={18} /><span>{t('recipe.prep')}</span><strong>{formatMinutes(recipe.prep_time, t)}</strong></div>
        <div><Flame size={18} /><span>{t('recipe.cook')}</span><strong>{formatMinutes(recipe.cook_time, t)}</strong></div>
        <div><Timer size={18} /><span>{t('common.totalTime')}</span><strong>{formatMinutes(recipe.total_time, t)}</strong></div>
        <div><Users size={18} /><span>{t('recipe.servings')}</span><strong>{recipe.servings}</strong></div>
        <div><ChefHat size={18} /><span>{t('common.difficulty')}</span><strong>{t(`difficulty.${recipe.difficulty}`)}</strong></div>
        <div><Sparkles size={18} /><span>{t('common.calories')}</span><strong>{recipe.calories} {t('common.kcal')}</strong></div>
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">{t('common.cuisine')} · {pick(recipe.cuisine, recipe.cuisine_hi)}</span>
                <h2>{t('recipe.ingredients')}</h2>
              </div>
              <div className="serving-stepper">
                <span>{t('recipe.servings')}</span>
                <button type="button" className="icon-btn" onClick={() => setServings((v) => Math.max(1, v - 1))} disabled={servings <= 1}><Minus size={14} /></button>
                <strong>{servings}</strong>
                <button type="button" className="icon-btn" onClick={() => setServings((v) => Math.min(30, v + 1))}><Plus size={14} /></button>
              </div>
            </div>
            <ul className="ingredient-list">
              {scaledIngredients.map((item) => (
                <li key={item.id}>
                  <span className="ingredient-qty">{item.quantity} {item.unit}</span>
                  <span className="ingredient-name">{pick(item.name, item.name_hi)}</span>
                  {item.note && <span className="ingredient-note">{item.note}</span>}
                </li>
              ))}
            </ul>
            <div className="ingredient-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={addToShopping} disabled={actionBusy}>
                <ShoppingBasket size={15} /> {t('recipe.addToShoppingList')}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={startTimer}>
                <Timer size={15} /> {t('common.startTimer')}
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">{t('recipe.step', { number: 1 })}–{t('recipe.step', { number: recipe.steps.length })}</span>
                <h2>{t('recipe.method')}</h2>
              </div>
            </div>
            <ol className="step-list">
              {recipe.steps.map((step) => (
                <li key={step.id}>
                  <span className="step-number">{step.step_number}</span>
                  <div>
                    <p>{pick(step.instruction, step.instruction_hi)}</p>
                    {step.image && <img src={mediaUrl(step.image)} alt="" />}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {recipe.tips && (
            <section className="tips-panel">
              <span className="tips-icon"><Sparkles size={20} /></span>
              <div>
                <h3>{t('recipe.chefTips')}</h3>
                <p>{pick(recipe.tips, recipe.tips_hi)}</p>
              </div>
            </section>
          )}

          {recipe.description && (
            <section className="panel prose-panel">
              <h2>{t('recipe.about')}</h2>
              <p>{pick(recipe.description, recipe.description_hi)}</p>
            </section>
          )}

          {recipe.video_url && (
            <a href={recipe.video_url} target="_blank" rel="noreferrer" className="video-link">
              <PlayCircle size={20} />
              <span>{t('recipe.video')}</span>
            </a>
          )}

          <section className="panel reviews-panel" id="reviews">
            <div className="panel-heading">
              <div>
                <h2>{t('recipe.reviews')}</h2>
                <div className="reviews-summary">
                  <StarRating value={reviews.rating_avg || recipe.rating_avg} size={17} showValue />
                  <span>{t('recipe.ratingAndReviews', { count: reviews.rating_count || recipe.rating_count })}</span>
                </div>
              </div>
            </div>

            {!isOwn && (
              <form className="review-form" onSubmit={submitReview}>
                <div className="review-form-head">
                  <Avatar user={user} size={38} />
                  <div>
                    <strong>{recipe.user_review ? t('recipe.editReview') : t('recipe.writeReview')}</strong>
                    <StarRating value={rating} onChange={setRating} size={23} />
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder={t('recipe.reviewPlaceholder')}
                  maxLength={2000}
                />
                {reviewError && <p className="field-error">{reviewError}</p>}
                <div className="review-form-actions">
                  {recipe.user_review && (
                    <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => setDeleteReviewTarget(recipe.user_review.id)}>
                      <Trash2 size={14} /> {t('recipe.deleteReview')}
                    </button>
                  )}
                  <button type="submit" className="btn btn-primary btn-sm" disabled={reviewBusy}>
                    {reviewBusy ? t('common.saving') : recipe.user_review ? t('recipe.updateReview') : t('recipe.submitReview')}
                  </button>
                </div>
              </form>
            )}
            {isOwn && <div className="alert alert-info">{t('recipe.ownRecipe')}</div>}

            {reviewsLoading ? (
              <InlineLoader />
            ) : reviews.items.length ? (
              <div className="review-list">
                {reviews.items.map((review) => (
                  <article className="review-item" key={review.id}>
                    <Avatar user={review.user} size={40} />
                    <div className="review-body">
                      <div className="review-head">
                        <div>
                          <strong>{review.user?.name}</strong>
                          <StarRating value={review.rating} size={14} />
                        </div>
                        <span>{formatDate(review.created_at, language)}</span>
                      </div>
                      {review.comment && <p>{review.comment}</p>}
                      {review.user?.id === user?.id ? (
                        <div className="review-own-actions">
                          <button type="button" className="link-btn" onClick={() => { setRating(review.rating); setComment(review.comment || ''); document.querySelector('.review-form')?.scrollIntoView({ behavior: 'smooth' }) }}>
                            {t('common.edit')}
                          </button>
                          <button type="button" className="link-btn text-danger" onClick={() => setDeleteReviewTarget(review.id)}>{t('common.delete')}</button>
                        </div>
                      ) : (
                        <button type="button" className="link-btn report-link" onClick={() => { setReportTarget({ type: 'review', id: review.id }); setReportReason('') }}>
                          <Flag size={12} /> {t('recipe.report')}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState icon={Star} title={t('recipe.noReviews')} message={t('recipe.beFirst')} compact />
            )}

            {reviews.pagination && (
              <Pagination page={reviews.pagination.page} pages={reviews.pagination.pages} onChange={loadReviews} />
            )}
          </section>
        </div>

        <aside className="detail-side">
          <section className="panel author-panel">
            <Avatar user={recipe.author} size={64} />
            <h3>{recipe.author?.name}</h3>
            <p>{recipe.author?.bio || t('app.tagline')}</p>
            <Link to={`/explore?author_id=${recipe.author?.id}`} className="btn btn-outline btn-sm">{t('recipe.viewAuthor')}</Link>
          </section>

          <section className="panel nutrition-panel">
            <h3>{t('recipe.nutrition')}</h3>
            <p className="panel-note">{t('recipe.nutritionNote')}</p>
            <div className="nutrition-list">
              <div><span>{t('common.calories')}</span><strong>{recipe.calories} {t('common.kcal')}</strong></div>
              {Object.entries(recipe.nutrition || {}).map(([key, value]) => (
                <div key={key}><span>{t(`recipeForm.${key}`) || key}</span><strong>{value}</strong></div>
              ))}
            </div>
          </section>

          <section className="panel side-actions">
            <h3>{t('recipe.startTimerLabel')}</h3>
            <button type="button" className="btn btn-primary btn-block" onClick={startTimer}><Timer size={16} /> {t('common.startTimer')}</button>
            <button type="button" className="btn btn-outline btn-block" onClick={addToShopping}><ShoppingBasket size={16} /> {t('common.addToShoppingList')}</button>
            <button type="button" className="btn btn-ghost btn-block" onClick={shareRecipe}><Share2 size={16} /> {t('common.share')}</button>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => { setReportTarget({ type: 'recipe', id: recipe.id }); setReportReason('') }}>
              <Flag size={16} /> {t('recipe.reportRecipe')}
            </button>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(deleteReviewTarget)}
        onClose={() => setDeleteReviewTarget(null)}
        onConfirm={deleteReview}
        title={t('recipe.deleteReview')}
        message={t('recipe.deleteReviewConfirm')}
        loading={reviewBusy}
      />

      <Modal
        open={Boolean(reportTarget)}
        onClose={() => setReportTarget(null)}
        title={t('recipe.reportTitle')}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setReportTarget(null)}>{t('common.cancel')}</button>
            <button type="button" className="btn btn-danger" onClick={submitReport} disabled={reportBusy || reportReason.trim().length < 5}>
              {reportBusy ? t('common.saving') : t('common.submit')}
            </button>
          </>
        }
      >
        <div className="field">
          <label>{t('recipe.reportReason')}</label>
          <textarea rows={4} value={reportReason} onChange={(event) => setReportReason(event.target.value)} placeholder={t('recipe.reportPlaceholder')} maxLength={1000} />
        </div>
      </Modal>
    </div>
  )
}

