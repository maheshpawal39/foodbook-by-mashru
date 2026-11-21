import { Link } from 'react-router-dom'
import {
  CakeSlice, Cookie, CupSoda, Drumstick, EggFried, Flame, Leaf, Moon, Pizza, Soup, Sprout, Store, Sun,
  UtensilsCrossed,
} from 'lucide-react'
import ImageWithFallback from './ImageWithFallback'
import { useLanguage } from '../context/LanguageContext'

const ICONS = { EggFried, Sun, Moon, Cookie, CakeSlice, CupSoda, Flame, Soup, Pizza, Store, Leaf, Sprout, Drumstick, UtensilsCrossed }

export default function CategoryCard({ category }) {
  const { language } = useLanguage()
  const Icon = ICONS[category.icon] || UtensilsCrossed
  const name = language === 'hi' && category.name_hi ? category.name_hi : category.name
  return (
    <Link to={`/explore?category=${category.slug}`} className="category-card">
      <ImageWithFallback src={category.image} alt={name} className="category-image" />
      <div className="category-overlay" />
      <span className="category-icon">
        <Icon size={20} />
      </span>
      <div className="category-copy">
        <h3>{name}</h3>
        <span>{category.recipe_count} {category.recipe_count === 1 ? 'recipe' : 'recipes'}</span>
      </div>
    </Link>
  )
}
