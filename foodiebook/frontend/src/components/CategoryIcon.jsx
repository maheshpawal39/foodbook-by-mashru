import {
  CakeSlice,
  Coffee,
  Cookie,
  CupSoda,
  Drumstick,
  Flame,
  Leaf,
  MoonStar,
  Pizza,
  Salad,
  Soup,
  Store,
  Sun,
  Utensils,
} from 'lucide-react'

const ICONS = {
  CakeSlice,
  Coffee,
  Cookie,
  CupSoda,
  Drumstick,
  Flame,
  Leaf,
  MoonStar,
  Pizza,
  Salad,
  Soup,
  Store,
  Sun,
  Utensils,
}

export default function CategoryIcon({ name = 'Utensils', size = 20, ...rest }) {
  const Icon = ICONS[name] || Utensils
  return <Icon size={size} {...rest} />
}
