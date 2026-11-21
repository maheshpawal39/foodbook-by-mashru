import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Check, ChefHat, ClipboardList, ImagePlus, Info, Minus, Plus, Save, Trash2, Utensils,
} from 'lucide-react'
import { categoriesApi, recipesApi } from '../services'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { getErrorMessage } from '../utils/format'
import { CUISINE_OPTIONS, DIFFICULTY_VALUES, DEFAULT_RECIPE_IMAGE } from '../utils/constants'
import { useDocumentTitle } from '../hooks/useDebounce'
import PageHeader from '../components/PageHeader'
import Field from '../components/Field'
import ImageWithFallback from '../components/ImageWithFallback'
import EmptyState from '../components/EmptyState'
import { FullPageLoader, InlineLoader } from '../components/Loader'

const EMPTY = {
  title: '',
  short_description: '',
  description: '',
  category_id: '',
  cuisine: 'Indian',
  diet: 'veg',
  prep_time: 15,
  cook_time: 30,
  servings: 4,
  difficulty: 'Easy',
  calories: '',
  tips: '',
  video_url: '',
  status: 'draft',
  ingredients: [{ name: '', quantity: '', unit: '', notes: '' }],
  steps: [{ instruction: '', timer_seconds: 0 }],
  nutrition: { protein: '', carbs: '', fat: '', fiber: '', sugar: '', sodium: '' },
}

