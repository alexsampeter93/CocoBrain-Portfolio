import { useEffect, useState } from 'react'

/**
 * Proporción de la ventana, medida sobre `window` y no sobre el canvas.
 *
 * Parece lo mismo y no lo es. El tamaño que reporta React Three Fiber es el
 * del canvas, y el canvas vive dentro del elemento que ScrollTrigger fija y
 * suelta al entrar y salir del recorrido. En cada una de esas transiciones el
 * elemento cambia de posicionamiento y su tamaño se recalcula.
 *
 * Consecuencia: al volver hacia arriba, el encuadre del personaje se
 * recalculaba con un tamaño ligeramente distinto y se descolocaba. La ventana,
 * en cambio, solo cambia cuando cambia de verdad.
 */
export function useViewportAspect() {
  const [aspect, setAspect] = useState(() =>
    typeof window === 'undefined' ? 1.6 : window.innerWidth / window.innerHeight,
  )

  useEffect(() => {
    let frame

    const measure = () => {
      cancelAnimationFrame(frame)
      // Un frame de margen: en móvil, al aparecer o esconderse la barra del
      // navegador, `resize` salta varias veces seguidas.
      frame = requestAnimationFrame(() => setAspect(window.innerWidth / window.innerHeight))
    }

    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  }, [])

  return aspect
}
