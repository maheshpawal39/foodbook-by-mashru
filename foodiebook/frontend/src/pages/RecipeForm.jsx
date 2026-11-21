import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ChefHat,
  Clock,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Save,
  Send,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import ImageUpload from '../components/ImageUpload'
import EmptyState from '../components/EmptyState'
import { PanelSkeleton } from '../components/Loaders'
import { categoryService } from '../services/catalogService'
import { recipeService } from '../services/recipeService'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { useAsync, useDocumentTitle } from '../hooks/useUtils'
import { CUISINES, DIFFICULTIES } from '../utils/format'
import { getErrorMessage, getFieldErrors } from '../utils/errors'

const blankIngredient = () => ({ name: '', quantity: '1', unit: '' })
const blankStep = () => ({ instruction: '' })

const emptyForm = {
  title: '',
  title_hi: '',
  short_description: '',
  short_description_hi: '',
  description: '',
  description_hi: '',
  image: '',
  category_id: '',
  cuisine: 'Indian',
  cuisine_hi: '',
  food_type: 'veg',
  prep_time: 10,
  cook_time: 20,
  total_time: 30,
  difficulty: 'Easy',
  servings: 2,
  calories: 0,
  tips: '',
  tips_hi: '',
  video_url: '',
  nutrition: { protein: '', carbs: '', fat: '', fiber: '', sugar: '', sodium: '' },
  status: 'draft',
  ingredients: [blankIngredient()],
  steps: [blankStep()],
}