export default function RecipeForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { user } = useAuth()
  const { t } = useLanguage()
  const toast = useToast()
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [removeImage, setRemoveImage] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [loadError, setLoadError] = useState('')
  useDocumentTitle(isEdit ? t('form.editTitle') : t('form.createTitle'))

  useEffect(() => {
    categoriesApi.list()
      .then((response) => {
        const list = response.data?.data || []
        setCategories(list)
        if (!isEdit && list[0]) setForm((current) => ({ ...current, category_id: String(list[0].id) }))
      })
      .catch(() => {})
  }, [isEdit])

  useEffect(() => {
    if (!isEdit) {
      setForm(EMPTY)
      setLoading(false)
      return
    }
    setLoading(true)
    recipesApi.get(id)
      .then((response) => {
        const recipe = response.data?.data
        if (!recipe?.can_edit) {
          setLoadError(t('form.notAllowed'))
          return
        }
        setForm({
          title: recipe.title || '',
          short_description: recipe.short_description || '',
          description: recipe.description || '',
          category_id: recipe.category?.id ? String(recipe.category.id) : '',
          cuisine: recipe.cuisine || 'Indian',
          diet: recipe.diet || 'veg',
          prep_time: recipe.prep_time ?? 0,
          cook_time: recipe.cook_time ?? 0,
          servings: recipe.servings ?? 2,
          difficulty: recipe.difficulty || 'Easy',
          calories: recipe.calories ?? '',
          tips: recipe.tips || '',
          video_url: recipe.video_url || '',
          status: recipe.status || 'draft',
          ingredients: recipe.ingredients?.length
            ? recipe.ingredients.map((item) => ({ name: item.name, quantity: item.quantity || '', unit: item.unit || '', notes: item.notes || '' }))
            : [{ name: '', quantity: '', unit: '', notes: '' }],
          steps: recipe.steps?.length
            ? recipe.steps.map((step) => ({ instruction: step.instruction, timer_seconds: step.timer_seconds || 0 }))
            : [{ instruction: '', timer_seconds: 0 }],
          nutrition: { ...EMPTY.nutrition, ...(recipe.nutrition || {}) },
        })
        setPreview(recipe.image || '')
      })
      .catch((err) => setLoadError(getErrorMessage(err, t)))
      .finally(() => setLoading(false))
  }, [id, isEdit, t])

  useEffect(() => {
    if (!imageFile) return undefined
    const url = URL.createObjectURL(imageFile)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const updateIngredient = (index, key, value) => {
    setForm((current) => ({
      ...current,
      ingredients: current.ingredients.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    }))
  }

  const updateStep = (index, key, value) => {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    }))
  }

  const addIngredient = () => update('ingredients', [...form.ingredients, { name: '', quantity: '', unit: '', notes: '' }])
  const removeIngredient = (index) => update('ingredients', form.ingredients.filter((_, itemIndex) => itemIndex !== index))
  const addStep = () => update('steps', [...form.steps, { instruction: '', timer_seconds: 0 }])
  const removeStep = (index) => update('steps', form.steps.filter((_, itemIndex) => itemIndex !== index))

  const chooseImage = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 6 * 1024 * 1024) {
      toast.error(t('form.imageTooLarge'))
      return
    }
    setImageFile(file)
    setRemoveImage(false)
  }

  const validate = () => {
    const next = {}
    if (form.title.trim().length < 3) next.title = t('errors.required')
    if (!form.category_id) next.category_id = t('errors.required')
    const validIngredients = form.ingredients.filter((item) => item.name.trim())
    if (!validIngredients.length) next.ingredients = t('form.ingredientsRequired')
    const validSteps = form.steps.filter((step) => step.instruction.trim())
    if (!validSteps.length) next.steps = t('form.stepsRequired')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const save = async (status) => {
    if (!validate()) {
      toast.error(t('form.validationTitle'))
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setSaving(true)
    const data = new FormData()
    data.append('title', form.title)
    data.append('short_description', form.short_description)
    data.append('description', form.description)
    data.append('category_id', form.category_id)
    data.append('cuisine', form.cuisine)
    data.append('diet', form.diet)
    data.append('prep_time', String(form.prep_time || 0))
    data.append('cook_time', String(form.cook_time || 0))
    data.append('servings', String(form.servings || 1))
    data.append('difficulty', form.difficulty)
    data.append('calories', form.calories ? String(form.calories) : '')
    data.append('tips', form.tips)
    data.append('video_url', form.video_url)
    data.append('status', status)
    data.append('ingredients', JSON.stringify(form.ingredients.filter((item) => item.name.trim())))
    data.append('steps', JSON.stringify(form.steps.filter((step) => step.instruction.trim())))
    data.append('nutrition', JSON.stringify(form.nutrition))
    if (imageFile) data.append('image', imageFile)
    if (removeImage) data.append('remove_image', 'true')

    try {
      if (isEdit) {
        await recipesApi.update(id, data)
        toast.success(status === 'published' ? t('form.publishedMsg') : t('form.updated'))
        navigate(`/recipes/${id}`)
      } else {
        const response = await recipesApi.create(data)
        const recipe = response.data?.data
        toast.success(status === 'published' ? t('form.publishedMsg') : t('form.draftSaved'))
        navigate(`/recipes/${recipe.id}`)
      }
    } catch (err) {
      if (err.errors) setErrors(err.errors)
      toast.error(getErrorMessage(err, t))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <FullPageLoader label={t('form.loadingRecipe')} />
  if (loadError) {
    return (
      <div className="page">
        <EmptyState icon={Utensils} title={t('form.notAllowed')} message={loadError} action={<Link to="/my-recipes" className="btn btn-primary">{t('nav.myRecipes')}</Link>} />
      </div>
    )
  }

  return (
    <div className="page form-page">
      <Link to={isEdit ? `/recipes/${id}` : '/my-recipes'} className="back-link"><ArrowLeft size={16} /> {t('common.back')}</Link>
      <PageHeader
        eyebrow={t('form.subtitle')}
        title={isEdit ? t('form.editTitle') : t('form.createTitle')}
        subtitle={t('nav.addRecipe')}
        actions={
          <div className="form-header-actions">
            <button type="button" className="btn btn-ghost" onClick={() => save('draft')} disabled={saving}>
              <Save size={16} /> {t('form.saveDraft')}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => save('published')} disabled={saving}>
              {saving ? <InlineLoader /> : <><Check size={16} /> {t('form.publishRecipe')}</>}
            </button>
          </div>
        }
      />

      <form className="recipe-form" onSubmit={(event) => event.preventDefault()}>
        <section className="panel form-section">
          <div className="form-section-head">
            <span className="form-section-icon"><ChefHat size={19} /></span>
            <div><h2>{t('form.basics')}</h2><p>{t('form.subtitle')}</p></div>
          </div>

          <div className="form-grid">
            <Field label={t('form.name')} htmlFor="title" error={errors.title} required className="span-2">
              <input id="title" type="text" value={form.title} onChange={(event) => update('title', event.target.value)} placeholder={t('form.namePlaceholder')} maxLength={200} />
            </Field>
            <Field label={t('form.shortDesc')} htmlFor="short_description" error={errors.short_description} className="span-2">
              <input id="short_description" type="text" value={form.short_description} onChange={(event) => update('short_description', event.target.value)} placeholder={t('form.shortPlaceholder')} maxLength={400} />
            </Field>
            <Field label={t('form.fullDesc')} htmlFor="description" className="span-2">
              <textarea id="description" rows={5} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder={t('form.fullPlaceholder')} />
            </Field>

            <Field label={t('form.image')} htmlFor="image" error={errors.image} hint={t('form.imageHint')} className="span-2">
              <div className="image-upload">
                <div className="image-preview">
                  <ImageWithFallback src={removeImage ? DEFAULT_RECIPE_IMAGE : preview} alt={form.title || 'Recipe'} />
                </div>
                <div className="image-upload-copy">
                  <label htmlFor="image" className="btn btn-ghost"><ImagePlus size={16} /> {t('form.imageChange')}</label>
                  <input id="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} hidden />
                  {preview && !removeImage ? (
                    <button type="button" className="text-btn danger" onClick={() => { setImageFile(null); setPreview(''); setRemoveImage(true) }}>
                      <Trash2 size={14} /> {t('form.removeImage')}
                    </button>
                  ) : null}
                </div>
              </div>
            </Field>

            <Field label={t('form.category')} htmlFor="category_id" error={errors.category_id} required>
              <select id="category_id" value={form.category_id} onChange={(event) => update('category_id', event.target.value)}>
                <option value="">{t('form.selectCategory')}</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </Field>

            <Field label={t('form.cuisine')} htmlFor="cuisine">
              <input id="cuisine" list="cuisine-options" value={form.cuisine} onChange={(event) => update('cuisine', event.target.value)} />
              <datalist id="cuisine-options">
                {CUISINE_OPTIONS.map((cuisine) => <option key={cuisine} value={cuisine} />)}
              </datalist>
            </Field>

            <Field label={t('form.diet')} htmlFor="diet">
              <div className="segmented">
                <button type="button" className={form.diet === 'veg' ? 'active' : ''} onClick={() => update('diet', 'veg')}>{t('common.veg')}</button>
                <button type="button" className={form.diet === 'nonveg' ? 'active' : ''} onClick={() => update('diet', 'nonveg')}>{t('common.nonVeg')}</button>
              </div>
            </Field>

            <Field label={t('form.difficulty')} htmlFor="difficulty">
              <select id="difficulty" value={form.difficulty} onChange={(event) => update('difficulty', event.target.value)}>
                {DIFFICULTY_VALUES.map((value) => <option key={value} value={value}>{t(`common.${value.toLowerCase()}`)}</option>)}
              </select>
            </Field>

            <Field label={t('form.prepTime')} htmlFor="prep_time" error={errors.prep_time}>
              <input id="prep_time" type="number" min="0" max="100000" value={form.prep_time} onChange={(event) => update('prep_time', event.target.value)} />
            </Field>
            <Field label={t('form.cookTime')} htmlFor="cook_time" error={errors.cook_time}>
              <input id="cook_time" type="number" min="0" max="100000" value={form.cook_time} onChange={(event) => update('cook_time', event.target.value)} />
            </Field>
            <Field label={t('form.servings')} htmlFor="servings" error={errors.servings}>
              <input id="servings" type="number" min="1" max="500" value={form.servings} onChange={(event) => update('servings', event.target.value)} />
            </Field>
            <Field label={t('form.calories')} htmlFor="calories" error={errors.calories}>
              <input id="calories" type="number" min="0" max="100000" value={form.calories} onChange={(event) => update('calories', event.target.value)} />
            </Field>

            <Field label={t('form.videoUrl')} htmlFor="video_url" error={errors.video_url} className="span-2">
              <input id="video_url" type="url" value={form.video_url} onChange={(event) => update('video_url', event.target.value)} placeholder="https://youtube.com/watch?v=…" />
            </Field>
          </div>
        </section>

        <section className="panel form-section">
          <div className="form-section-head">
            <span className="form-section-icon"><Utensils size={19} /></span>
            <div><h2>{t('form.ingredientsTitle')}</h2><p>{t('form.ingredientsSub')}</p></div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addIngredient}><Plus size={15} /> {t('form.addIngredient')}</button>
          </div>

          {errors.ingredients ? <div className="alert alert-error">{errors.ingredients}</div> : null}
          <div className="ingredient-rows">
            <div className="row-head">
              <span>{t('form.ingredientName')}</span><span>{t('form.quantity')}</span><span>{t('form.unit')}</span><span>{t('form.notes')}</span><span />
            </div>
            {form.ingredients.map((item, index) => (
              <div className="ingredient-row" key={index}>
                <input type="text" value={item.name} onChange={(event) => updateIngredient(index, 'name', event.target.value)} placeholder={t('form.ingredientName')} />
                <input type="text" value={item.quantity} onChange={(event) => updateIngredient(index, 'quantity', event.target.value)} placeholder="200" />
                <input type="text" value={item.unit} onChange={(event) => updateIngredient(index, 'unit', event.target.value)} placeholder="g" />
                <input type="text" value={item.notes} onChange={(event) => updateIngredient(index, 'notes', event.target.value)} placeholder={t('common.optional')} />
                <button type="button" className="icon-btn danger" onClick={() => removeIngredient(index)} disabled={form.ingredients.length === 1} aria-label={t('common.delete')}>
                  <Minus size={16} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-ghost btn-sm add-row-btn" onClick={addIngredient}><Plus size={15} /> {t('form.addIngredient')}</button>
        </section>

        <section className="panel form-section">
          <div className="form-section-head">
            <span className="form-section-icon"><ClipboardList size={19} /></span>
            <div><h2>{t('form.stepsTitle')}</h2><p>{t('form.stepsSub')}</p></div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addStep}><Plus size={15} /> {t('form.addStep')}</button>
          </div>

          {errors.steps ? <div className="alert alert-error">{errors.steps}</div> : null}
          <div className="step-rows">
            {form.steps.map((step, index) => (
              <div className="step-row" key={index}>
                <span className="step-row-number">{index + 1}</span>
                <textarea rows={2} value={step.instruction} onChange={(event) => updateStep(index, 'instruction', event.target.value)} placeholder={t('form.stepPlaceholder')} />
                <div className="step-timer-input">
                  <label>{t('form.stepTimer')}</label>
                  <input
                    type="number"
                    min="0"
                    max="1440"
                    step="0.5"
                    value={step.timer_seconds ? step.timer_seconds / 60 : ''}
                    onChange={(event) => updateStep(index, 'timer_seconds', Math.max(0, Number(event.target.value) * 60))}
                  />
                </div>
                <button type="button" className="icon-btn danger" onClick={() => removeStep(index)} disabled={form.steps.length === 1} aria-label={t('common.delete')}>
                  <Minus size={16} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-ghost btn-sm add-row-btn" onClick={addStep}><Plus size={15} /> {t('form.addStep')}</button>
        </section>

        <div className="form-two-col">
          <section className="panel form-section">
            <div className="form-section-head">
              <span className="form-section-icon"><Info size={19} /></span>
              <div><h2>{t('form.tips')}</h2></div>
            </div>
            <Field htmlFor="tips">
              <textarea id="tips" rows={5} value={form.tips} onChange={(event) => update('tips', event.target.value)} placeholder={t('form.tipsPlaceholder')} />
            </Field>
          </section>

          <section className="panel form-section">
            <div className="form-section-head">
              <span className="form-section-icon"><Utensils size={19} /></span>
              <div><h2>{t('form.nutritionTitle')}</h2><p>{t('form.nutritionSub')}</p></div>
            </div>
            <div className="nutrition-form-grid">
              {['protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'].map((key) => (
                <Field key={key} label={t(`form.${key}`)} htmlFor={`nutrition-${key}`}>
                  <input
                    id={`nutrition-${key}`}
                    type="text"
                    value={form.nutrition[key] || ''}
                    onChange={(event) => update('nutrition', { ...form.nutrition, [key]: event.target.value })}
                    placeholder="0 g"
                  />
                </Field>
              ))}
            </div>
          </section>
        </div>

        <div className="form-submit-bar">
          <span>{isEdit ? t('form.editTitle') : t('form.createTitle')}</span>
          <div>
            <button type="button" className="btn btn-ghost" onClick={() => save('draft')} disabled={saving}>
              <Save size={16} /> {t('form.saveDraft')}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => save('published')} disabled={saving}>
              {saving ? <InlineLoader /> : <><Check size={16} /> {t('form.publishRecipe')}</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
