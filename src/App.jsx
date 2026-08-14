import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Scene, { INSIDE_END, SWAP_POINT } from './components/three/Scene'
import { MASCOT_MODELS } from './components/three/Mascot3D'
import Preloader from './components/ui/Preloader'
import Hud from './components/ui/Hud'
import { useScrollProgress } from './hooks/useScrollProgress'
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

// Franja en la que el fundido tapa el cambio de escena.
const FADE_WIDTH = 0.07

export default function App() {
  const model = useSelectedModel()
  const wide = useWideLayout()
  const progress = useScrollProgress({ screens: JOURNEY_SCREENS })
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
   * Al elegir una seccion desde la cabecera hay que estar dentro del cerebro:
   * los nodos solo existen ahi. Si aun estamos fuera, se baja primero.
   */
  const selectSection = useCallback((id) => {
    const insideNow = window.scrollY / (window.innerHeight * JOURNEY_SCREENS) >= SWAP_POINT
    if (!insideNow) {
      const target = window.innerHeight * JOURNEY_SCREENS * (SWAP_POINT + 0.06)
      window.scrollTo({ top: target, behavior: 'smooth' })
    }
    setActiveSection(id)
    setReaction((value) => value + 1)
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
  // Al terminar el interior, la escena se retira y la pagina sigue normal.
  const sceneOpacity = Math.max(0, 1 - (progress - INSIDE_END) / 0.12)

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
        progress={progress}
      />

      {/* Recorrido 3D. pointer-events-none es imprescindible: este contenedor
          cubre el canvas entero y sin ello el raton no llega a la escena. */}
      <div
        className="pointer-events-none relative"
        style={{ height: `${JOURNEY_SCREENS * 100}vh` }}
      >
        {/* En estrecho el texto se va abajo, debajo del personaje. En ancho
            comparte fila con el. */}
        <div className="sticky top-0 flex h-[100dvh] items-end px-6 pb-28 sm:px-10 lg:items-center lg:pb-0">
          <div className="mx-auto w-full max-w-6xl">
            <div
              className="pointer-events-auto max-w-[26rem] transition-opacity duration-200 lg:max-w-[24rem]"
              style={{ opacity: heroOpacity, pointerEvents: heroOpacity < 0.2 ? 'none' : 'auto' }}
            >
              <h1 className="text-[clamp(2.4rem,5vw,3.6rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
                Alex
                <span className="block text-coco-light">desarrollo web</span>
              </h1>

              <p className="mt-7 text-[17px] leading-[1.5]">
                Nuestra mayor <em className="not-italic text-coco-light">inspiración</em> fue
                una vez nuestra mayor{' '}
                <em className="not-italic text-coco-light">debilidad</em>.
              </p>

              <p className="mt-4 text-[15px] leading-relaxed text-coco-mid">
                Construyo webs y aplicaciones, y las firmo como CocoBrain.
              </p>

              <p className="mt-10 font-mono text-[11px] text-coco-mid">
                Baja para entrar <span aria-hidden="true">↓</span>
              </p>
            </div>

            {inside && !active && progress < INSIDE_END && (
              <p className="pointer-events-none absolute bottom-24 max-w-sm font-mono text-[12px] leading-relaxed text-coco-mid">
                Estás dentro. Cada nodo es una sección.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* A partir de aquí, página normal. */}
      <main id="contenido" className="relative bg-cream">
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

      {/* Panel de sección, solo mientras se está dentro del cerebro. */}
      {active && inside && progress < INSIDE_END && (
        <div className="pointer-events-none fixed inset-0 z-20 flex items-end px-6 pb-24 sm:px-10">
          <div className="pointer-events-auto mx-auto w-full max-w-6xl">
            <div className="max-w-md border-l border-coco-light pl-5">
              <span className="font-mono text-[11px] text-coco-mid">
                {active.nodeName.replace('node_', 'NODO N')}
              </span>
              <h2 className="mt-2 text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
                {active.label}
              </h2>
              <button
                type="button"
                onClick={close}
                className="mt-5 font-mono text-[12px] text-coco-dark transition-colors hover:text-brain-glow"
              >
                ← Volver <span className="text-coco-mid">[ESC]</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
