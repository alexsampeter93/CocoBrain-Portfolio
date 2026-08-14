import { useEffect, useState, useSyncExternalStore } from 'react'
import { getCalmMode, subscribeCalmMode } from '../state/calmMode'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Devuelve true si hay que quedarse quieto: porque el sistema lo pide o
 * porque el visitante ha encendido el modo "cabeza despejada".
 *
 * Se consulta en todas partes: sin intro, sin viajes de camara, mascota
 * estatica.
 */
export function usePrefersReducedMotion() {
  const [systemReduced, setSystemReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = (event) => setSystemReduced(event.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  // `useSyncExternalStore` funciona igual dentro del canvas de R3F, que corre
  // en otro reconciliador y no recibe los contextos del arbol de DOM.
  const calm = useSyncExternalStore(subscribeCalmMode, getCalmMode, () => false)

  return systemReduced || calm
}