export default function RecipeForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { toast } = useToast()
  const [form, setForm] = useState(emptyForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeStatus, setActiveStatus] = useState('draft')

  const { data: categoryData, loading: categoriesLoading } = useAsync(() => categoryService.list(), [])
  const { data: recipeData, loading: recipeLoading, error: recipeError } = useAsync(
    () => (editing ? recipeService.get(id) : Promise.resolve(null)),
    [id],
  )
  useDocumentTitle(editing ? t('recipeForm.editTitle') : t('recipeForm.createTitle'))

  const categories = categoryData?.items || []

  useEffect(() => {
    if (!editing) {
      setForm(emptyForm)
      return
    }
    const recipe = recipeData?.recipe
    if (!recipe) return
    setActiveStatus(recipe.status)
    setForm({
      title: recipe.title || '',
      title_hi: recipe.title_hi || '',
      short_description: recipe.short_description || '',
      short_description_hi: recipe.short_description_hi || '',
      description: recipe.description || '',
      description_hi: recipe.description_hi || '',
      image: recipe.image || '',
      category_id: recipe.category_id || recipe.category?.id || '',
      cuisine: recipe.cuisine || 'Indian',
      cuisine_hi: recipe.cuisine_hi || '',
      food_type: recipe.food_type || 'veg',
      prep_time: recipe.prep_time ?? 10,
      cook_time: recipe.cook_time ?? 20,
      total_time: recipe.total_time ?? 30,
      difficulty: recipe.difficulty || 'Easy',
      servings: recipe.servings ?? 2,
      calories: recipe.calories ?? 0,
      tips: recipe.tips || '',
      tips_hi: recipe.tips_hi || '',
      video_url: recipe.video_url || '',
      nutrition: {
        protein: recipe.nutrition?.protein || '',
        carbs: recipe.nutrition?.carbs || '',
        fat: recipe.nutrition?.fat || '',
        fiber: recipe.nutrition?.fiber || '',
        sugar: recipe.nutrition?.sugar || '',
        sodium: recipe.nutrition?.sodium || '',
      },
      status: recipe.status || 'draft',
      ingredients: recipe.ingredients?.length
        ? recipe.ingredients.map((item) => ({ name: item.name || '', quantity: item.quantity || '1', unit: item.unit || '', name_hi: item.name_hi || '' }))
        : [blankIngredient()],
      steps: recipe.steps?.length
        ? recipe.steps.map((step) => ({ instruction: step.instruction || '', instruction_hi: step.instruction_hi || '' }))
        : [blankStep()],
    })
  }, [recipeData, editing])

  const total = useMemo(
    () => (Number(form.prep_time) || 0) + (Number(form.cook_time) || 0),
    [form.prep_time, form.cook_time],
  )

  const update = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value }
      if (field === 'prep_time' || field === 'cook_time') {
        const computed = (Number(field === 'prep_time' ? value : next.prep_time) || 0) + (Number(field === 'cook_time' ? value : next.cook_time) || 0)
        next.total_time = computed
      }
      return next
    })
  }

  const updateNutrition = (key, value) => {
    setForm((current) => ({ ...current, nutrition: { ...current.nutrition, [key]: value } }))
  }

  const updateIngredient = (index, key, value) => {
    setForm((current) => ({
      ...current,
      ingredients: current.ingredients.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }))
  }

  const updateStep = (index, value) => {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((item, i) => (i === index ? { ...item, instruction: value } : item)),
    }))
  }

  const addIngredient = () => setForm((current) => ({ ...current, ingredients: [...current.ingredients, blankIngredient()] }))
  const removeIngredient = (index) => setForm((current) => ({ ...current, ingredients: current.ingredients.filter((_, i) => i !== index) }))
  const addStep = () => setForm((current) => ({ ...current, steps: [...current.steps, blankStep()] }))
  const removeStep = (index) => setForm((current) => ({ ...current, steps: current.steps.filter((_, i) => i !== index) }))

  const validate = (status) => {
    const errors = {}
    if (form.title.trim().length < 2) errors.title = t('validation.required')
    if (form.short_description.trim().length < 10) errors.short_description = t('validation.required')
    if (!form.category_id) errors.category_id = t('validation.required')
    if (status === 'published') {
      if (!form.ingredients.some((item) => item.name.trim())) errors.ingredients = t('recipeForm.atLeastIngredient')
      if (!form.steps.some((item) => item.instruction.trim())) errors.steps = t('recipeForm.atLeastStep')
    }
    if (form.video_url && !/^https?:\/\//i.test(form.video_url)) errors.video_url = t('validation.required')
    return errors
  }

  const submit = async (status) => {
    setError('')
    setFieldErrors({})
    const errors = validate(status)
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      setError(t('recipeForm.requiredFields'))
      return
    }
    setSaving(true)
    setActiveStatus(status)
    const payload = {
      ...form,
      status,
      category_id: Number(form.category_id),
      prep_time: Number(form.prep_time) || 0,
      cook_time: Number(form.cook_time) || 0,
      total_time: Number(form.total_time) || total,
      servings: Number(form.servings) || 2,
      calories: Number(form.calories) || 0,
      ingredients: form.ingredients
        .filter((item) => item.name.trim())
        .map((item) => ({ name: item.name.trim(), name_hi: item.name_hi || '', quantity: String(item.quantity || '1'), unit: item.unit || '' })),
      steps: form.steps
        .filter((item) => item.instruction.trim())
        .map((item) => ({ instruction: item.instruction.trim() })),
    }
    try {
      const result = editing ? await recipeService.update(id, payload) : await recipeService.create(payload)
      toast.success(
        status === 'draft'
          ? t('recipeForm.draftSaved')
          : editing
            ? t('recipeForm.updated')
            : t('recipeForm.published'),
      )
      navigate(`/recipes/${result.recipe.id}`)
    } catch (err) {
      const apiFields = getFieldErrors(err)
      if (Object.keys(apiFields).length) setFieldErrors(apiFields)
      setError(getErrorMessage(err, t))
    } finally {
      setSaving(false)
    }
  }

  if (editing && recipeLoading) {
    return (
      <div className="page-stack">
        <PanelSkeleton rows={8} />
      </div>
    )
  }

  if (editing && (recipeError || !recipeData?.recipe)) {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title={t('recipeForm.editNotFound')}
        message={getErrorMessage(recipeError, t)}
        action={t('nav.myRecipes')}
        actionTo="/my-recipes"
      />
    )
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={editing ? t('common.edit') : t('nav.addRecipe')}
        title={editing ? t('recipeForm.editTitle') : t('recipeForm.createTitle')}
        subtitle={editing ? t('recipeForm.editSubtitle') : t('recipeForm.createSubtitle')}
        actions={
          <Link to={editing ? `/recipes/${id}` : '/my-recipes'} className="btn btn-ghost">
            <ArrowLeft size={16} /> {t('common.cancel')}
          </Link>
        }
      />

      {error && <div className="alert alert-error">{error}</div>}

      <form className="recipe-form" onSubmit={(event) => event.preventDefault()} noValidate>
        <section className="panel form-section">
          <div className="form-section-head">
            <span className="section-icon"><ChefHat size={19} /></span>
            <div>
              <h2>{t('recipeForm.basicInfo')}</h2>
              <p>{t('recipeForm.createSubtitle')}</p>
            </div>
          </div>

          <div className="form-grid two">
            <div className="field">
              <label htmlFor="title">{t('recipeForm.name')} <span className="req">*</span></label>
              <input id="title" value={form.title} onChange={(event) => update('title', event.target.value)} placeholder={t('recipeForm.namePlaceholder')} maxLength={200} />
              {fieldErrors.title && <span className="field-error">{fieldErrors.title}</span>}
            </div>
            <div className="field">
              <label htmlFor="category">{t('common.category')} <span className="req">*</span></label>
              <select id="category" value={form.category_id} onChange={(event) => update('category_id', event.target.value)} disabled={categoriesLoading}>
                <option value="">{t('recipeForm.selectCategory')}</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              {fieldErrors.category_id && <span className="field-error">{fieldErrors.category_id}</span>}
            </div>
          </div>

          <div className="field">
            <label htmlFor="short">{t('recipeForm.shortDescription')} <span className="req">*</span></label>
            <input id="short" value={form.short_description} onChange={(event) => update('short_description', event.target.value)} placeholder={t('recipeForm.shortPlaceholder')} maxLength={500} />
            {fieldErrors.short_description && <span className="field-error">{fieldErrors.short_description}</span>}
          </div>

          <div className="field">
            <label htmlFor="description">{t('recipeForm.fullDescription')}</label>
            <textarea id="description" rows={4} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder={t('recipeForm.fullPlaceholder')} />
          </div>

          <details className="hindi-panel">
            <summary>{t('recipeForm.hindiOptional')}</summary>
            <div className="form-grid two">
              <div className="field">
                <label>{t('recipeForm.hindiTitle')}</label>
                <input value={form.title_hi} onChange={(event) => update('title_hi', event.target.value)} />
              </div>
              <div className="field">
                <label>{t('recipeForm.hindiShort')}</label>
                <input value={form.short_description_hi} onChange={(event) => update('short_description_hi', event.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>{t('recipeForm.hindiDescription')}</label>
              <textarea rows={3} value={form.description_hi} onChange={(event) => update('description_hi', event.target.value)} />
            </div>
            <div className="field">
              <label>{t('recipeForm.hindiTips')}</label>
              <textarea rows={2} value={form.tips_hi} onChange={(event) => update('tips_hi', event.target.value)} />
            </div>
          </details>
        </section>

        <section className="panel form-section">
          <div className="form-section-head">
            <span className="section-icon"><ImageIcon size={19} /></span>
            <div>
              <h2>{t('recipeForm.media')}</h2>
              <p>{t('recipeForm.imageHint')}</p>
            </div>
          </div>
          <ImageUpload value={form.image} onChange={(value) => update('image', value)} label={t('recipeForm.media')} />
        </section>

        <section className="panel form-section">
          <div className="form-section-head">
            <span className="section-icon"><Clock size={19} /></span>
            <div>
              <h2>{t('recipeForm.details')}</h2>
              <p>{t('recipeForm.ingredientsHint')}</p>
            </div>
          </div>

          <div className="form-grid three">
            <div className="field">
              <label>{t('recipeForm.cuisine')}</label>
              <input list="cuisine-options" value={form.cuisine} onChange={(event) => update('cuisine', event.target.value)} placeholder={t('recipeForm.cuisinePlaceholder')} />
              <datalist id="cuisine-options">{CUISINES.map((cuisine) => <option key={cuisine} value={cuisine} />)}</datalist>
            </div>
            <div className="field">
              <label>{t('recipeForm.foodType')}</label>
              <div className="segmented small">
                <button type="button" className={form.food_type === 'veg' ? 'active' : ''} onClick={() => update('food_type', 'veg')}>{t('recipeForm.veg')}</button>
                <button type="button" className={form.food_type === 'non-veg' ? 'active' : ''} onClick={() => update('food_type', 'non-veg')}>{t('recipeForm.nonVeg')}</button>
              </div>
            </div>
            <div className="field">
              <label>{t('recipeForm.difficulty')}</label>
              <select value={form.difficulty} onChange={(event) => update('difficulty', event.target.value)}>
                {DIFFICULTIES.map((level) => <option key={level} value={level}>{t(`difficulty.${level}`)}</option>)}
              </select>
            </div>
          </div>

          <div className="form-grid four">
            <div className="field">
              <label>{t('recipeForm.prep')}</label>
              <input type="number" min="0" value={form.prep_time} onChange={(event) => update('prep_time', event.target.value)} />
            </div>
            <div className="field">
              <label>{t('recipeForm.cook')}</label>
              <input type="number" min="0" value={form.cook_time} onChange={(event) => update('cook_time', event.target.value)} />
            </div>
            <div className="field">
              <label>{t('recipeForm.total')}</label>
              <input type="number" min="0" value={form.total_time} onChange={(event) => update('total_time', event.target.value)} placeholder={String(total)} />
            </div>
            <div className="field">
              <label>{t('recipeForm.servings')}</label>
              <input type="number" min="1" value={form.servings} onChange={(event) => update('servings', event.target.value)} />
            </div>
          </div>

          <div className="form-grid two">
            <div className="field">
              <label>{t('recipeForm.calories')}</label>
              <input type="number" min="0" value={form.calories} onChange={(event) => update('calories', event.target.value)} />
              <span className="field-hint">{t('recipeForm.caloriesHint')}</span>
            </div>
            <div className="field">
              <label>{t('recipeForm.videoTitle')}</label>
              <input type="url" value={form.video_url} onChange={(event) => update('video_url', event.target.value)} placeholder={t('recipeForm.videoPlaceholder')} />
              {fieldErrors.video_url && <span className="field-error">{fieldErrors.video_url}</span>}
            </div>
          </div>
        </section>

        <section className="panel form-section">
          <div className="form-section-head">
            <span className="section-icon"><UtensilsCrossed size={19} /></span>
            <div>
              <h2>{t('recipeForm.ingredientsTitle')}</h2>
              <p>{t('recipeForm.ingredientsHint')}</p>
            </div>
          </div>
          {fieldErrors.ingredients && <span className="field-error">{fieldErrors.ingredients}</span>}
          <div className="ingredient-editor">
            {form.ingredients.map((item, index) => (
              <div className="ingredient-editor-row" key={index}>
                <input value={item.name} onChange={(event) => updateIngredient(index, 'name', event.target.value)} placeholder={t('recipeForm.ingredientName')} aria-label={t('recipeForm.ingredientName')} />
                <input className="qty-input" value={item.quantity} onChange={(event) => updateIngredient(index, 'quantity', event.target.value)} placeholder={t('recipeForm.quantity')} aria-label={t('recipeForm.quantity')} />
                <input className="unit-input" value={item.unit} onChange={(event) => updateIngredient(index, 'unit', event.target.value)} placeholder={t('recipeForm.unit')} aria-label={t('recipeForm.unit')} />
                <button type="button" className="icon-btn danger" onClick={() => removeIngredient(index)} disabled={form.ingredients.length === 1} aria-label={t('common.remove')}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={addIngredient}><Plus size={15} /> {t('recipeForm.addIngredient')}</button>
        </section>

        <section className="panel form-section">
          <div className="form-section-head">
            <span className="section-icon"><ChefHat size={19} /></span>
            <div>
              <h2>{t('recipeForm.stepsTitle')}</h2>
              <p>{t('recipeForm.stepsHint')}</p>
            </div>
          </div>
          {fieldErrors.steps && <span className="field-error">{fieldErrors.steps}</span>}
          <div className="step-editor">
            {form.steps.map((step, index) => (
              <div className="step-editor-row" key={index}>
                <span className="step-number">{index + 1}</span>
                <textarea rows={2} value={step.instruction} onChange={(event) => updateStep(index, event.target.value)} placeholder={t('recipeForm.stepPlaceholder')} aria-label={t('recipeForm.stepNumber', { number: index + 1 })} />
                <button type="button" className="icon-btn danger" onClick={() => removeStep(index)} disabled={form.steps.length === 1} aria-label={t('common.remove')}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={addStep}><Plus size={15} /> {t('recipeForm.addStep')}</button>
        </section>

        <section className="panel form-section">
          <div className="form-section-head">
            <span className="section-icon"><ChefHat size={19} /></span>
            <div>
              <h2>{t('recipeForm.tipsTitle')}</h2>
              <p>{t('recipeForm.tipsPlaceholder')}</p>
            </div>
          </div>
          <div className="field">
            <textarea rows={3} value={form.tips} onChange={(event) => update('tips', event.target.value)} placeholder={t('recipeForm.tipsPlaceholder')} />
          </div>
          <div className="form-section-head sub">
            <div>
              <h2>{t('recipeForm.nutritionTitle')}</h2>
              <p>{t('recipe.nutritionNote')}</p>
            </div>
          </div>
          <div className="form-grid three">
            {['protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'].map((key) => (
              <div className="field" key={key}>
                <label>{t(`recipeForm.${key}`)}</label>
                <input value={form.nutrition[key]} onChange={(event) => updateNutrition(key, event.target.value)} placeholder="e.g. 12 g" />
              </div>
            ))}
          </div>
        </section>

        <div className="form-actions-sticky">
          <div className="form-actions-note">
            <span className={`status-dot ${activeStatus}`} />
            {activeStatus === 'published' ? t('common.published') : t('common.draft')} · {total} {t('common.minutes')}
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => navigate(editing ? `/recipes/${id}` : '/my-recipes')}>{t('common.cancel')}</button>
            <button type="button" className="btn btn-outline" onClick={() => submit('draft')} disabled={saving}>
              <Save size={16} /> {saving && activeStatus === 'draft' ? t('recipeForm.saving') : t('recipeForm.saveDraft')}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => submit('published')} disabled={saving}>
              <Send size={16} /> {saving && activeStatus === 'published' ? t('recipeForm.saving') : editing ? t('recipeForm.updateRecipe') : t('recipeForm.publish')}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
