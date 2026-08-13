import { sections } from './data/sections'

/**
 * Fase 1 — solo scaffold.
 * La escena 3D entra en la fase 2 y el contenido HTML real en la fase 10.
 */
export default function App() {
  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

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
                  className="inline-block rounded-full border-2 px-5 py-2 font-medium transition-colors hover:bg-coco-dark hover:text-cream"
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
