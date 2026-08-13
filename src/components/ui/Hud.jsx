import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

/**
 * Marco de interfaz.
 *
 * La marca no va "pegada arriba" a tamaño de icono: entra grande, como parte
 * de la composición de portada, y se recoge a su esquina a medida que se baja.
 * Ese movimiento es la animación —el logo no se limita a estar, se comporta.
 */

// Anchos del logotipo, en píxeles, al principio y una vez recogido.
const LOGO_WIDTH_OPEN = 240
const LOGO_WIDTH_TUCKED = 104

// A qué altura del scroll termina de recogerse.
const TUCK_END = 0.16

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

  const tuck = Math.min(1, progress / TUCK_END)
  const logoWidth = LOGO_WIDTH_OPEN + (LOGO_WIDTH_TUCKED - LOGO_WIDTH_OPEN) * tuck

  return (
    <>
      <CornerTicks />

      <div className="pointer-events-none fixed left-6 top-6 z-40 sm:left-10 sm:top-10">
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto block pl-9 pt-9"
          aria-label="Volver al inicio"
        >
          <img
            ref={logoRef}
            src="/img/wordmark.webp"
            srcSet="/img/wordmark-sm.webp 720w, /img/wordmark.webp 1310w"
            sizes="240px"
            alt="CocoBrain"
            width="1310"
            height="335"
            className="h-auto max-w-[45vw]"
            style={{ width: `${logoWidth}px` }}
          />
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
