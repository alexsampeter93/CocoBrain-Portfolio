import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

/**
 * Marco de interfaz: marcas de encuadre, firma y navegación.
 *
 * El logotipo NO está aquí. Vive dentro de la escena 3D (Wordmark3D), donde
 * comparte perspectiva, paralaje y luz con el resto. Como imagen fija en una
 * esquina se leía como papel pegado encima del fondo.
 */
function CornerTicks() {
  const base = 'pointer-events-none fixed z-40 h-5 w-5 border-coco-light'
  return (
    <div aria-hidden="true">
      <div className={`${base} left-6 top-6 border-l border-t sm:left-10 sm:top-10`} />
      <div className={`${base} right-6 top-6 border-r border-t sm:right-10 sm:top-10`} />
      <div className={`${base} bottom-6 left-6 border-b border-l sm:bottom-10 sm:left-10`} />
      <div className={`${base} bottom-6 right-6 border-b border-r sm:bottom-10 sm:right-10`} />
    </div>
  )
}

export default function Hud({
  sections,
  activeSection,
  onSelect,
  onClose,
  calm,
  onToggleCalm,
}) {
  const logoRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (reducedMotion || !logoRef.current) return

    // Revelado por máscara: la marca se descubre de izquierda a derecha en
    // vez de aparecer con un fundido genérico.
    const tween = gsap.fromTo(
      logoRef.current,
      { clipPath: 'inset(0 100% 0 0)' },
      { clipPath: 'inset(0 0% 0 0)', duration: 1.2, ease: 'power3.inOut', delay: 0.4 },
    )

    return () => tween.kill()
  }, [reducedMotion])

  return (
    <>
      <CornerTicks />

      {/* El logotipo ya no vive aqui: esta dentro de la escena 3D, detras de
          Olaz, para que comparta perspectiva y luz con el resto. Como imagen
          fija en una esquina se leia como papel pegado encima. */}
      <div className="pointer-events-none fixed left-6 top-6 z-40 sm:left-10 sm:top-10">
        <button
          ref={logoRef}
          type="button"
          onClick={onClose}
          className="pointer-events-auto block pl-9 pt-9 font-mono text-[11px] text-coco-mid transition-colors hover:text-coco-dark"
        >
          CocoBrain — Alex
        </button>
      </div>

      {/*
        Modo "cabeza despejada". Es el interruptor accesible de la web y a la
        vez parte del tema: una mente que no para, y la posibilidad de
        pararla. No se esconde en un menu de ajustes por eso mismo.
      */}
      <div className="pointer-events-none fixed right-6 top-6 z-40 sm:right-10 sm:top-10">
        <button
          type="button"
          onClick={onToggleCalm}
          aria-pressed={calm}
          className="pointer-events-auto flex items-center gap-2 pr-9 pt-9 font-mono text-[11px] text-coco-mid transition-colors hover:text-coco-dark"
        >
          <span
            aria-hidden="true"
            className={`h-[7px] w-[7px] border transition-colors ${
              calm ? 'border-brain-glow bg-brain-glow' : 'border-coco-light'
            }`}
          />
          cabeza despejada
        </button>
      </div>

      {/*
        Navegacion sin caja, sin relleno y sin aspecto de boton: solo la
        palabra y una regla que crece.

        En movil va en fila abajo del todo. En vertical a la derecha se
        solapaba con el personaje, que en pantalla estrecha ocupa el centro.
      */}
      <nav
        aria-label="Secciones"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center sm:inset-x-auto sm:bottom-10 sm:right-10 sm:block"
      >
        <ul className="flex flex-row flex-wrap justify-center gap-x-5 gap-y-2 px-8 sm:flex-col sm:items-end sm:gap-3 sm:px-0 sm:pb-9 sm:pr-9">
          {sections.map((section) => {
            const isActive = activeSection === section.id
            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => onSelect(section.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className="pointer-events-auto group flex items-center gap-2 py-1 font-mono text-[12px] leading-none sm:gap-3 sm:py-0"
                >
                  <span
                    aria-hidden="true"
                    className={`hidden h-px bg-brain-glow transition-all duration-300 sm:block ${
                      isActive ? 'w-9' : 'w-0 group-hover:w-6'
                    }`}
                  />
                  <span
                    className={`transition-colors duration-200 ${
                      isActive
                        ? 'text-brain-glow'
                        : 'text-coco-mid group-hover:text-coco-dark'
                    }`}
                  >
                    {section.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
