import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { areaStamp } from '../../data/sections'
import { Icon } from '../ui/Icon'

/**
 * ── EL VISOR: LA LÁMINA SE DESPEGA DE LA MESA ───────────────────────────────
 *
 * El abanico de `ProjectsArea` ya trata cada captura como una lámina física
 * apoyada sobre una mesa: girada un grado y pico, con su propia sombra. Este
 * visor no inventa un lenguaje nuevo — hace que, al pulsarla, esa lámina se
 * despegue de donde estaba y se convierta en lo que se está mirando de cerca.
 *
 * ## No hay una segunda fuente de datos
 *
 * El visor recibe el MISMO array `media` que dibuja el abanico y el índice del
 * elemento pulsado. Si se añade una captura a un proyecto, el visor la tiene.
 *
 * ## La apertura es un FLIP, no un fundido
 *
 * `open()` recibe también el elemento del DOM que se pulsó. La imagen del
 * visor se monta ya en su sitio de reposo (centrada, a su tamaño) y se le
 * escribe un `transform` inicial calculado contra el rectángulo de origen —
 * la misma técnica que ya usa `useStage` para recoger el abanico sobre el
 * montón: medir con `getBoundingClientRect`, nunca clonar el nodo.
 *
 * El elemento que se mide y se transforma es la propia imagen o el propio
 * vídeo — no un envoltorio a tamaño del escenario. Envolver haría que la caja
 * medida fuera la del hueco entero, no la de la lámina realmente pintada
 * dentro de él, y el vuelo llegaría al tamaño equivocado. Aquí no hace falta
 * la separación en capas que sí necesita `MediaItem` en el editorial —ahí
 * compiten CSS, GSAP y el puntero por el mismo nodo a la vez—: en el visor
 * solo hay UNA cosa escribiendo `transform` en cada momento, así que un solo
 * elemento puede llevar posición, escala y giro juntos.
 *
 * ## Y va en un portal, por una razón concreta
 *
 * La ficha de un proyecto abre su propio contexto de apilado (`.composition`,
 * con `isolation: isolate`), así que un elemento pintado ahí dentro NO puede
 * salir por delante del HUD ni del grano por mucho `z-index` que se le ponga.
 * Colgando del `body` no hay contexto que lo encierre.
 */

const ViewerContext = createContext(null)

/** Abre el visor desde cualquier sitio: `open(media, índice, meta)`. */
export function useMediaViewer() {
  return useContext(ViewerContext)
}

/** ¿Es algo que el visor puede enseñar? Una escena 3D pendiente, no. */
export const canView = (item) => Boolean(item?.src) && (item.kind === 'image' || item.kind === 'video')

export function MediaViewerProvider({ children }) {
  const [state, setState] = useState(null)
  /**
   * `meta.originEl` es el elemento realmente pulsado — el botón de
   * `ExpandButton`, del tamaño exacto de la lámina—. `meta.area` y
   * `meta.title` son datos reales del proyecto, no algo que el visor decida:
   * el sello sale de `areaStamp`, la misma tabla que ya firma el encabezado de
   * cada área.
   */
  const open = useCallback((items, index, meta) => {
    const list = (items ?? []).filter(canView)
    if (list.length === 0) return
    const wanted = items[index]
    const at = Math.max(0, list.indexOf(wanted))
    setState({ list, at, meta: meta ?? null })
  }, [])
  const close = useCallback(() => setState(null), [])

  const value = useMemo(() => ({ open, close }), [open, close])

  return (
    <ViewerContext.Provider value={value}>
      {children}
      {state && (
        <Viewer list={state.list} start={state.at} meta={state.meta} onClose={close} />
      )}
    </ViewerContext.Provider>
  )
}

/** Cuánto hay que arrastrar para que cuente como pasar de pieza. */
const SWIPE = 60

/** El hueco por defecto de una lámina — el mismo que usa `ProjectsArea`. */
const FALLBACK_RATIO = '16 / 10'

