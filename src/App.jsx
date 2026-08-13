import { Suspense, useCallback, useEffect, useState } from 'react'
import Scene, { SWAP_POINT } from './components/three/Scene'
import { MASCOT_MODELS } from './components/three/Mascot3D'
import Preloader from './components/ui/Preloader'
import { useScrollProgress } from './hooks/useScrollProgress'
import { sections } from './data/sections'

/**
 * TEMPORAL — comparador sin tocar código:
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

// Ancho de la zona en la que el fundido tapa el cambio de escena. Más
// estrecho y se ve el salto; más ancho y la pantalla se queda en blanco
// demasiado rato.
const FADE_WIDTH = 0.075

export default function App() {
  const model = useSelectedModel()
  const wide = useWideLayout()
  const progress = useScrollProgress()
  const [activeSection, setActiveSection] = useState(null)

  const close = useCallback(() => setActiveSection(null), [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [close])

  const active = sections.find((section) => section.id === activeSection)
  const inside = progress >= SWAP_POINT

  // Opaco justo en el punto de cambio, transparente fuera de la franja.
  const fade = Math.max(0, 1 - Math.abs(progress - SWAP_POINT) / FADE_WIDTH)
  // La portada se va desvaneciendo mientras la cámara se acerca.
  const heroOpacity = Math.max(0, 1 - progress / (SWAP_POINT * 0.7))

  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      <Preloader />

      <div className="fixed inset-0 -z-10 h-[100dvh] w-full">
        <Suspense fallback={null}>
          <Scene
            model={model}
            xRatio={wide ? 0.24 : 0}
            sections={sections}
            activeSection={activeSection}
            onSelect={setActiveSection}
            progress={progress}
          />
        </Suspense>
      </div>

      {/* Fundido que tapa el cambio de escena. */}
      <div
        className="pointer-events-none fixed inset-0 z-30 bg-cream"
        style={{ opacity: fade }}
        aria-hidden="true"
      />

      <header className="fixed inset-x-0 top-0 z-40 flex items-baseline justify-between px-6 py-6 sm:px-10">
        <button
          type="button"
          onClick={close}
          className="text-[13px] font-medium text-coco-mid transition-colors hover:text-coco-dark"
        >
          CocoBrain
        </button>

        <nav aria-label="Secciones">
          <ul className="flex gap-6 text-[13px]">
            {sections.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  aria-current={activeSection === section.id ? 'true' : undefined}
                  className={`underline-offset-4 transition-colors hover:text-coco-dark hover:underline ${
                    activeSection === section.id ? 'text-coco-dark underline' : 'text-coco-mid'
                  }`}
                >
                  {section.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* Contenedor alto: es lo que da recorrido al scroll. La escena está
          fija detrás, así que aquí solo hay altura y texto. */}
      <div className="relative h-[420vh]">
        <div className="sticky top-0 flex h-[100dvh] items-center px-6 sm:px-10">
          <div className="mx-auto w-full max-w-6xl">
            {/* Portada */}
            <div
              className="max-w-[26rem] transition-opacity duration-200 lg:max-w-[24rem]"
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

              <p className="mt-10 text-[13px] text-coco-mid">
                Baja para entrar <span aria-hidden="true">↓</span>
              </p>
            </div>

            {/* Dentro del cerebro */}
            {inside && !active && (
              <div className="pointer-events-none absolute inset-x-6 bottom-16 sm:inset-x-10">
                <div className="mx-auto max-w-6xl">
                  <p className="max-w-sm text-[15px] leading-relaxed text-coco-mid">
                    Estás dentro. Cada nodo es una sección — pulsa uno.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel de sección. */}
      {active && (
        <div className="pointer-events-none fixed inset-0 z-20 flex items-end px-6 pb-16 sm:px-10">
          <div className="pointer-events-auto mx-auto w-full max-w-6xl">
            <div className="max-w-md">
              <p className="text-[13px] text-coco-mid">Sección</p>
              <h2 className="mt-1 text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.03em]">
                {active.label}
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-coco-mid">
                Contenido pendiente.
              </p>
              <button
                type="button"
                onClick={close}
                className="mt-6 border-b-2 border-coco-dark pb-1 text-[15px] font-medium transition-colors hover:border-brain-glow hover:text-brain-glow"
              >
                Volver <span className="text-coco-mid">(Esc)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <main id="contenido" className="sr-only">
        <h2>Proyectos</h2>
        <p>Contenido pendiente: necesito tus proyectos para montarlo.</p>
      </main>
    </>
  )
}
