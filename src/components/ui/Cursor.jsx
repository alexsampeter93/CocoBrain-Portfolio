import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

/**
 * ── EL CURSOR: EL MISMO NODO, PRESTADO AL PUNTERO (fase 12F) ────────────────
 *
 * `usePrefersReducedMotion` ya combina el sistema y "cabeza despejada" — ver
 * `hooks/usePrefersReducedMotion.js` — así que basta un solo `if`: con
 * cualquiera de los dos, este componente no suscribe un solo listener y el
 * cursor del sistema sigue siendo el único que existe.
 *
 * ## Por qué solo `<main>`, y cómo se sabe que el puntero está dentro
 *
 * Alex lo pidió así: el editorial tiene un lenguaje propio de nodo y acento;
 * la portada y el recorrido son la escena de Olaz y no admiten una capa de
 * interfaz encima. `<main id="contenido">` es ese límite, y comprobarlo con
 * `pointerenter`/`pointerleave` no basta: esos eventos solo se disparan con
 * el ratón en movimiento, y aquí se entra en el editorial sobre todo
 * SCROLLEANDO con el cursor quieto. Por eso la comprobación —¿el punto
 * (x, y) cae dentro del rectángulo actual de `main`?— se repite en dos
 * disparadores: el propio movimiento y el scroll, con la última posición
 * conocida.
 *
 * ## Un dueño por propiedad, otra vez
 *
 * GSAP es el único que escribe `x`/`y`, y los escribe en la RAÍZ —con
 * `quickTo`, la misma pieza que ya usa `useVelocityPlane`—, nunca en el
 * punto. El punto y la palabra son hijos con su propio desplazamiento fijo
 * en CSS: si el `transform` de posición se escribiera en el punto, la
 * palabra —que no lo comparte— se quedaría clavada en la esquina de la
 * pantalla. Ya pasó, medido: la palabra "Ver" aparecía en `x≈13px` fuera
 * de donde estaba el ratón, porque solo el punto se movía.
 *
 * El ESTADO (reposo, enlace, botón, ampliar) lo escribe esta misma función
 * pero en un atributo `data-state` de la raíz, y quien traduce ese atributo
 * en escala, halo y palabra es CSS. Ningún estado pisa la posición y la
 * posición no sabe nada del estado.
 *
 * ## Y la palabra la declara el elemento, no un mapa fijo aquí
 *
 * `data-cursor="button"` + `data-cursor-label="Cerrar"` en el propio botón —
 * el mismo patrón que ya usa `data-cursor="view"` en las capturas y en la
 * hoja del CV, ahora con su palabra también en un atributo en vez de a
 * medias en un mapa de este archivo. Añadir un botón nuevo con su propia
 * palabra es una línea en su JSX, no una entrada más aquí.
 *
 * ## Y solo BOTONES, no enlaces (petición de Alex)
 *
 * Un `<a>` que sale de la página ya dice hacia dónde va con su propio texto
 * y con la flecha que 12A le puso — "LinkedIn ↗" no necesita que el cursor
 * repita "Ir". Un botón cierra, copia, abre una tarjeta: acciones que no
 * llevan destino escrito al lado, y ahí es donde la palabra del cursor
 * aporta algo que el control no dice ya por sí mismo.
 */
function classify(target) {
  if (!target || !(target instanceof Element)) return { state: 'default', label: '' }
  const marked = target.closest('[data-cursor]')
  if (marked) return { state: marked.dataset.cursor, label: marked.dataset.cursorLabel ?? '' }
  if (target.closest('a, button, [role="button"]')) return { state: 'link', label: '' }
  return { state: 'default', label: '' }
}

export default function Cursor() {
  const rootRef = useRef(null)
  const labelRef = useRef(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const main = document.getElementById('contenido')
    const root = rootRef.current
    if (!main || !root) return

    const setX = gsap.quickTo(root, 'x', { duration: 0.32, ease: 'power3' })
    const setY = gsap.quickTo(root, 'y', { duration: 0.32, ease: 'power3' })

    let visible = false
    let state = 'default'
    let label = ''
    const last = { x: -1, y: -1 }

    const paint = (x, y, target) => {
      const rect = main.getBoundingClientRect()
      /*
        El visor de medios es un portal en `document.body`, fuera de
        `<main>` en el árbol — pero su ventana ocupa el mismo trozo de
        pantalla que el editorial que hay debajo, así que la comprobación
        puramente geométrica lo daría por dentro igualmente. Y sus propios
        controles son `<button>` de toda la vida, con el `cursor: pointer`
        del navegador sin que nadie lo haya quitado: los dos cursores a la
        vez sobre "Cerrar" es justo el ruido que este cambio quiere evitar.
        Mientras el diálogo esté abierto, manda el nativo.
      */
      const dialog = target instanceof Element && target.closest('[role="dialog"]')
      const inside = !dialog && y >= rect.top && y <= rect.bottom && x >= rect.left && x <= rect.right

      if (!inside) {
        if (visible) {
          visible = false
          root.classList.remove('cb-cursor-visible')
          // Se apaga el nativo A LA VEZ que se enciende el propio, nunca
          // antes: si `main` lo apagara desde el montaje, quien cargara la
          // página con el ratón ya puesto encima vería un hueco sin ningún
          // cursor hasta el primer movimiento.
          main.classList.remove('cb-cursor-active')
        }
        return
      }

      if (!visible) {
        visible = true
        root.classList.add('cb-cursor-visible')
        main.classList.add('cb-cursor-active')
        // Se coloca sin interpolar la primera vez: si no, llega deslizándose
        // desde donde estuviera antes de cruzar el borde de `main`.
        gsap.set(root, { x, y })
      } else {
        setX(x)
        setY(y)
      }

      const next = classify(target)
      // El estado Y la palabra, por separado: pasar de un botón a OTRO botón
      // no cambia el estado —los dos son "button"— pero sí la palabra, y las
      // dos comprobaciones hacen falta para no perderse ese caso.
      if (next.state !== state) {
        state = next.state
        root.dataset.state = state
      }
      if (next.label !== label) {
        label = next.label
        if (labelRef.current) labelRef.current.textContent = label
      }
    }

    const onMove = (event) => {
      last.x = event.clientX
      last.y = event.clientY
      paint(event.clientX, event.clientY, event.target)
    }

    // El scroll no mueve el ratón, pero sí lo que hay debajo de él: al entrar
    // en el editorial bajando con la rueda, sin tocar el ratón, `main` pasa a
    // ocupar el punto donde el puntero ya estaba.
    const onScroll = () => {
      if (last.x < 0) return
      paint(last.x, last.y, document.elementFromPoint(last.x, last.y))
    }

    const onDown = () => root.classList.add('cb-cursor-pressed')
    const onUp = () => root.classList.remove('cb-cursor-pressed')

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('pointercancel', onUp, { passive: true })

    return () => {
      main.classList.remove('cb-cursor-active')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [reduced])

  return (
    <div ref={rootRef} className="cb-cursor" data-state="default" aria-hidden="true">
      <span className="cb-cursor-dot" />
      <span ref={labelRef} className="cb-cursor-label" />
    </div>
  )
}
