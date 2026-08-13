import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import gsap from 'gsap'

/**
 * Pantalla de carga. No es decoración: la escena carga un HDRI y un modelo de
 * 2,5 MB, y sin esto el usuario ve el fondo vacío durante un par de segundos
 * y da por hecho que la web está rota.
 *
 * El contador sube suavizado en vez de saltar con los eventos de carga, que
 * llegan a trompicones y hacen que el número pegue brincos.
 */
export default function Preloader() {
  const { progress, total } = useProgress()
  const [hidden, setHidden] = useState(false)
  const rootRef = useRef(null)
  const barRef = useRef(null)
  const numberRef = useRef(null)
  const shownRef = useRef({ value: 0 })

  useEffect(() => {
    // `total === 0` significa que aún no se ha registrado ninguna descarga:
    // tratarlo como 100% cerraría el preloader antes de empezar.
    const target = total === 0 ? 0 : progress

    gsap.to(shownRef.current, {
      value: target,
      duration: 0.6,
      ease: 'power2.out',
      onUpdate: () => {
        const value = Math.round(shownRef.current.value)
        if (numberRef.current) numberRef.current.textContent = String(value).padStart(2, '0')
        if (barRef.current) barRef.current.style.transform = `scaleX(${value / 100})`
      },
    })
  }, [progress, total])

  useEffect(() => {
    if (total === 0 || progress < 100) return

    const timeline = gsap.timeline({
      delay: 0.35,
      onComplete: () => setHidden(true),
    })
    timeline.to(rootRef.current, { autoAlpha: 0, duration: 0.7, ease: 'power2.inOut' })

    return () => timeline.kill()
  }, [progress, total])

  if (hidden) return null

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex flex-col justify-end bg-cream px-6 pb-10 sm:px-10 sm:pb-14"
      role="status"
      aria-live="polite"
      aria-label="Cargando"
    >
      <div className="mx-auto flex w-full max-w-6xl items-end justify-between">
        <span className="text-[13px] text-coco-mid">CocoBrain</span>
        <span
          ref={numberRef}
          className="font-medium tabular-nums leading-none text-coco-dark text-[clamp(3rem,12vw,9rem)] tracking-[-0.04em]"
        >
          00
        </span>
      </div>

      <div className="mx-auto mt-6 h-px w-full max-w-6xl bg-coco-light/35">
        <div
          ref={barRef}
          className="h-px origin-left bg-coco-dark"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>
    </div>
  )
}