/*
  ── LOS NÚMEROS DEL GESTO ────────────────────────────────────────────────

  Pocos, y cada uno con un trabajo. La apertura es la más lenta porque es la
  única vez que ocurre por proyecto; cambiar de imagen se repite, así que va
  más rápido — y cerrar, más rápido todavía: soltar algo pesa menos que
  cogerlo.
*/
const OPEN_DUR = 0.62
const NAV_DUR = 0.42
const CLOSE_DUR = 0.46
/** Cuánto se desplaza una lámina al entrar o salir en la navegación. */
const NAV_SHIFT = 64
/** Y cuánto gira al hacerlo — el mismo orden de magnitud que el abanico. */
const NAV_ROT = 1.3
/** El asentamiento genérico del fallback: sube y llega, sin volar de ningún sitio. */
const FALLBACK_RISE = 24

/**
 * ── EL RECTÁNGULO DE LLEGADA SE CALCULA, NO SE PREGUNTA ─────────────────────
 *
 * El vuelo necesita saber a qué caja llega, y preguntárselo al propio elemento
 * NO SIRVE cuando lo que se abre es un vídeo: en `useLayoutEffect` el navegador
 * todavía no conoce su tamaño intrínseco —los metadatos no han llegado— y
 * devuelve una caja de tres píxeles. Medido con la caché fría: la escala de
 * partida salía 216 en vez de 0,6, y el vídeo entraba ocupando 277.000 px de
 * ancho y tardaba segundos en encogerse hasta su sitio.
 *
 * Con una imagen no pasaba porque su archivo ya está descodificado —se acaba de
 * pulsar—, y por eso el fallo solo aparecía en los proyectos cuyo primer medio
 * es un vídeo. Los tres lo son.
 *
 * Así que la caja se DEDUCE: el hueco del escenario —que es `absolute inset-0`
 * y por tanto mide siempre— y la proporción declarada del elemento. Es la misma
 * cuenta que hace `object-fit: contain`, hecha con dos números que existen
 * desde el primer frame.
 */
function landing(media, ratio) {
  const host = media?.parentElement
  if (!host) return null
  const box = host.getBoundingClientRect()
  if (box.width <= 0 || box.height <= 0) return null
  const [w, h] = String(ratio ?? FALLBACK_RATIO).split('/').map((n) => Number(n.trim()))
  const aspect = w > 0 && h > 0 ? w / h : 1.6
  const width = Math.min(box.width, box.height * aspect)
  const height = width / aspect
  return {
    left: box.left + (box.width - width) / 2,
    top: box.top + (box.height - height) / 2,
    width,
    height,
  }
}

/** Una escala de vuelo creíble. Fuera de aquí no se vuela: se asienta. */
const plausible = (s) => Number.isFinite(s) && s > 0.02 && s < 8

/** ¿Se puede medir de verdad, o está fuera del documento / oculto? */
function canMeasure(el) {
  return Boolean(el) && typeof el.getClientRects === 'function' && el.getClientRects().length > 0
}

/**
 * El rectángulo de origen y su rotación, leídos en el momento — nunca
 * guardados de antes. La página no se mueve mientras el visor está abierto
 * (el scroll se traga la rueda y el arrastre), así que el elemento de origen
 * sigue exactamente donde estaba... salvo que un cambio de ventana lo haya
 * apagado (el abanico solo vive en escritorio, la columna solo en móvil). Si
 * no se puede medir, se devuelve `null` y quien llama usa el fallback limpio
 * en vez de inventar una posición.
 */
function readOrigin(el) {
  if (!canMeasure(el)) return null
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null
  // La rotación del abanico vive en `data-rot`, en el envoltorio de la lámina
  // — no en el propio botón. El hero no tiene ninguna: gira 0.
  const rotEl = el.closest('[data-rot]')
  const rot = rotEl ? Number(rotEl.dataset.rot) || 0 : 0
  return { rect, rot }
}

const formatCounter = (index, total) => `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`

