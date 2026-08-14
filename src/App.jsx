import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Scene from './components/three/Scene'
import { MASCOT_MODELS } from './components/three/Mascot3D'
import Preloader from './components/ui/Preloader'
import Hud from './components/ui/Hud'
import { getCalmMode, subscribeCalmMode, toggleCalmMode } from './state/calmMode'
import { useScrollProgress } from './hooks/useScrollProgress'
import { sections } from './data/sections'

// Alturas de pantalla que dura el recorrido hasta el interior del cerebro.
const JOURNEY_SCREENS = 2.5

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

/**
 * Avisa de si un elemento esta a la vista.
 *
 * Se usa para apagar el bucle de render de WebGL cuando la portada sale de
 * pantalla. Sin esto la GPU sigue dibujando la escena entera debajo del
 * contenido, y en movil eso se nota en el scroll enseguida.
 */
function useOnScreen(ref) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '10% 0px' },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return visible
}

export default function App() {
  const model = useSelectedModel()
  const wide = useWideLayout()
  const calm = useSyncExternalStore(subscribeCalmMode, getCalmMode, () => false)

  const heroRef = useRef(null)
  const heroVisible = useOnScreen(heroRef)

  // Contador, no booleano: cada incremento dispara el salto de nuevo aunque
  // se pulse dos veces seguidas.
  const [reaction, setReaction] = useState(0)
  const poke = useCallback(() => setReaction((value) => value + 1), [])

  const goToSection = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // Un solo valor manda sobre todo el recorrido: camara, portada e interior.
  const journey = useScrollProgress({ screens: JOURNEY_SCREENS })
  const heroTextFade = Math.max(0, 1 - journey / 0.26)
  const insideTextFade = Math.max(0, Math.min(1, (journey - 0.55) / 0.15))

  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      <Preloader />

      <Hud
        sections={sections}
        onSelect={goToSection}
        onClose={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        calm={calm}
        onToggleCalm={toggleCalmMode}
      />

      {/*
        La escena vive DENTRO de la portada, no fija sobre toda la pagina.
        Antes estaba fija y su opacidad, su camara y el contenido se movian
        con el mismo valor de scroll: tres animaciones peleandose y ninguna
        limpia. Asi la portada se va con el scroll, sin coreografia que
        sincronizar y sin nada que se solape.
      */}
      <section ref={heroRef} className="relative" style={{ height: `${JOURNEY_SCREENS * 100}vh` }}>
        <div className="sticky top-0 h-[100dvh] overflow-hidden">
          <div className="absolute inset-0" aria-hidden="true">
            <Suspense fallback={null}>
              <Scene
                model={model}
                compact={!wide}
                reaction={reaction}
                onPoke={poke}
                active={heroVisible}
                progress={journey}
                sections={sections}
                onSelectSection={goToSection}
              />
            </Suspense>
          </div>

          {/* Texto de portada. Se desvanece con el mismo valor que mueve la
              camara, asi que no puede ir a destiempo. */}
          <div
            className="absolute inset-x-0 bottom-24 px-6 transition-opacity duration-150 sm:px-10 lg:top-1/2 lg:bottom-auto lg:-translate-y-1/2"
            style={{ opacity: heroTextFade, pointerEvents: heroTextFade < 0.4 ? 'none' : 'auto' }}
          >
            <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-[20rem] sm:max-w-[26rem] lg:max-w-[24rem]">
            <h1 className="text-[clamp(1.9rem,7vw,3.6rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
              Alex
              <span className="block text-coco-light">desarrollo web</span>
            </h1>

            <p className="mt-5 text-[15px] leading-[1.45] sm:mt-7 sm:text-[17px] sm:leading-[1.5]">
              Nuestra mayor <em className="not-italic text-coco-light">inspiración</em> fue una
              vez nuestra mayor <em className="not-italic text-coco-light">debilidad</em>.
            </p>

            <p className="mt-3 text-[14px] leading-relaxed text-coco-mid sm:mt-4 sm:text-[15px]">
              Construyo webs y aplicaciones, y las firmo como CocoBrain.
            </p>

            <a
              href="#contenido"
              className="mt-7 inline-block border-b-2 border-coco-dark pb-1 text-[14px] font-medium transition-colors hover:border-brain-glow hover:text-brain-glow sm:text-[15px]"
            >
              Ver proyectos
            </a>
              </div>
            </div>
          </div>

          {/* Aviso de dentro del cerebro. */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-20 px-6 transition-opacity duration-150 sm:px-10"
            style={{ opacity: insideTextFade }}
          >
            <p className="mx-auto max-w-6xl font-mono text-[12px] text-coco-mid">
              Toca un nodo para ir a su sección.
            </p>
          </div>
        </div>
      </section>

      <main id="contenido" className="relative">
        {sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-20 border-t border-coco-light/40 px-6 py-20 sm:px-10 sm:py-24"
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:gap-16">
              <div className="md:w-56 md:shrink-0">
                <span className="font-mono text-[11px] text-coco-mid">
                  {section.nodeName.replace('node_', 'N')}
                </span>
                <h2 className="mt-2 text-[clamp(1.6rem,5vw,2.6rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
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
