import en from './en'
import hi from './hi'

export const translations = { en, hi }

export function getValue(source, path) {
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), source)
}

export default translations