/**
 * Una pieza en su forma real — imagen o vídeo—, con el hueco reservado por
 * CSS antes de que el recurso cargue.
 *
 * ── POR QUÉ LLEVA `aspectRatio` EN LÍNEA ────────────────────────────────
 *
 * El vuelo de apertura mide el rectángulo de LLEGADA de este mismo elemento
 * (`getBoundingClientRect`) para calcular el `transform` inicial, y esa
 * medición ocurre en `useLayoutEffect` — antes de que el navegador pinte,
 * pero no necesariamente antes de que la imagen haya decodificado. Un
 * `<img>` sin tamaño reservado mide 0×0 hasta que carga, y el vuelo saldría
 * mal. `aspectRatio` fija el hueco por CSS de inmediato, con el mismo dato
 * (`item.ratio`) que ya usa `ProjectsArea` para esta misma captura: origen y
 * destino comparten fuente, así que no hay descuadre que corregir.
 *
 * Y es directo hijo del escenario a tamaño completo (`figure`), no de un
 * envoltorio sin altura propia: un `max-height` en porcentaje solo significa
 * algo si su padre inmediato tiene una altura definida. Por eso `figure` es
 * quien ocupa el escenario entero y esta pieza cuelga de él sin nada en
 * medio.
 */
function MediaFace({ item, mediaRef }) {
  const reduced = usePrefersReducedMotion()
  const box = item?.ratio ?? FALLBACK_RATIO

  if (item?.kind === 'video') {
    return (
      <video
        ref={mediaRef}
        key={item.src}
        src={item.src}
        poster={item.poster || undefined}
        controls
        autoPlay={!reduced}
        muted
        loop
        playsInline
        aria-label={item.alt || undefined}
        style={{ aspectRatio: box }}
        className="max-h-full max-w-full border border-rule bg-surface object-contain"
      />
    )
  }

  return (
    <img
      ref={mediaRef}
      key={item.src}
      src={item.src}
      alt={item.alt || ''}
      style={{ aspectRatio: box }}
      className="max-h-full max-w-full border border-rule object-contain"
    />
  )
}

