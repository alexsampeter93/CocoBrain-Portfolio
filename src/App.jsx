import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import World from './three/World'
import JourneyScroll, { scrollToProgress } from './journey/JourneyScroll'
import StageReadout from './components/ui/StageReadout'
import HeroCopy from './components/ui/HeroCopy'
import Preloader from './components/ui/Preloader'
import Hud from './components/ui/Hud'
import { tokensFor } from './layout/tokens'
import { useCompact } from './layout/useCompact'
import { getCalmMode, subscribeCalmMode, toggleCalmMode } from './state/calmMode'
import { sections, sectionContent } from './data/sections'

/**
 * Alturas de pantalla que dura el recorrido. Cuatro tramos, cuatro pantallas:
 * menos y la entrada al cerebro pasa tan rápido que no se lee.
 */
const JOURNEY_SCREENS = 4

/** Dónde deja la navegación al pulsar un enlace: dentro del universo neuronal. */
const MIND_PROGRESS = 0.85

/**
 * Apaga el bucle de WebGL cuando el recorrido sale de pantalla. Sin esto la
 * GPU sigue dibujando la escena entera debajo del contenido, y en móvil eso se
 * nota en el scroll enseguida.
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
  const compact = useCompact()
  const calm = useSyncExternalStore(subscribeCalmMode, getCalmMode, () => false)

  const trackRef = useRef(null)
  const pinRef = useRef(null)
  const onScreen = useOnScreen(trackRef)

  const tokens = tokensFor(compact)

  /** Pulsar a Olaz le hace saltar. Un contador basta: cada subida es un salto. */
  const [reaction, setReaction] = useState(0)
  const poke = useCallback(() => setReaction((value) => value + 1), [])

  /**
   * Nodo abierto. La información vive en los nodos, así que pulsar uno abre su
   * contenido ahí mismo sin sacarte del espacio 3D. Las secciones de más abajo
   * siguen existiendo porque son el contenido accesible e indexable, y salen
   * de los mismos datos: no hay nada que mantener por duplicado.
   */
  const [openNode, setOpenNode] = useState(null)
  const activeSection = sections.find((section) => section.id === openNode)
  const closeNode = useCallback(() => setOpenNode(null), [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpenNode(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  /**
   * La navegación mueve la CÁMARA, no la página.
   *
   * Antes hacía `scrollIntoView` sobre el texto de abajo, así que pulsar
   * "Sobre mí" te sacaba del espacio 3D de un salto. Los enlaces te llevan al
   * universo neuronal; en la fase 3 cada uno enfocará además su nodo.
   */
  const goToMind = useCallback(() => scrollToProgress(trackRef, MIND_PROGRESS), [])
  const goToStart = useCallback(() => scrollToProgress(trackRef, 0), [])

  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      {/* El titular vive en la escena 3D, que no es texto indexable. Este h1
          es el que leen los buscadores y los lectores de pantalla. */}
      <h1 className="sr-only">
        Alex — desarrollo web. CocoBrain: nuestra mayor inspiración fue una vez
        nuestra mayor debilidad.
      </h1>

      <Preloader />

      <Hud
        sections={sections}
        onSelect={goToMind}
        onClose={goToStart}
        calm={calm}
        onToggleCalm={toggleCalmMode}
      />

      <JourneyScroll trackRef={trackRef} pinRef={pinRef} />

          {/* La pista: su altura es la duración del recorrido. */}
          <section
            ref={trackRef}
            className="relative"
            style={{ height: `${JOURNEY_SCREENS * 100}vh` }}
          >
            <div ref={pinRef} className="h-[100dvh] w-full overflow-hidden">
              {/* La escena no es texto indexable: el h1 de arriba es el que
                  cuenta para buscadores y lectores de pantalla. */}
              <div className="absolute inset-0" aria-hidden="true">
                <World
                  tokens={tokens}
                  sections={sections}
                  compact={compact}
                  reaction={reaction}
                  onPoke={poke}
                  activeSection={openNode}
                  onSelectSection={setOpenNode}
                  active={onScreen}
                />
              </div>

              <HeroCopy />

              {activeSection && (
                <div className="absolute inset-0 flex items-end px-6 pb-16 sm:px-10">
                  <div className="mx-auto w-full max-w-6xl">
                    <div className="max-w-xl border-l border-brain-glow bg-coco-dark/80 p-6 backdrop-blur-sm sm:p-8">
                      <span className="font-mono text-[11px] text-coco-light">
                        {activeSection.nodeName.replace('node_', 'nodo ')}
                      </span>

                      <h2 className="mt-2 text-[clamp(1.6rem,4vw,2.4rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-cream">
                        {activeSection.label}
                      </h2>

                      <div className="mt-5 max-h-[34dvh] overflow-y-auto pr-2">
                        {(sectionContent[activeSection.id] ?? []).length > 0 ? (
                          sectionContent[activeSection.id].map((text) => (
                            <p
                              key={text.slice(0, 24)}
                              className="mb-3 text-[15px] leading-relaxed text-cream/85 last:mb-0"
                            >
                              {text}
                            </p>
                          ))
                        ) : (
                          <p className="text-[15px] leading-relaxed text-cream/60">
                            Contenido pendiente.
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={closeNode}
                        className="mt-6 font-mono text-[12px] text-cream transition-colors hover:text-brain-glow"
                      >
                        ← Volver <span className="text-coco-light">[esc]</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* El contenido accesible. Es DOM real, no un espejo generado por
              JavaScript: es lo que leen los buscadores y los lectores de
              pantalla, y lo que queda si el 3D no llega a cargar. */}
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

      {import.meta.env.DEV && <StageReadout />}
    </>
  )
}
