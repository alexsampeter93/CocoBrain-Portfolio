import { useEffect, useState } from 'react'
import { COMPACT_QUERY } from './tokens'

/**
 * Un único sitio donde se decide si estamos en pantalla pequeña.
 *
 * Antes esta comprobación estaba duplicada con umbrales distintos en varios
 * componentes, así que había estados intermedios en los que unas piezas
 * creían estar en móvil y otras no.
 */
export function useCompact() {
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(COMPACT_QUERY).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(COMPACT_QUERY)
    const onChange = (event) => setCompact(event.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return compact
}
