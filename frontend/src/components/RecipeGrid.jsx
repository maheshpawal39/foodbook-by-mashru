import RecipeCard from './RecipeCard'
import { SkeletonGrid } from './Loader'

export default function RecipeGrid({ recipes = [], loading = false, skeletonCount = 6, empty, onChange, variant = 'default' }) {
  if (loading) return <SkeletonGrid count={skeletonCount} />
  if (!recipes.length) return empty || null
  return (
    <div className="recipe-grid">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} variant={variant} onChange={onChange} />
      ))}
    </div>
  )
}
