import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import gsap from 'gsap'

// Red de seguridad: pase lo que pase con los eventos de carga, el preloader
// se quita. Es preferible enseñar una escena a medio cargar que dejar al
// usuario mirando una pantalla en blanco.
const HARD_TIMEOUT_MS = 8000

// Si en este tiempo no se ha registrado ninguna descarga, es que la carga ya
// había terminado antes de montar este componente (useGLTF.preload arranca
// en tiempo de import, antes del primer render de React).
const NOTHING_LOADING_MS = 1200

export default function Preloader() {
  const { progress, total, active } = useProgress()
  const [hidden, setHidden] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const rootRef = useRef(null)
  const barRef = useRef(null)
  const numberRef = useRef(null)
  const shownRef = useRef({ value: 0 })

  useEffect(() => {
    gsap.to(shownRef.current, {
      value: total === 0 ? 0 : progress,
      duration: 0.5,
      ease: 'power2.out',
      onUpdate: () => {
        const value = Math.round(shownRef.current.value)
        if (numberRef.current) numberRef.current.textContent = String(value).padStart(2, '0')
        if (barRef.current) barRef.current.style.transform = `scaleX(${value / 100})`
      },
    })
  }, [progress, total])

  // Tres caminos para darse por terminado.
  useEffect(() => {
    if (dismissed) return

    const timers = []

    if (total > 0 && progress >= 100 && !active) {
      timers.push(setTimeout(() => setDismissed(true), 300))
    }

    timers.push(
      setTimeout(() => {
        if (total === 0) setDismissed(true)
      }, NOTHING_LOADING_MS),
    )

    timers.push(setTimeout(() => setDismissed(true), HARD_TIMEOUT_MS))

    return () => timers.forEach(clearTimeout)
  }, [progress, total, active, dismissed])

  useEffect(() => {
    if (!dismissed || !rootRef.current) return

    const tween = gsap.to(rootRef.current, {
      autoAlpha: 0,
      duration: 0.6,
      ease: 'power2.inOut',
      onComplete: () => setHidden(true),
    })

    return () => tween.kill()
  }, [dismissed])

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
