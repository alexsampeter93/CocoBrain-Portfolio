import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import gsap from 'gsap'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

/**
 * Pantalla de carga.
 *
 * Es donde vive el logotipo. En la portada competia con el personaje y se
 * leia como una pegatina; aqui es lo unico en pantalla, tiene todo el espacio
 * y es lo primero que se ve de la marca.
 *
 * Las letras no aparecen de golpe: se descubren de izquierda a derecha con
 * una mascara, como si alguien las estuviera escribiendo.
 */

// Red de seguridad: pase lo que pase con los eventos de carga, el preloader
// se quita. Mejor una escena a medio cargar que una pantalla en blanco.
const HARD_TIMEOUT_MS = 8000

// Si en este tiempo no se ha registrado ninguna descarga, la carga ya habia
// terminado antes de montar este componente.
const NOTHING_LOADING_MS = 1200

/**
 * Tiempo minimo en pantalla.
 *
 * Sin esto, en local la carga termina antes de que la animacion de entrada
 * llegue a verse: la marca aparece y desaparece de golpe. Un preloader que
 * pasa demasiado rapido no informa de nada y ademas desperdicia el unico
 * momento en que la marca tiene la pantalla entera.
 */
const MIN_VISIBLE_MS = 2600

// Interruptor a la espera del recorte limpio de Olaz colgado.
const HANGING_ASSET_READY = false

export default function Preloader() {
  const { progress, total, active } = useProgress()
  const [hidden, setHidden] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [minElapsed, setMinElapsed] = useState(false)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [])

  const rootRef = useRef(null)
  const logoRef = useRef(null)
  const olazRef = useRef(null)
  const barRef = useRef(null)
  const numberRef = useRef(null)
  const shownRef = useRef({ value: 0 })

  /** Entrada: se escribe el nombre y Olaz se descuelga de la C. */
  useEffect(() => {
    if (reducedMotion || !logoRef.current) return

    const timeline = gsap.timeline()

    timeline.fromTo(
      logoRef.current,
      { clipPath: 'inset(0 100% 0 0)', y: 14 },
      { clipPath: 'inset(0 0% 0 0)', y: 0, duration: 1.15, ease: 'power3.inOut' },
    )

    if (olazRef.current) {
      timeline
        .fromTo(
          olazRef.current,
          { autoAlpha: 0, rotation: -34, scale: 0.92 },
          { autoAlpha: 1, rotation: -34, scale: 1, duration: 0.3, ease: 'power2.out' },
          '-=0.25',
        )
        /**
         * Pendulo amortiguado. Las amplitudes decrecen y las duraciones se
         * alargan: un balanceo de amplitud constante parece un metronomo,
         * uno que se apaga parece peso colgando de verdad.
         */
        .to(olazRef.current, { rotation: 16, duration: 0.75, ease: 'sine.inOut' })
        .to(olazRef.current, { rotation: -11, duration: 0.85, ease: 'sine.inOut' })
        .to(olazRef.current, { rotation: 6, duration: 0.95, ease: 'sine.inOut' })
        .to(olazRef.current, {
          rotation: -3,
          duration: 1.1,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        })
    }

    return () => timeline.kill()
  }, [reducedMotion])

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

  /**
   * Tope duro, en su propio efecto y sin dependencias: si viviera junto a la
   * comprobacion de progreso se cancelaria en cada cambio y no llegaria a
   * saltar nunca, que es lo que dejaba la pantalla tapada para siempre.
   */
  useEffect(() => {
    const timer = setTimeout(() => setDismissed(true), HARD_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (total === 0 && minElapsed) setDismissed(true)
    }, NOTHING_LOADING_MS)
    return () => clearTimeout(timer)
  }, [total, minElapsed])

  useEffect(() => {
    if (dismissed || !minElapsed || total === 0 || progress < 100 || active) return
    const timer = setTimeout(() => setDismissed(true), 300)
    return () => clearTimeout(timer)
  }, [progress, total, active, dismissed, minElapsed])

  useEffect(() => {
    if (!dismissed || !rootRef.current) return

    const tween = gsap.to(rootRef.current, {
      autoAlpha: 0,
      duration: 0.7,
      ease: 'power2.inOut',
      onComplete: () => setHidden(true),
    })

    return () => tween.kill()
  }, [dismissed])

  if (hidden) return null

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-cream px-6"
      role="status"
      aria-live="polite"
      aria-label="Cargando"
    >
      {/* El contenedor lleva la misma anchura que el logotipo, asi que Olaz
          se posiciona en porcentaje y queda colgado de la C a cualquier
          tamano de pantalla sin recalcular nada. */}
      <div className="relative w-[78vw] max-w-[460px]">
        <img
          ref={logoRef}
          src="/img/wordmark.webp"
          srcSet="/img/wordmark-sm.webp 640w, /img/wordmark.webp 1200w"
          sizes="(max-width: 640px) 78vw, 460px"
          alt="CocoBrain"
          width="1200"
          height="214"
          className="h-auto w-full"
        />

        {/* Pendiente del asset limpio: el recorte actual, sacado del poster,
            arrastra el halo de su sombra y no se puede quitar sin comerse las
            zapatillas, que son casi del mismo crema. La animacion ya esta
            escrita; en cuanto llegue la imagen se pone esto a true. */}
        {HANGING_ASSET_READY && (
        <img
          ref={olazRef}
          src="/img/olaz-hanging.webp"
          srcSet="/img/olaz-hanging-sm.webp 240w, /img/olaz-hanging.webp 420w"
          sizes="120px"
          alt=""
          aria-hidden="true"
          width="420"
          height="525"
          className="absolute left-[-2%] top-[34%] w-[26%] opacity-0"
          // El origen de giro es su mano: el balanceo tiene que salir del
          // punto por el que agarra, no del centro de la imagen.
          style={{ transformOrigin: '34% 8%' }}
        />
        )}
      </div>

      <div className="mt-24 flex w-[78vw] max-w-[460px] items-end justify-between">
        <span className="font-mono text-[11px] text-coco-mid">cargando</span>
        <span
          ref={numberRef}
          className="font-mono text-[11px] tabular-nums text-coco-dark"
        >
          00
        </span>
      </div>

      <div className="mt-2 h-px w-[78vw] max-w-[460px] bg-coco-light/35">
        <div
          ref={barRef}
          className="h-px origin-left bg-coco-dark"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>
    </div>
  )
}
