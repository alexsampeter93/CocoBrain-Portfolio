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

export default function Hud({ sections, activeSection, onSelect, onClose, progress }) {
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

      {/* Navegación abajo a la derecha, en vertical. Sin caja, sin relleno,
          sin aspecto de botón: solo la palabra y una regla que crece. */}
      <nav
        aria-label="Secciones"
        className="pointer-events-none fixed bottom-6 right-6 z-40 sm:bottom-10 sm:right-10"
      >
        <ul className="flex flex-col items-end gap-3 pb-9 pr-9">
          {sections.map((section) => {
            const isActive = activeSection === section.id
            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => onSelect(section.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className="pointer-events-auto group flex items-center gap-3 font-mono text-[12px] leading-none"
                >
                  <span
                    aria-hidden="true"
                    className={`h-px bg-brain-glow transition-all duration-300 ${
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
