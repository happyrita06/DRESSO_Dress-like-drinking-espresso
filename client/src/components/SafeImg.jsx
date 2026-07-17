import { useEffect, useState } from 'react'

/**
 * <img> for the "one specific URL, no candidate list" case (a saved
 * wardrobe item's link-preview photo, a post's own image, a link-import
 * preview). A dead/blocked URL here has nowhere else to fall back to, so
 * this just swaps to `fallback` instead of leaving the browser's native
 * broken-image icon on screen.
 */
function SafeImg({ src, fallback = null, alt = '', ...rest }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  if (!src || failed) return fallback

  return <img src={src} alt={alt} onError={() => setFailed(true)} {...rest} />
}

export default SafeImg
