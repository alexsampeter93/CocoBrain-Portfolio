import { Suspense } from 'react'
import Scene from './components/three/Scene'
import { sections } from './data/sections'

/**
 * Fases 1-2.
 * La escena 3D es decorativa y va detrás: todo el contenido con significado
 * vive en el DOM y se puede leer sin WebGL. El contenido real entra en la
 * fase 10.
 */
export default function App() {
  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      {/* 100dvh y no 100vh: en móvil la barra del navegador recorta el vh */}
      <div className="fixed inset-0 -z-10 h-[100dvh] w-full">
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </div>

      <main
        id="contenido"
        className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col justify-center px-6 py-20"
      >
        <p className="text-sm uppercase tracking-[0.3em] text-coco-light">
          CocoBrain
        </p>

        <h1 className="mt-4 text-5xl font-bold leading-tight sm:text-6xl">
          Portfolio de Alex
        </h1>

        <p className="mt-6 max-w-xl text-lg text-coco-mid">
          Nuestra mayor inspiración fue una vez nuestra mayor debilidad.
        </p>

        <nav aria-label="Secciones" className="mt-12">
          <ul className="flex flex-wrap gap-3">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="inline-block rounded-full border-2 bg-cream/70 px-5 py-2 font-medium backdrop-blur-sm transition-colors hover:bg-coco-dark hover:text-cream"
                  style={{ borderColor: section.accent }}
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </main>
    </>
  )
}
