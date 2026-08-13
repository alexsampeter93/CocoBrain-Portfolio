import { useEffect, useRef, useState } from 'react'

/**
 * Progreso de scroll de la página, de 0 a 1.
 *
 * El valor se suaviza con una interpolación por frame en vez de usar el valor
 * crudo del scroll. El scroll del navegador llega a saltos —sobre todo con
 * rueda de ratón— y mover una cámara con él directamente produce un viaje a
 * tirones. Suavizarlo es lo que da la sensación de inercia.
 */
export function useScrollProgress({ smoothing = 0.08 } = {}) {
  const [progress, setProgress] = useState(0)
  const targetRef = useRef(0)
  const currentRef = useRef(0)

  useEffect(() => {
    const read = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      targetRef.current = scrollable > 0 ? window.scrollY / scrollable : 0
    }

    read()
    window.addEventListener('scroll', read, { passive: true })
    window.addEventListener('resize', read)

    let frame = 0
    const tick = () => {
      const next = currentRef.current + (targetRef.current - currentRef.current) * smoothing
      // Se corta por debajo de medio píxel de diferencia para no re-renderizar
      // eternamente por cambios invisibles.
      if (Math.abs(next - currentRef.current) > 0.0002) {
        currentRef.current = next
        setProgress(next)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('scroll', read)
      window.removeEventListener('resize', read)
      cancelAnimationFrame(frame)
    }
  }, [smoothing])

  return progress
}
