import { useEffect, useRef } from 'react'

/**
 * Posición del cursor normalizada a [-1, 1], escuchando en `window`.
 *
 * No se usa el `pointer` que ofrece react-three-fiber a propósito: ese solo
 * se actualiza con eventos que llegan al canvas, y basta con que cualquier
 * capa de la interfaz quede por encima para que deje de moverse sin avisar.
 * Escuchando en la ventana, el seguimiento funciona pase lo que pase por
 * delante.
 *
 * Devuelve una ref, no estado: esto se lee dentro del bucle de render y no
 * debe provocar un re-render por cada píxel que se mueve el ratón.
 */
export function usePointer() {
  const pointer = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (event) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return pointer
}
