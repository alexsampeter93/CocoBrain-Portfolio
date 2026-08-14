import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Scene, { INSIDE_END, SWAP_POINT } from './components/three/Scene'
import { MASCOT_MODELS } from './components/three/Mascot3D'
import Preloader from './components/ui/Preloader'
import Hud from './components/ui/Hud'
import { useDocumentProgress, useScrollProgress } from './hooks/useScrollProgress'
import { getCalmMode, subscribeCalmMode, toggleCalmMode } from './state/calmMode'
import { sections } from './data/sections'

/**
 * TEMPORAL — comparador sin tocar codigo:
 *   /                  → Olaz con el cerebro en la mano
 *   /?model=thinker    → Olaz pensativo
 */
function useSelectedModel() {
  const [url] = useState(() => {
    if (typeof window === 'undefined') return MASCOT_MODELS.brain
    const key = new URLSearchParams(window.location.search).get('model')
    return MASCOT_MODELS[key] ?? MASCOT_MODELS.brain
  })
  return url
}

function useWideLayout() {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  )

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    const onChange = (event) => setWide(event.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return wide
}

// Alturas de pantalla que dura el viaje 3D. El contenido normal empieza
// despues, y anadir mas no descoloca la animacion.
const JOURNEY_SCREENS = 3

/**
 * Franja en la que el fundido tapa el cambio de escena.
 *
 * Estrecha a proposito. Ancha dejaba la pantalla en crema durante casi un
 * segundo de scroll y la transicion se sentia como un tropiezo en vez de
 * como un corte.
 */
const FADE_WIDTH = 0.035

