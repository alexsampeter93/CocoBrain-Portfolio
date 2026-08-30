import { useEffect, useState } from 'react'

/**
 * Qué área del portfolio se está leyendo ahora mismo.
 *
 * ## Por qué un observador y no el reloj
 *
 * El reloj sabe CUÁNTO llevas leído, no QUÉ. Traducir un 0,43 a "Proyectos"
 * obligaría a meter en la tabla las alturas de unas secciones cuyo tamaño
 * depende del texto que lleven dentro —texto que todavía no existe—. Sería un
 * dato duplicado y desactualizado desde el primer párrafo que se escriba.
 *
 * El navegador ya sabe qué elemento está en pantalla y lo dice gratis. La regla
 * del proyecto es la misma de siempre: si un dato depende de la geometría, se
 * mide; y aquí la geometría es la del documento.
 *
 * `rootMargin` recorta la ventana a su banda central: un área cuenta como
 * activa cuando ocupa el medio de la pantalla, no cuando asoma por el borde.
 * Sin eso, dos secciones consecutivas se turnan la marca mientras se hace
 * scroll y la navegación parpadea.
 */
export function useActiveArea(ids) {
  const [active, setActive] = useState(null)

  useEffect(() => {
    const elements = ids.map((id) => document.getElementById(id)).filter(Boolean)
    if (elements.length === 0) return

    const visible = new Set()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        })

        // Si hay varias en la banda, manda la primera en orden de documento:
        // es la que se está terminando de leer.
        const next = ids.find((id) => visible.has(id)) ?? null
        setActive((current) => (current === next ? current : next))
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [ids])

  return active
}
