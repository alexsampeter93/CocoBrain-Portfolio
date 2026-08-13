import Hero from './components/ui/Hero'
import { sections } from './data/sections'

/**
 * La portada es 2D: el arte de la marca a resolución nativa.
 * La escena 3D (Scene.jsx, Logo3D.jsx, Title3D.jsx) sigue en el repo y se
 * volverá a montar cuando haya render de Blender que reproducir.
 */
export default function App() {
  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

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

      <Hero />

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
