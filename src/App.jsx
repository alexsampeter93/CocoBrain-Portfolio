import { Suspense, useEffect, useState } from 'react'
import Scene from './components/three/Scene'
import { MASCOT_MODELS } from './components/three/Mascot3D'
import Preloader from './components/ui/Preloader'
import { sections } from './data/sections'

/**
 * TEMPORAL — comparador sin tocar código:
 *   /                → Olaz pensativo
 *   /?model=brain    → Olaz con el cerebro en la mano
 */
function useSelectedModel() {
  const [url] = useState(() => {
    if (typeof window === 'undefined') return MASCOT_MODELS.thinker
    const key = new URLSearchParams(window.location.search).get('model')
    return MASCOT_MODELS[key] ?? MASCOT_MODELS.thinker
  })
  return url
}

/** En pantallas anchas el personaje se va a la derecha y el texto ocupa la
 *  izquierda. En estrechas se centra y el texto va debajo. */
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

export default function App() {
  const model = useSelectedModel()
  const wide = useWideLayout()

  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      <Preloader />

      <div className="pointer-events-none fixed inset-0 -z-10 h-[100dvh] w-full">
        <Suspense fallback={null}>
          <Scene model={model} xRatio={wide ? 0.24 : 0} />
        </Suspense>
      </div>

      <header className="fixed inset-x-0 top-0 z-20 flex items-baseline justify-between px-6 py-6 sm:px-10">
        <span className="text-[13px] font-medium text-coco-mid">CocoBrain</span>
        <nav aria-label="Secciones">
          <ul className="flex gap-6 text-[13px]">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-coco-mid underline-offset-4 transition-colors hover:text-coco-dark hover:underline"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <section className="relative flex min-h-[100dvh] items-center px-6 sm:px-10">
        <div className="mx-auto w-full max-w-6xl">
          {/* max-w estricto: es lo que impide que el texto invada al
              personaje, que era el problema de la composición anterior. */}
          <div className="max-w-[26rem] lg:max-w-[24rem]">
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

            <a
              href="#contenido"
              className="mt-8 inline-block border-b-2 border-coco-dark pb-1 text-[15px] font-medium transition-colors hover:border-brain-glow hover:text-brain-glow"
            >
              Ver proyectos
            </a>
          </div>
        </div>
      </section>

      <main id="contenido" className="relative px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <p className="max-w-xl text-coco-mid">
            {/* TODO: secciones reales desde sections.js y projects.js */}
            Contenido pendiente: necesito tus proyectos para montarlo.
          </p>
        </div>
      </main>
    </>
  )
}