export default function App() {
  const model = useSelectedModel()
  const wide = useWideLayout()
  const progress = useScrollProgress({ screens: JOURNEY_SCREENS })
  const contentProgress = useDocumentProgress({ afterScreens: JOURNEY_SCREENS })
  const calm = useSyncExternalStore(subscribeCalmMode, getCalmMode, () => false)
  const [activeSection, setActiveSection] = useState(null)

  // Contadores, no booleanos: cada incremento dispara la animacion de nuevo
  // aunque se repita el mismo gesto.
  const [reaction, setReaction] = useState(0)
  const [startle, setStartle] = useState(0)
  const startledRef = useRef(false)

  const close = useCallback(() => setActiveSection(null), [])

  /** Pulsar a Olaz le hace saltar. Es la accion de la primera pantalla. */
  const poke = useCallback(() => setReaction((value) => value + 1), [])

  /** Respingo la primera vez que se empieza a bajar. */
  useEffect(() => {
    if (startledRef.current || progress <= 0.015) return
    startledRef.current = true
    setStartle((value) => value + 1)
  }, [progress])

  /**
   * Elegir una seccion.
   *
   * Antes esto abria un panel flotante con el mismo contenido que ya estaba
   * mas abajo en la pagina: la misma informacion dos veces y unos nodos que
   * no llevaban a ninguna parte. Ahora el nodo **es** el enlace — la camara
   * lo enfoca un momento y despues la pagina baja a esa seccion.
   */
  const selectSection = useCallback((id) => {
    setActiveSection(id)
    setReaction((value) => value + 1)

    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(null)
    }, 700)
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [close])

  const active = sections.find((section) => section.id === activeSection)
  const inside = progress >= SWAP_POINT

  const fade = Math.max(0, 1 - Math.abs(progress - SWAP_POINT) / FADE_WIDTH)
  const heroOpacity = Math.max(0, 1 - progress / (SWAP_POINT * 0.6))
  /**
   * Pasado el cerebro la escena no se retira: baja a segundo plano y se
   * queda de fondo del contenido, donde la red crece con el scroll.
   */
  const sceneOpacity = progress > INSIDE_END ? 0.55 : 1

  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      <Preloader />

      <div
        className="fixed inset-0 -z-10 h-[100dvh] w-full transition-opacity duration-300"
        style={{ opacity: sceneOpacity, pointerEvents: sceneOpacity < 0.1 ? 'none' : 'auto' }}
      >
        <Suspense fallback={null}>
          <Scene
            model={model}
            xRatio={wide ? 0.24 : 0}
            sections={sections}
            activeSection={activeSection}
            onSelect={selectSection}
            progress={progress}
            reaction={reaction}
            startle={startle}
            compact={!wide}
            contentProgress={contentProgress}
            onPoke={poke}
          />
        </Suspense>
      </div>

      {/* Fundido que tapa el cambio de escena. */}
      <div
        className="pointer-events-none fixed inset-0 z-30 bg-cream"
        style={{ opacity: fade }}
        aria-hidden="true"
      />

      <Hud
        sections={sections}
        activeSection={activeSection}
        onSelect={selectSection}
        onClose={close}
        calm={calm}
        onToggleCalm={toggleCalmMode}
      />

      {/* Recorrido 3D. pointer-events-none es imprescindible: este contenedor
          cubre el canvas entero y sin ello el raton no llega a la escena. */}
      <div
        className="pointer-events-none relative"
        style={{ height: `${JOURNEY_SCREENS * 100}vh` }}
      >
        {/* En estrecho el texto se va abajo, debajo del personaje. En ancho
            comparte fila con el. */}
        {/* En estrecho el texto ocupa la mitad inferior, con hueco para la
            navegacion; en ancho comparte fila con el personaje. */}
        <div className="sticky top-0 flex h-[100dvh] items-end px-6 pb-24 sm:px-10 lg:items-center lg:pb-0">
          <div className="mx-auto w-full max-w-6xl">
            <div
              className="pointer-events-auto max-w-[22rem] transition-opacity duration-200 sm:max-w-[26rem] lg:max-w-[24rem]"
              style={{ opacity: heroOpacity, pointerEvents: heroOpacity < 0.2 ? 'none' : 'auto' }}
            >
              <h1 className="text-[clamp(1.9rem,7vw,3.6rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
                Alex
                <span className="block text-coco-light">desarrollo web</span>
              </h1>

              <p className="mt-5 text-[15px] leading-[1.45] sm:mt-7 sm:text-[17px] sm:leading-[1.5]">
                Nuestra mayor <em className="not-italic text-coco-light">inspiración</em> fue
                una vez nuestra mayor{' '}
                <em className="not-italic text-coco-light">debilidad</em>.
              </p>

              <p className="mt-3 text-[14px] leading-relaxed text-coco-mid sm:mt-4 sm:text-[15px]">
                Construyo webs y aplicaciones, y las firmo como CocoBrain.
              </p>

              <p className="mt-6 font-mono text-[11px] text-coco-mid sm:mt-10">
                Baja para entrar <span aria-hidden="true">↓</span>
              </p>
            </div>

            {inside && !active && progress < INSIDE_END && (
              <p className="pointer-events-none absolute inset-x-0 bottom-20 max-w-sm font-mono text-[12px] leading-relaxed text-coco-mid">
                Toca un nodo para ir a su sección.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* A partir de aquí, página normal. */}
      {/* Sin fondo opaco: la red crece detras del contenido y tiene que
          verse. La legibilidad la da el degradado del body. */}
      <main id="contenido" className="relative">
        {sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="border-t border-coco-light/40 px-6 py-24 sm:px-10"
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:gap-16">
              <div className="md:w-56 md:shrink-0">
                <span className="font-mono text-[11px] text-coco-mid">
                  {section.nodeName.replace('node_', 'N')}
                </span>
                <h2 className="mt-2 text-[clamp(1.8rem,3vw,2.6rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
                  {section.label}
                </h2>
              </div>
              <div className="max-w-xl">
                <p className="text-[15px] leading-relaxed text-coco-mid">
                  {/* TODO: contenido real desde projects.js y el CV de Alex */}
                  Contenido pendiente.
                </p>
              </div>
            </div>
          </section>
        ))}
      </main>

    </>
  )
}