function Viewer({ list, start, meta, onClose }) {
  const [at, setAt] = useState(start)
  // `pending` solo existe mientras una navegación está en el aire: el índice
  // al que se va y de qué lado viene. Fuera de ahí, `pending` es null y solo
  // se dibuja UNA lámina — la comprometida, `at`.
  const [pending, setPending] = useState(null)
  const reduced = usePrefersReducedMotion()

  const overlay = useRef(null)
  const panel = useRef(null)
  const currentRef = useRef(null)
  const incomingRef = useRef(null)
  const counterRef = useRef(null)
  const captionRef = useRef(null)
  const closeButton = useRef(null)
  const restoreTo = useRef(null)
  const drag = useRef(null)
  const tl = useRef(null)
  const closingRef = useRef(false)
  const preloaded = useRef(new Set())

  const item = list[at]
  const incomingItem = pending ? list[pending.index] : null
  const many = list.length > 1
  const stamp = meta?.area ? areaStamp[meta.area] : null

  const go = useCallback(
    (delta) => {
      if (closingRef.current || !many) return
      tl.current?.kill()
      tl.current = null
      const nextIndex = (at + delta + list.length) % list.length
      setPending({ index: nextIndex, dir: delta > 0 ? 1 : -1 })
    },
    [at, many, list.length],
  )

  /*
    ── EL FOCO: SE CAPTURA, SE ENCIERRA Y SE DEVUELVE ──────────────────────
    Sin cambios de fondo respecto al visor anterior — solo que ahora "se
    devuelve" ocurre al EMPEZAR a cerrar (`requestClose`), no al desmontar:
    el desmontaje ya no es instantáneo.
  */
  useEffect(() => {
    restoreTo.current = document.activeElement
    closeButton.current?.focus()
    return () => {
      // Red de seguridad: si el componente se desmontase sin pasar por
      // `requestClose` — no debería ocurrir, pero un foco perdido es peor
      // que una comprobación de más—.
      if (!closingRef.current) restoreTo.current?.focus?.()
      tl.current?.kill()
    }
  }, [])

  /**
   * ── SE CIERRA UNA VEZ, Y EL VUELO ES LA MITAD QUE FALTABA ───────────────
   *
   * `onClose` (del contexto) desmonta el visor al instante — eso sigue igual.
   * Lo que cambia es que ya no se llama directamente: `requestClose` mide el
   * origen, reproduce el vuelo inverso y SOLO ENTONCES llama a `onClose`. Si
   * el origen ya no se puede medir —la ventana cambió de escritorio a móvil
   * mientras el visor estaba abierto, por ejemplo— se usa un cierre genérico
   * en vez de volar hacia una posición inventada.
   */
  const requestClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    tl.current?.kill()
    tl.current = null
    // Si había una navegación en el aire, se descarta sin animarla: cerrar
    // gana. La lámina comprometida (`at`) es la que se despide.
    setPending(null)

    restoreTo.current?.focus?.()

    const overlayEl = overlay.current
    const media = currentRef.current

    const finish = () => onClose()

    if (!overlayEl) {
      finish()
      return
    }

    const metaTargets = gsap.utils.toArray('[data-viewer-meta]', overlayEl)

    if (reduced) {
      gsap.to(overlayEl, { opacity: 0, duration: 0.12, onComplete: finish })
      return
    }

    const timeline = gsap.timeline({ onComplete: finish })
    tl.current = timeline

    timeline.to(metaTargets, { y: -10, opacity: 0, duration: 0.16, stagger: 0.02, ease: 'power1.in' }, 0)

    const origin = media ? readOrigin(meta?.originEl) : null

    if (origin && media) {
      const toRect = landing(media, item?.ratio) ?? media.getBoundingClientRect()
      const dx = origin.rect.left - toRect.left
      const dy = origin.rect.top - toRect.top
      const sx = origin.rect.width / toRect.width
      const sy = origin.rect.height / toRect.height

      timeline.to(
        media,
        { x: dx, y: dy, scaleX: sx, scaleY: sy, rotate: origin.rot, opacity: 0.9, duration: CLOSE_DUR, ease: 'power2.in' },
        0.04,
      )
    } else if (media) {
      // Fallback limpio: se apaga en su sitio, sin fingir de dónde vino.
      timeline.to(media, { y: FALLBACK_RISE * 0.6, opacity: 0, scale: 0.97, duration: 0.3, ease: 'power2.in' }, 0.04)
    }

    timeline.to(overlayEl, { opacity: 0, duration: 0.22, ease: 'power1.in' }, CLOSE_DUR * 0.55)
  }, [meta, onClose, reduced])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
        return
      }
      if (closingRef.current) return
      if (event.key === 'ArrowRight' && many) go(1)
      if (event.key === 'ArrowLeft' && many) go(-1)
      if (event.key !== 'Tab') return

      const focusables = panel.current?.querySelectorAll(
        'button, [href], video[controls], [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables?.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [go, many, requestClose])

  /*
    ── LA PÁGINA DE DEBAJO NO SE MUEVE ──────────────────────────────────────
    Sin cambios: el velo se come la rueda y el arrastre en vez de bloquear el
    scroll del documento, que aquí tiene la pista fijada con ScrollTrigger.
  */
  useEffect(() => {
    const el = overlay.current
    if (!el) return
    const swallow = (event) => event.preventDefault()
    el.addEventListener('wheel', swallow, { passive: false })
    el.addEventListener('touchmove', swallow, { passive: false })
    return () => {
      el.removeEventListener('wheel', swallow)
      el.removeEventListener('touchmove', swallow)
    }
  }, [])

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse') return
    drag.current = event.clientX
  }
  const onPointerUp = (event) => {
    if (drag.current === null || !many || closingRef.current) return
    const delta = event.clientX - drag.current
    drag.current = null
    // El gesto real decide el lado: swipe a la izquierda es "siguiente",
    // exactamente la misma dirección que ya usa la tecla → y el mismo lado
    // por el que la lámina saliente se irá.
    if (Math.abs(delta) > SWIPE) go(delta < 0 ? 1 : -1)
  }

  /*
    ── EL TEXTO ES DE GSAP, NO DE REACT ─────────────────────────────────────
    El mismo principio que ya usa `AreaIndex` en el HUD: si React escribiera
    el contador o el pie desde `at`, el número cambiaría ANTES de que
    empezara a moverse. Se pinta una vez al montar y a partir de ahí solo lo
    toca la línea de tiempo de la navegación.
  */
  useLayoutEffect(() => {
    if (counterRef.current) counterRef.current.textContent = many ? formatCounter(start, list.length) : ''
    if (captionRef.current) captionRef.current.textContent = list[start]?.alt || ''
    // Deliberado: solo al montar. El resto del ciclo de vida lo escribe la
    // línea de tiempo de `go()`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /*
    ── LA APERTURA: LA LÁMINA SE DESPEGA ─────────────────────────────────────
    Se mide una sola vez, al montar. `readOrigin` puede devolver `null` — la
    ventana cambió de anchura entre el clic y este frame, por ejemplo— y en
    ese caso se usa el asentamiento genérico en vez de fingir una procedencia.
  */
  useLayoutEffect(() => {
    const overlayEl = overlay.current
    const media = currentRef.current
    if (!overlayEl || !media) return

    const ctx = gsap.context(() => {
      const metaTargets = gsap.utils.toArray('[data-viewer-meta]', overlayEl)

      if (reduced) {
        gsap.set(overlayEl, { opacity: 1 })
        gsap.set(media, { clearProps: 'transform,opacity' })
        gsap.set(metaTargets, { clearProps: 'transform,opacity' })
        return
      }

      gsap.set(overlayEl, { opacity: 0 })
      gsap.set(metaTargets, { y: 12, opacity: 0 })

      const timeline = gsap.timeline()
      tl.current = timeline

      timeline.to(overlayEl, { opacity: 1, duration: 0.22, ease: 'power1.out' }, 0)

      const origin = readOrigin(meta?.originEl)
      const toRect = landing(media, item?.ratio)
      const dx = origin && toRect ? origin.rect.left - toRect.left : 0
      const dy = origin && toRect ? origin.rect.top - toRect.top : 0
      const sx = origin && toRect ? origin.rect.width / toRect.width : 1
      const sy = origin && toRect ? origin.rect.height / toRect.height : 1

      if (origin && toRect && plausible(sx) && plausible(sy)) {
        gsap.set(media, { transformOrigin: 'top left' })

        // Posición y giro llevan la misma prisa —salen deprisa, llegan
        // frenando—; la escala se deja pasarse un pelo antes de asentar, el
        // mismo lenguaje que ya usa `MOTION.SETTLE` en las capturas del
        // editorial, aquí aplicado al vuelo entero en vez de a un zoom.
        timeline.fromTo(
          media,
          { x: dx, y: dy, rotate: origin.rot },
          { x: 0, y: 0, rotate: 0, duration: OPEN_DUR, ease: 'power3.out' },
          0,
        )
        timeline.fromTo(
          media,
          { scaleX: sx, scaleY: sy },
          { scaleX: 1, scaleY: 1, duration: OPEN_DUR + 0.1, ease: 'back.out(1.6)' },
          0,
        )
        timeline.fromTo(media, { opacity: 0.92 }, { opacity: 1, duration: OPEN_DUR * 0.4 }, 0)
        timeline.call(
          () => gsap.set(media, { clearProps: 'x,y,rotate,scaleX,scaleY,opacity,transformOrigin' }),
          null,
          OPEN_DUR + 0.1,
        )
        timeline.to(
          metaTargets,
          { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out' },
          OPEN_DUR * 0.55,
        )
      } else {
        // Fallback limpio: sube y llega, sin coordenadas inventadas.
        timeline.fromTo(
          media,
          { y: FALLBACK_RISE, opacity: 0, scale: 0.97 },
          { y: 0, opacity: 1, scale: 1, duration: 0.44, ease: 'power2.out' },
          0,
        )
        timeline.to(metaTargets, { y: 0, opacity: 1, duration: 0.36, stagger: 0.05, ease: 'power2.out' }, 0.16)
      }
      // Se pasa el nodo ya desenvuelto, no la ref: es la misma convención que
      // ya usan `useReveal`/`useStage` en `animations/motion.js`.
    }, overlayEl)

    return () => ctx.revert()
    // Solo al montar: `originEl` no cambia durante la vida del visor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /*
    ── EL CAMBIO DE IMAGEN: DOS LÁMINAS, UNA COREOGRAFÍA ────────────────────
    Se dispara cuando `pending` deja de ser null. La saliente se aparta hacia
    el lado contrario al que se avanza; la entrante llega desde ahí, con el
    mismo par escala/rotación que ya usa la apertura. Contador y pie cambian
    con el gesto de folio que ya usa `AreaIndex`: sale por arriba, entra por
    abajo, y el texto lo escribe GSAP en el punto medio.
  */
  useLayoutEffect(() => {
    if (!pending) return
    const outEl = currentRef.current
    const inEl = incomingRef.current
    if (!inEl) return

    const dir = pending.dir
    const counterEl = counterRef.current
    const captionEl = captionRef.current
    const nextCounter = many ? formatCounter(pending.index, list.length) : ''
    const nextCaption = list[pending.index]?.alt || ''

    if (reduced) {
      if (counterEl) counterEl.textContent = nextCounter
      if (captionEl) captionEl.textContent = nextCaption
      gsap.set(inEl, { opacity: 1, x: 0, rotate: 0, scale: 1 })
      if (outEl) gsap.set(outEl, { opacity: 0 })
      setAt(pending.index)
      setPending(null)
      return
    }

    const ctx = gsap.context(() => {
      gsap.set(inEl, { x: dir * NAV_SHIFT, rotate: -dir * NAV_ROT, scale: 0.96, opacity: 0 })

      const timeline = gsap.timeline({
        onComplete: () => {
          setAt(pending.index)
          setPending(null)
          tl.current = null
        },
      })
      tl.current = timeline

      if (outEl) {
        timeline.to(
          outEl,
          { x: -dir * NAV_SHIFT, rotate: dir * NAV_ROT, scale: 0.93, opacity: 0, duration: NAV_DUR, ease: 'power2.in' },
          0,
        )
      }
      timeline.to(inEl, { x: 0, rotate: 0, scale: 1, opacity: 1, duration: NAV_DUR, ease: 'power2.out' }, 0.04)

      if (counterEl) {
        timeline
          .to(counterEl, { yPercent: -110, opacity: 0, duration: 0.16, ease: 'power2.in' }, 0.05)
          .call(() => { counterEl.textContent = nextCounter }, null, 0.21)
          .fromTo(counterEl, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.22, ease: 'power3.out' }, 0.21)
      }
      if (captionEl) {
        timeline
          .to(captionEl, { yPercent: -100, opacity: 0, duration: 0.16, ease: 'power2.in' }, 0.05)
          .call(() => { captionEl.textContent = nextCaption }, null, 0.21)
          .fromTo(captionEl, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.22, ease: 'power3.out' }, 0.21)
      }
      // `outEl` no necesita limpieza al terminar: lleva `key={item.src}`, así
      // que en cuanto `at` cambie React lo desmonta entero y monta un nodo
      // fresco para la nueva imagen — no hay transform residual que heredar.
    }, panel.current)

    return () => ctx.revert()
  }, [pending, reduced, many, list])

  /*
    ── PRELOAD: SOLO LO QUE SE PUEDE ALCANZAR DESDE AQUÍ ────────────────────
    Anterior, actual y siguiente — nunca el portfolio entero. Solo imágenes:
    un vídeo ya respeta `preload="metadata"` en su propio marcado, y forzar
    su descarga aquí sería justo la "descarga agresiva" que no se quiere.
  */
  useEffect(() => {
    const cache = preloaded.current
    ;[at - 1, at, at + 1].forEach((raw) => {
      const idx = (raw + list.length) % list.length
      const candidate = list[idx]
      if (!candidate || candidate.kind !== 'image' || !candidate.src) return
      if (cache.has(candidate.src)) return
      cache.add(candidate.src)
      const img = new Image()
      img.src = candidate.src
      if (typeof img.decode === 'function') img.decode().catch(() => {})
    })
  }, [at, list])

  if (!item) return null

  return createPortal(
    <div
      ref={overlay}
      role="dialog"
      aria-modal="true"
      aria-label={item.alt || meta?.title || 'Imagen del proyecto'}
      onClick={requestClose}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      className="viewer fixed inset-0 z-[60] flex flex-col px-gutter py-6"
    >
      <div data-viewer-meta className="flex shrink-0 items-start justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          {meta?.title && (
            <p className="truncate font-meta text-meta uppercase text-ink-faint">{meta.title}</p>
          )}
          {many && (
            <p className="overflow-hidden">
              <span
                ref={counterRef}
                className="block font-meta text-meta uppercase tabular-nums text-ink-faint/70"
              />
            </p>
          )}
        </div>
        <button
          ref={closeButton}
          type="button"
          onClick={requestClose}
          className="link-quiet shrink-0 font-meta text-meta uppercase"
        >
          Cerrar
          <Icon name="close" size="1.05em" className="link-arrow-still" />
        </button>
      </div>

      <div
        ref={panel}
        onClick={(event) => event.stopPropagation()}
        className="relative flex min-h-0 flex-1 items-center justify-center py-4 sm:gap-8"
      >
        {many && (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Anterior"
            className="link-quiet absolute bottom-0 left-2 z-10 px-3 py-4 text-lead leading-none sm:static sm:shrink-0 sm:px-2 sm:py-6"
          >
            <Icon name="prev" size="1em" className="link-arrow-back" />
          </button>
        )}

        {/*
          El escenario: dos láminas como mucho, cada una centrada en el mismo
          hueco. `figure` es quien tiene el tamaño definido —el panel entero—
          para que `MediaFace` pueda medir su `max-height`/`max-width` contra
          algo real; lo que se transforma es la propia imagen de dentro.
        */}
        <div className="relative h-full min-h-0 w-full min-w-0 flex-1">
          <figure className="absolute inset-0 flex h-full w-full items-center justify-center">
            <MediaFace item={item} mediaRef={currentRef} />
          </figure>

          {incomingItem && (
            <figure className="absolute inset-0 flex h-full w-full items-center justify-center">
              <MediaFace item={incomingItem} mediaRef={incomingRef} />
            </figure>
          )}
        </div>

        {many && (
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Siguiente"
            className="link-quiet absolute bottom-0 right-2 z-10 px-3 py-4 text-lead leading-none sm:static sm:shrink-0 sm:px-2 sm:py-6"
          >
            <Icon name="next" size="1em" className="link-arrow-right" />
          </button>
        )}
      </div>

      <div data-viewer-meta className="flex shrink-0 items-end justify-between gap-6">
        <p className="max-w-read overflow-hidden pb-[0.14em]" style={{ marginBottom: '-0.14em' }}>
          <span
            ref={captionRef}
            className="block font-meta text-meta normal-case leading-relaxed text-ink-faint"
          />
        </p>

        {/*
          ── EL SELLO ──────────────────────────────────────────────────────
          El mismo ángulo y radio que ya lleva el encabezado del área en
          `SectionHeading` — no una coordenada inventada para el visor: es
          de dónde viene esta pieza en la constelación.
        */}
        {stamp?.angle != null && (
          <p className="hidden shrink-0 font-meta text-meta tabular-nums text-ink-faint/60 sm:block">
            {stamp.angle}° · r{stamp.radius.replace('.', ',')}
          </p>
        )}
      </div>
    </div>,
    document.body,
  )
}
