import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

/**
 * Interfaz de instrumento.
 *
 * La UI no se presenta como "una web con menú", sino como el panel de lectura
 * de la mente por la que se está viajando: índices de nodo, coordenadas y
 * lecturas en monoespaciada, anclado a las cuatro esquinas y con marcas de
 * encuadre. Nada de tarjetas, botones píldora ni columnas centradas.
 */

/** Marcas de encuadre en las esquinas. Puramente ópticas: cierran la pantalla. */
function CornerTicks() {
  const base = 'pointer-events-none fixed z-40 h-4 w-4 border-coco-light/45'
  return (
    <div aria-hidden="true">
      <div className={`${base} left-5 top-5 border-l border-t sm:left-8 sm:top-8`} />
      <div className={`${base} right-5 top-5 border-r border-t sm:right-8 sm:top-8`} />
      <div className={`${base} bottom-5 left-5 border-b border-l sm:bottom-8 sm:left-8`} />
      <div className={`${base} bottom-5 right-5 border-b border-r sm:bottom-8 sm:right-8`} />
    </div>
  )
}

/** Una lectura: etiqueta tenue arriba, valor tabular debajo. */
function Readout({ label, value, accent = false }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[9px] leading-none tracking-[0.14em] text-coco-mid/55">
        {label}
      </span>
      <span
        className={`font-mono text-[11px] leading-none tabular-nums ${
          accent ? 'text-brain-glow' : 'text-coco-dark'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

export default function Hud({
  sections,
  activeSection,
  onSelect,
  onClose,
  progress,
  inside,
}) {
  const logoRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (reducedMotion || !logoRef.current) return

    // Revelado por máscara en vez de un fundido: la marca se descubre de
    // izquierda a derecha, como si el instrumento la estuviera leyendo.
    const tween = gsap.fromTo(
      logoRef.current,
      { clipPath: 'inset(0 100% 0 0)', opacity: 1 },
      {
        clipPath: 'inset(0 0% 0 0)',
        duration: 1.1,
        ease: 'power3.inOut',
        delay: 0.35,
      },
    )

    return () => tween.kill()
  }, [reducedMotion])

  const depth = Math.round(progress * 100)
  const active = sections.find((section) => section.id === activeSection)

  return (
    <>
      <CornerTicks />

      {/* Fila superior: marca a la izquierda, índice de nodos a la derecha. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 px-8 pt-7 sm:px-12 sm:pt-10">
        <div className="flex items-start justify-between gap-8">
          <button
            type="button"
            onClick={onClose}
            className="pointer-events-auto block"
            aria-label="Volver al inicio"
          >
            <img
              ref={logoRef}
              src="/img/wordmark.webp"
              alt="CocoBrain"
              width="1310"
              height="335"
              className="h-auto w-[96px] sm:w-[124px]"
            />
          </button>

          <nav aria-label="Secciones" className="pointer-events-auto">
            <ul className="flex flex-col items-end gap-1.5">
              {sections.map((section, index) => {
                const isActive = activeSection === section.id
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(section.id)}
                      aria-current={isActive ? 'true' : undefined}
                      className="group flex items-center gap-2.5 font-mono text-[11px] leading-none"
                    >
                      <span
                        className={`transition-colors ${
                          isActive
                            ? 'text-coco-dark'
                            : 'text-coco-mid group-hover:text-coco-dark'
                        }`}
                      >
                        {section.label}
                      </span>
                      <span className="tabular-nums text-[9px] text-coco-mid/55">
                        N0{index + 1}
                      </span>
                      {/* Cuadrado que se rellena: indicador de estado, no un
                          punto decorativo. */}
                      <span
                        aria-hidden="true"
                        className={`h-[7px] w-[7px] border transition-colors ${
                          isActive
                            ? 'border-brain-glow bg-brain-glow'
                            : 'border-coco-light group-hover:border-coco-mid'
                        }`}
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      </div>

      {/* Fila inferior: lecturas del sistema. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-8 pb-7 sm:px-12 sm:pb-10">
        <div className="flex items-end justify-between gap-8">
          <div className="flex gap-7">
            <Readout label="PROFUNDIDAD" value={`${String(depth).padStart(3, '0')}%`} />
            <Readout
              label="CAPA"
              value={inside ? 'INTERIOR' : 'EXTERIOR'}
              accent={inside}
            />
          </div>

          <div className="flex gap-7">
            <Readout label="NODOS" value={String(sections.length).padStart(2, '0')} />
            <Readout
              label="FOCO"
              value={active ? `N0${sections.indexOf(active) + 1}` : '--'}
              accent={Boolean(active)}
            />
          </div>
        </div>
      </div>
    </>
  )
}
