import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Scene from './components/three/Scene'
import { MASCOT_MODELS } from './components/three/Mascot3D'
import Preloader from './components/ui/Preloader'
import Hud from './components/ui/Hud'
import ScrollJourney from './components/ui/ScrollJourney'
import { getCalmMode, subscribeCalmMode, toggleCalmMode } from './state/calmMode'
import { sections, sectionContent } from './data/sections'

// Alturas de pantalla que dura el recorrido hasta el interior del cerebro.
const JOURNEY_SCREENS = 3

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
 * Apaga el bucle de WebGL cuando el recorrido sale de pantalla. Sin esto la
 * GPU sigue dibujando la escena entera debajo del contenido, y en movil eso
 * se nota en el scroll enseguida.
 */
function useOnScreen(ref) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: '15% 0px',
    })

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
  const pinRef = useRef(null)
  const heroTextRef = useRef(null)
  const insideTextRef = useRef(null)
  const heroVisible = useOnScreen(heroRef)

  const [reaction, setReaction] = useState(0)
  const poke = useCallback(() => setReaction((value) => value + 1), [])

  const goToSection = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

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

      <ScrollJourney
        heroRef={heroRef}
        pinRef={pinRef}
        heroTextRef={heroTextRef}
        insideTextRef={insideTextRef}
      />

      {/* ScrollSmoother necesita esta pareja de contenedores. */}
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <section
            ref={heroRef}
            className="relative"
            style={{ height: `${JOURNEY_SCREENS * 100}vh` }}
          >
            <div ref={pinRef} className="h-[100dvh] w-full overflow-hidden">
              <div className="absolute inset-0" aria-hidden="true">
                <Suspense fallback={null}>
                  <Scene
                    model={model}
                    compact={!wide}
                    reaction={reaction}
                    onPoke={poke}
                    active={heroVisible}
                    sections={sections}
                    onSelectSection={goToSection}
                  />
                </Suspense>
              </div>

              {/* Las opacidades las escribe ScrollTrigger directamente sobre
                  el estilo, sin pasar por React. */}
              <div
                ref={heroTextRef}
                className="absolute inset-x-0 bottom-24 px-6 sm:px-10 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2"
              >
                <div className="mx-auto w-full max-w-6xl">
                  <div className="max-w-[20rem] sm:max-w-[26rem] lg:max-w-[24rem]">
                    <h1 className="text-[clamp(1.9rem,7vw,3.6rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
                      Alex
                      <span className="block text-coco-light">desarrollo web</span>
                    </h1>

                    <p className="mt-5 text-[15px] leading-[1.45] sm:mt-7 sm:text-[17px]">
                      Nuestra mayor <em className="not-italic text-coco-light">inspiración</em> fue
                      una vez nuestra mayor{' '}
                      <em className="not-italic text-coco-light">debilidad</em>.
                    </p>

                    <p className="mt-3 font-mono text-[11px] text-coco-mid sm:mt-6">
                      Baja para entrar <span aria-hidden="true">↓</span>
                    </p>
                  </div>
                </div>
              </div>

              <div
                ref={insideTextRef}
                className="pointer-events-none absolute inset-x-0 bottom-20 px-6 opacity-0 sm:px-10"
              >
                <p className="mx-auto max-w-6xl font-mono text-[12px] text-coco-mid">
                  Toca un nodo para ir a su sección.
                </p>
              </div>
            </div>
          </section>

          <main id="contenido" className="relative">
            {sections.map((section) => {
              const paragraphs = sectionContent[section.id] ?? []

              return (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-16 border-t border-coco-light/40 px-6 py-20 sm:px-10 sm:py-24"
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
                      {paragraphs.length > 0 ? (
                        paragraphs.map((text) => (
                          <p
                            key={text.slice(0, 24)}
                            className="mb-4 text-[15px] leading-relaxed last:mb-0"
                          >
                            {text}
                          </p>
                        ))
                      ) : (
                        <p className="text-[15px] leading-relaxed text-coco-mid">
                          Contenido pendiente.
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              )
            })}
          </main>
        </div>
      </div>
    </>
  )
}
