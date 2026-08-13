import { Suspense } from 'react'
import Hero from './components/ui/Hero'
import HeroCopy from './components/ui/HeroCopy'
import Preloader from './components/ui/Preloader'
import Scene from './components/three/Scene'
import { sections } from './data/sections'

/**
 * TEMPORAL — interruptor para comparar las dos portadas sin tocar código:
 * localhost:5173      → portada 3D
 * localhost:5173/?2d  → portada 2D con el arte de marca
 * Desaparece en cuanto decidamos cuál se queda.
 */
const USE_2D_HERO =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('2d')

export default function App() {
  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      {!USE_2D_HERO && <Preloader />}

      {!USE_2D_HERO && (
        <div className="pointer-events-none fixed inset-0 -z-10 h-[100dvh] w-full">
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </div>
      )}

      <header className="fixed inset-x-0 top-0 z-20 flex items-baseline justify-between px-6 py-5 sm:px-10">
        <span className="text-[13px] font-medium text-coco-mid">
          Alex — desarrollo web
        </span>
        <nav aria-label="Secciones">
          <ul className="flex gap-5 text-[13px]">
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

      {USE_2D_HERO ? <Hero /> : <HeroCopy />}

      <main id="contenido" className="relative px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <p className="max-w-xl text-coco-mid">
            {/* TODO(fase 10): secciones reales desde sections.js y projects.js */}
            Contenido pendiente: necesito tus proyectos para montarlo.
          </p>
        </div>
      </main>
    </>
  )
}
