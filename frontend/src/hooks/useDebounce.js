import { useEffect, useState } from 'react'

export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · FoodieBook` : 'FoodieBook by Marshru'
  }, [title])
}
