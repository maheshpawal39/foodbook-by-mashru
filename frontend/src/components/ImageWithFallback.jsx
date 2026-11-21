import { useState } from 'react'
import { DEFAULT_RECIPE_IMAGE } from '../utils/constants'

export default function ImageWithFallback({ src, alt = '', className = '', ...rest }) {
  const [failed, setFailed] = useState(false)
  const finalSrc = !src || failed ? DEFAULT_RECIPE_IMAGE : src
  return (
    <img
      src={finalSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
      {...rest}
    />
  )
}
