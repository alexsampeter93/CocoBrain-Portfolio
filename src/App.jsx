import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import World from './three/World'
import JourneyScroll, { scrollToProgress } from './journey/JourneyScroll'
import { progressForNode } from './journey/stages'
import StageReadout from './components/ui/StageReadout'
import HeroCopy from './components/ui/HeroCopy'
import Preloader from './components/ui/Preloader'
import Backdrops from './components/ui/Backdrops'
import Hud from './components/ui/Hud'
import { tokensFor } from './layout/tokens'
import { useCompact } from './layout/useCompact'
import { getCalmMode, subscribeCalmMode, toggleCalmMode } from './state/calmMode'
import { sections, sectionContent } from './data/sections'

/**
 * Alturas de pantalla que dura el recorrido.
 *
 * Once, y el número sale de una cuenta, no de una sensación: la portada pide
 * una pantalla y media, el acercamiento otra tanta, la entrada una, la vista
 * general otra, y **cada nodo algo más de una pantalla entera** para que dé
 * tiempo a leerlo sin correr.
 *
 * Con cuatro pantallas los cinco nodos se repartían apenas pantalla y media
 * entre todos: pasaban tan rápido que no eran un sitio al que llegabas, eran
 * un destello.
 */
const JOURNEY_SCREENS = 11

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
   * La navegación mueve la CÁMARA hasta el nodo, no la página hasta el texto.
   *
   * Pulsar "Proyectos" deja el scroll justo en el tramo de ese nodo, así que
   * la cámara vuela hasta él y su contenido aparece al llegar. Es el mismo
   * recorrido que si hubieras bajado a mano: no hay dos formas de llegar al
   * mismo sitio, que es de donde salen las incoherencias.
   */
  const goToNode = useCallback(
    (id) => {
      const index = sections.findIndex((section) => section.id === id)
      if (index >= 0) scrollToProgress(trackRef, progressForNode(index))
    },
    [],
  )

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

      <Backdrops />

      <Preloader />

      <Hud
        sections={sections}
        onSelect={goToNode}
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

              {/* El contenido de cada nodo ya no vive aquí: flota junto a su
                  nodo dentro de la escena, en `three/NodePanel.jsx`. */}
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
