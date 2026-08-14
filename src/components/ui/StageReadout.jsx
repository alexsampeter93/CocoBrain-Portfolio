import { useEffect, useRef } from 'react'
import { journey } from '../../journey/clock'
import { STAGES } from '../../journey/stages'

/**
 * Indicador de desarrollo: en qué tramo va el recorrido y con qué progreso.
 *
 * Es la herramienta de la fase 0. Sin poder ver el número no hay forma de
 * decir "la entrada llega tarde", solo "algo va raro" —y con eso no se corrige
 * nada. Se pinta leyendo el reloj directamente, sin pasar por el estado de
 * React, para no falsear lo mismo que estamos midiendo.
 *
 * No entra en el build de producción.
 */
export default function StageReadout() {
  const barRef = useRef(null)
  const textRef = useRef(null)

  useEffect(() => {
    let frame

    const tick = () => {
      const p = journey.progress
      const stage = STAGES.reduce((found, s) => (p >= s.from ? s : found), STAGES[0])

      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`
      if (textRef.current) {
        textRef.current.textContent = `${stage.label.toUpperCase()} · ${p.toFixed(3)}`
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50">
      <div className="flex items-center gap-3 px-3 pb-2">
        <span
          ref={textRef}
          className="font-mono text-[10px] tracking-[0.08em] text-coco-mid"
        />
        <div className="h-px flex-1 bg-coco-light/40">
          <div
            ref={barRef}
            className="h-full origin-left bg-brain-glow"
            style={{ transform: 'scaleX(0)' }}
          />
        </div>
      </div>

      {/* Marcas de los límites de cada tramo, para ver si algo llega tarde. */}
      <div className="relative h-2 px-3">
        {STAGES.map((stage) => (
          <span
            key={stage.id}
            className="absolute top-0 h-1.5 w-px bg-coco-mid/50"
            style={{ left: `calc(0.75rem + (100% - 1.5rem) * ${stage.from})` }}
          />
        ))}
      </div>
    </div>
  )
}
