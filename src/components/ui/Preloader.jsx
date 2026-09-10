import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useProgress } from '@react-three/drei'
import gsap from 'gsap'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { markCurtainLifted } from '../../state/curtain'
import { isWarmed, subscribeWarmup } from '../../state/warmup'
import { getVisualAsset } from '../../data/visualAssets'

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

/**
 * Posición del puño dentro de la imagen de Olaz, en fracción de su propio
 * recorte. Medida sobre los píxeles opacos de las primeras filas, no a ojo.
 *
 * Es el punto del que cuelga, así que es también el eje del balanceo: girar
 * desde el centro de la imagen se lee como un objeto dando vueltas, girar
 * desde la mano se lee como peso colgando.
 */
const FIST_ORIGIN = '35% 4%'

export default function Preloader() {
  // El logotipo y Olaz colgado, pedidos por nombre. Ni una ruta en este archivo.
  const wordmark = getVisualAsset('brand.wordmark')
  const hanging = getVisualAsset('brand.mascotHanging')

  const { progress, total, active } = useProgress()
  const [hidden, setHidden] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [minElapsed, setMinElapsed] = useState(false)
  const warmed = useSyncExternalStore(subscribeWarmup, isWarmed, () => true)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [])

  const rootRef = useRef(null)

  const barRef = useRef(null)
  const numberRef = useRef(null)

  const shownRef = useRef({ value: 0 })

  /**
   * ── LA MARCA SE COMPONE AL LLEGAR (fase 10G) ─────────────────────────────
   *
   * Antes había UN gesto —el nombre se escribía de izquierda a derecha con un
   * `clipPath`— y todo lo demás estaba puesto desde el primer frame: el
   * filete, "cargando" y el contador aparecían de golpe con la página. Eso es
   * exactamente lo que §6 describe para el editorial: la pantalla no se
   * componía, aparecía.
   *
   * Ahora es una secuencia con los mismos papeles que usa un área editorial
   * —filete, titular, y los metadatos al final— porque el vocabulario ya
   * existe y no hacía falta inventar otro:
   *
   *     0,00  el filete se traza de izquierda a derecha
   *     0,25  la MARCA sube desde debajo de su propia línea
   *     0,95  Olaz se descuelga de la C y se balancea
   *     1,15  "cargando" y el contador, cortos y con opacidad
   *
   * Todo cabe de sobra en los 2,6 s de `MIN_VISIBLE_MS`, así que la pantalla
   * se queda quieta casi un segundo antes de irse: la composición se ve
   * terminada, no interrumpida.
   *
   * ## Y el nombre YA NO SE RECORTA: sube
   *
   * El `clipPath` tenía dos problemas. Uno es de coste y está medido en §9:
   * animar un recorte rasteriza la capa entera en cada frame, y aquí eran 1,15
   * segundos de una imagen de 1200 px. El otro es de lectura — un barrido se
   * lee como algo que se IMPRIME, y lo que tiene que pasar aquí es que la
   * marca LLEGUE.
   *
   * Ahora es el gesto de `Mask`, el mismo que usa cualquier titular de esta
   * web: una banda con `overflow: hidden` que no se anima nunca, y dentro la
   * imagen subiendo desde debajo del renglón. Solo `transform` y `opacity`,
   * que son las dos que el compositor resuelve gratis.
   *
   * La banda mide exactamente lo que la imagen, así que en reposo no recorta
   * ni un píxel: las sombras del logotipo vienen horneadas DENTRO del archivo.
   *
   * ## Por qué no va letra a letra
   *
   * Es lo que Alex pidió, y no se puede con este material. Medida la cobertura
   * alfa del archivo columna a columna con tres umbrales distintos: **cero
   * huecos internos** — las letras se tocan, los dos cocos solapan a sus
   * vecinas y las sombras puentean el resto de x=8 a x=1191. Cualquier corte
   * pasa por encima del dibujo.
   *
   * Y la referencia de la que salió la idea (damrod.dev) tampoco parte letras:
   * comprobado en marcha, sus titulares son líneas enteras con
   * `fromTo(opacidad, desplazamiento)` escalonadas — que es esto. Para hacerlo
   * de verdad letra a letra haría falta el logotipo exportado en nueve piezas,
   * y eso es un asset y lo decide Alex. Queda anotado en §16.
   */
  /**
   * ── Y LA ENTRADA LA LLEVA EL COMPOSITOR, NO EL HILO PRINCIPAL ────────────
   *
   * Esta era una línea de tiempo de GSAP, o sea JavaScript escribiendo
   * `transform` y `opacity` en cada frame. En cualquier otro sitio de la web
   * eso es lo correcto y aquí no puede serlo, porque esta es la ÚNICA
   * animación que corre mientras el hilo principal está ocupado: detrás del
   * velo se monta React entero, se parsean los `.glb`, se subdivide la sala
   * interior y se compila cada material del recorrido.
   *
   * Medido contra el build, durante los 2,6 s de la entrada: **55 y 93 frames**
   * en dos pasadas, con 1,8 y 1,1 segundos de hilo bloqueado. Veintiún fps. La
   * composición no se veía lenta, se veía a TIRONES — y no se arregla
   * aligerando la carga, que es la que es, sino sacando la animación del hilo
   * que se bloquea.
   *
   * Ahora son `@keyframes` en `index.css`, con la misma coreografía número por
   * número. El compositor las corre con su propio reloj y les da igual que el
   * hilo esté parado un cuarto de segundo.
   *
   * Aquí solo queda la DECISIÓN de si hay entrada o no: sin `.cb-boot` no se
   * declara ni una interpolación y todo está en su sitio desde el primer
   * frame, que es lo que §12 pide con movimiento reducido. El reposo lo
   * declara el estilo y la animación solo lo toma prestado — la lección que
   * 10G pagó dejando a Olaz invisible.
   */


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

  /**
   * ── Y SE ESPERA AL PRECALENTAMIENTO, NO A UN RELOJ ──────────────────────
   *
   * Cargar no es estar listo. Cuando `useProgress` dice 100 lo que ha
   * terminado es la DESCARGA; `Warmup` empieza justo entonces a dibujar la
   * mente en veinticuatro paradas para que la primera compilación de cada
   * material no caiga durante el viaje, y eso son unos ciento cuarenta frames
   * —los más caros de toda la sesión, por construcción—.
   *
   * `MIN_VISIBLE_MS` se calibró contra un barrido de TRES paradas y desde
   * entonces no volvió a mirarse. Medido contra el build: el velo se retiraba
   * a los 3.966 ms con el barrido a media faena, así que lo primero que veía
   * el visitante era el interior del cerebro, y los dos frames más caros del
   * arranque —183 y 167 ms— se pagaban ya en pantalla.
   *
   * Así que el mínimo se queda —la composición de la marca necesita sus 2,6 s
   * para verse TERMINADA, que es lo de 10G— y se le suma una condición que no
   * caduca: que el barrido haya acabado. Lo dice él, en `state/warmup`.
   *
   * La red de seguridad ya existía y sigue siendo la última palabra:
   * `HARD_TIMEOUT_MS` retira el velo pase lo que pase. Una máquina en la que
   * el barrido no termine nunca —o sin WebGL— ve la escena a medio preparar,
   * que es exactamente el mal menor que ese tope existe para elegir.
   */
  useEffect(() => {
    if (dismissed || !minElapsed || total === 0 || progress < 100 || active || !warmed) return
    const timer = setTimeout(() => setDismissed(true), 300)
    return () => clearTimeout(timer)
  }, [progress, total, active, dismissed, minElapsed, warmed])

  useEffect(() => {
    if (!dismissed || !rootRef.current) return

    const tween = gsap.to(rootRef.current, {
      autoAlpha: 0,
      duration: 0.7,
      ease: 'power2.inOut',
      /*
        Y avisa de que el velo se ha ido. Lo escucha la entrada de la portada,
        que dura segundo y medio y no puede reproducirse detras de esto.

        Va en `onComplete` y no al empezar el desvanecido a proposito: durante
        esos 0,7 s el velo todavia tapa, asi que arrancar ahi seria perder la
        primera mitad de la composicion.
      */
      onComplete: () => {
        setHidden(true)
        markCurtainLifted()
      },
    })

    return () => tween.kill()
  }, [dismissed])

  if (hidden) return null

  return (
    <div
      ref={rootRef}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-cream px-6${
        reducedMotion ? '' : ' cb-boot'
      }`}
      role="status"
      aria-live="polite"
      aria-label="Cargando"
    >
      {/* El contenedor lleva la misma anchura que el logotipo, asi que Olaz
          se posiciona en porcentaje y queda colgado de la C a cualquier
          tamano de pantalla sin recalcular nada. */}
      <div className="relative w-[78vw] max-w-[460px]">
        {/*
          El logotipo va POR ENCIMA de Olaz, y ese orden es todo el truco.

          Con la mano dibujada delante de la C, el puño se leía flotando: está
          cerrado, pero no agarra nada. Poniéndolo detrás, el trazo de la letra
          tapa media mano y el cerebro completa el resto —da por hecho que los
          dedos siguen por detrás—. Es lo más cerca que se puede estar de
          agarrar con dos imágenes planas; agarrar de verdad exigiría que la C
          atravesara el puño, y eso ya es modelado.
        */}
        {/*
          La banda que recorta. No se anima NUNCA —la ley de `Type.jsx`: uno
          recorta y el otro se mueve— y mide exactamente lo que la imagen, así
          que en reposo no se pierde ni un píxel del logotipo. Las sombras del
          archivo vienen dentro de sus 1200 x 248.
        */}
        <div className="relative z-10 overflow-hidden">
          <img
            src={wordmark.src}
            srcSet={wordmark.srcSet}
            sizes="(max-width: 640px) 78vw, 460px"
            alt="CocoBrain"
            width={wordmark.width}
            height={wordmark.height}
            className="cb-boot-mark block h-auto w-full"
          />
        </div>

        {/* Colgado del arco inferior de la C. El recorte viene sobre blanco
            puro, así que el fondo se va entero con relleno por difusión desde
            los bordes y no queda cerco —el intento anterior salía de una
            imagen sobre crema y arrastraba el halo de su sombra. */}
        <span
          className="cb-boot-olaz-in absolute left-[-1%] top-[64%] block w-[24%]"
          style={{ transformOrigin: FIST_ORIGIN }}
        >
        <img
          src={hanging.src}
          srcSet={hanging.srcSet}
          sizes="(max-width: 640px) 19vw, 110px"
          alt=""
          aria-hidden="true"
          width={hanging.width}
          height={hanging.height}
          // Colocado para que el puño caiga sobre el arco inferior de la C, no
          // al lado. Las cifras salen de la posición medida del puño dentro de
          // su propio recorte, no de probar valores hasta que cuadra.
          /*
            ── EL REPOSO DE OLAZ NO PUEDE VIVIR EN LA LÍNEA DE TIEMPO (10G) ──

            Llevaba `opacity-0` en la clase y quien lo encendía era el
            `fromTo` de la entrada. Con `prefers-reduced-motion` esa línea de
            tiempo no llega a montarse —vuelve antes— así que **Olaz no
            aparecía nunca**: comprobado contra el build, opacidad 0 y visible,
            o sea montado y en blanco. Es justo lo que §12 prohíbe: con
            movimiento reducido el contenido tiene que estar donde tiene que
            estar desde el primer frame.

            Ahora el reposo lo declara el estilo —colgando, en su ángulo final
            de balanceo— y GSAP solo lo toma prestado mientras anima. Un dueño
            por propiedad sigue cumpliéndose: mientras la entrada corre, el
            `transform` es de GSAP; cuando no corre, no hay entrada que pisar.
          */
          className="cb-boot-olaz block w-full"
          style={{ transformOrigin: FIST_ORIGIN, transform: 'rotate(-3deg)' }}
        />
        </span>
      </div>

      {/* Hueco calculado, no elegido: Olaz cuelga hasta un 25% de la anchura
          del logotipo por debajo de él. Con menos margen, la fila del contador
          le tapaba las zapatillas por la mitad. */}
      <div className="cb-boot-meta mt-36 flex w-[78vw] max-w-[460px] items-end justify-between">
        <span className="font-mono text-[11px] text-coco-mid">cargando</span>
        <span
          ref={numberRef}
          className="font-mono text-[11px] tabular-nums text-coco-dark"
        >
          00
        </span>
      </div>

      <div
        className="cb-boot-rule mt-2 h-px w-[78vw] max-w-[460px] origin-left bg-coco-light/35"
      >
        <div
          ref={barRef}
          className="h-px origin-left bg-coco-dark"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>
    </div>
  )
}
