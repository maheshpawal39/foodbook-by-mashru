import en from './en'
import hi from './hi'

export const dictionaries = { en, hi }

export const languages = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'hi', label: 'हिन्दी', short: 'हिं' },
]

export function getByPath(object, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), object)
}

export function translate(dictionary, key, vars = {}) {
  const value = getByPath(dictionary, key)
  if (typeof value !== 'string') return key
  return value.replace(/\{\{(\w+)\}\}/g, (_, name) => (vars[name] !== undefined ? String(vars[name]) : `{{${name}}}`))
}
