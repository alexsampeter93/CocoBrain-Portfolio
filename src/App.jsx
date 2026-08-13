import { Suspense } from 'react'
import Scene from './components/three/Scene'
import { sections } from './data/sections'

/**
 * Fases 1-2 + 5.
 * El logo 3D es el titular de la primera pantalla, así que el DOM no repite
 * el nombre encima: se aparta y deja respirar la escena. El contenido real
 * de las secciones entra en la fase 10.
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

      <header className="fixed inset-x-0 top-0 z-10 flex items-baseline justify-between px-6 py-5 sm:px-10">
        <span className="text-[13px] font-medium text-coco-mid">
          Alex — desarrollo web
        </span>
        <nav aria-label="Secciones">
          <ul className="flex gap-5 text-[13px]">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-coco-mid underline-offset-4 hover:text-coco-dark hover:underline"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* Primera pantalla: solo la escena. El h1 existe para lectores de
          pantalla y buscadores, porque el logo 3D no es texto indexable. */}
      <section className="relative flex h-[100dvh] flex-col justify-end px-6 pb-10 sm:px-10">
        <h1 className="sr-only">CocoBrain — portfolio de Alex, desarrollador web</h1>
        <p className="max-w-sm text-[15px] leading-relaxed text-coco-mid">
          Nuestra mayor inspiración fue una vez nuestra mayor debilidad.
        </p>
        <a
          href="#contenido"
          className="mt-6 w-fit text-[13px] text-coco-dark underline underline-offset-4"
        >
          Ver proyectos
        </a>
      </section>

      <main id="contenido" className="relative bg-cream px-6 py-24 sm:px-10">
        <p className="max-w-xl text-coco-mid">
          {/* TODO(fase 10): secciones reales desde sections.js y projects.js */}
          Contenido pendiente de la fase 10.
        </p>
      </main>
    </>
  )
}
