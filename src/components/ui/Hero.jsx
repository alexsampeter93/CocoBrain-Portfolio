import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

// Cuánto se desplaza cada capa con el cursor, en píxeles. La diferencia entre
// ambas es lo que crea la sensación de profundidad: si se mueven igual, el
// conjunto parece una sola lámina.
const PARALLAX_WORDMARK = 12
const PARALLAX_MASCOT = 34

export default function Hero() {
  const rootRef = useRef(null)
  const wordmarkRef = useRef(null)
  const mascotRef = useRef(null)
  const copyRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (reducedMotion) return

    const context = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } })

      timeline
        .from(wordmarkRef.current, { y: 40, autoAlpha: 0, duration: 1 })
        // La mascota entra después y con rebote: llega, no aparece.
        .from(
          mascotRef.current,
          { y: 90, autoAlpha: 0, duration: 1.1, ease: 'back.out(1.4)' },
          '-=0.65',
        )
        .from(copyRef.current.children, { y: 18, autoAlpha: 0, stagger: 0.12 }, '-=0.7')

      // Balanceo continuo, muy corto. Sin esto la mascota se queda muerta
      // en cuanto termina la entrada.
      gsap.to(mascotRef.current, {
        y: '+=10',
        rotation: 1.2,
        duration: 3.2,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      })
    }, rootRef)

    return () => context.revert()
  }, [reducedMotion])

  useEffect(() => {
    if (reducedMotion) return

    const wordmark = gsap.quickTo(wordmarkRef.current, 'x', { duration: 0.8, ease: 'power2.out' })
    const mascot = gsap.quickTo(mascotRef.current, 'x', { duration: 0.9, ease: 'power2.out' })

    const onPointerMove = (event) => {
      const ratio = event.clientX / window.innerWidth - 0.5
      wordmark(ratio * PARALLAX_WORDMARK)
      mascot(ratio * PARALLAX_MASCOT)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => window.removeEventListener('pointermove', onPointerMove)
  }, [reducedMotion])

  return (
    <section
      ref={rootRef}
      className="relative flex min-h-[100dvh] items-center overflow-hidden pt-24"
    >
      <div className="mx-auto w-full max-w-6xl px-6 sm:px-10">
        <h1 className="sr-only">
          CocoBrain — portfolio de Alex, desarrollador web
        </h1>

        <img
          ref={wordmarkRef}
          src="/img/wordmark.webp"
          srcSet="/img/wordmark-sm.webp 720w, /img/wordmark.webp 1310w"
          sizes="(max-width: 640px) 100vw, 1100px"
          alt="CocoBrain"
          width="1310"
          height="335"
          className="w-full max-w-[1100px]"
          fetchPriority="high"
        />

        <div className="grid grid-cols-1 gap-x-10 sm:grid-cols-[minmax(0,32%)_minmax(0,1fr)]">
          <img
            ref={mascotRef}
            src="/img/olaz.webp"
            srcSet="/img/olaz-sm.webp 520w, /img/olaz.webp 900w"
            sizes="(max-width: 640px) 62vw, 340px"
            alt="Olaz, la mascota de CocoBrain: un coco abierto con un cerebro dentro"
            width="745"
            height="942"
            /* Margen negativo: la mascota sube y se solapa con el logotipo,
               como en el póster original. */
            className="-mt-[14%] w-[62%] max-w-[340px] sm:-mt-[22%] sm:w-full"
          />

          <div ref={copyRef} className="max-w-md self-end pb-4 sm:pb-16">
            <p className="text-balance text-2xl leading-[1.25] tracking-[-0.01em] sm:text-[27px]">
              Nuestra mayor <em className="not-italic text-coco-light">inspiración</em> fue
              una vez nuestra mayor{' '}
              <em className="not-italic text-coco-light">debilidad</em>.
            </p>

            <p className="mt-5 text-[15px] leading-relaxed text-coco-mid">
              Soy Alex. Construyo webs y aplicaciones, y las firmo como CocoBrain.
            </p>

            <a
              href="#contenido"
              className="mt-7 inline-block border-b-2 border-coco-dark pb-1 text-[15px] font-medium text-coco-dark transition-colors hover:border-brain-glow hover:text-brain-glow"
            >
              Ver proyectos
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
