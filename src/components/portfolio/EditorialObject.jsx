import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Environment, useGLTF } from '@react-three/drei'
import { ACESFilmicToneMapping, Box3, MathUtils, SRGBColorSpace, Vector3 } from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { createPose } from '../../animations/pose'
import { useScrollVelocity } from '../../animations/velocity'

gsap.registerPlugin(ScrollTrigger)

/**
 * ── UN OBJETO 3D DENTRO DEL EDITORIAL ───────────────────────────────────────
 *
 * ## Por qué esto NO va en el canvas del recorrido
 *
 * Es la pregunta que decidió la fase, y está contestada con tres mediciones:
 *
 * 1. **El canvas global vale 0,06 durante todo el editorial.** `SceneRetreat`
 *    escribe la opacidad del elemento entero para que se pueda leer el texto.
 *    Un objeto dibujado ahí se vería al 6% y no recibiría el puntero. Bajar esa
 *    retirada para que se vea rompería justo lo que hace legible la página.
 * 2. **`View` de drei se salta el compositor.** Su código llama a
 *    `state.gl.render(...)` con tijera, y en esta web la curva ACES la aplica
 *    `<ToneMapping>` DENTRO del `EffectComposer` — lo que hay documentado como
 *    "el fallo más caro que ha tenido esta web". Un modelo pintado por `View`
 *    saldría lineal y recortado a uno: fuera de la paleta.
 * 3. **La escena global ya dibuja 63.955 triángulos detrás del texto**, al 6%.
 *    Añadirle geometría es pagarla entera todo el rato para que casi no se vea.
 *
 * Así que este objeto trae su propio contexto, minúsculo, y **no toca nada**:
 * ni `World.jsx`, ni el recorrido, ni el compositor, ni la retirada.
 *
 * ## Lo que hace que sea barato, que es lo que lo justifica
 *
 * - **`frameloop="demand"`.** No hay bucle de render. Solo se dibuja cuando
 *   algo cambia y alguien llama a `invalidate()`. Quieto, cuesta cero.
 * - **Se monta tarde y se desmonta lejos.** Un `IntersectionObserver` con
 *   histéresis: entra cuando falta media pantalla, sale cuando ya hay dos por
 *   medio. Sin histéresis, pasar por el borde monta y desmonta un contexto
 *   WebGL varias veces por segundo.
 * - **Fuera en pantallas estrechas.** El presupuesto de móvil del manual son
 *   60.000 triángulos y la escena ya va por encima; añadir 35.000 más para un
 *   objeto decorativo no se sostiene. En móvil el hueco no se reserva.
 * - **Sin postproceso.** La curva ACES se pone en el renderizador, que es
 *   donde no cuesta un pase extra.
 *
 * ## Cómo se mueve, y la única excepción a la ley de la casa
 *
 * Lo principal sigue saliendo del scroll: el objeto llega desde la profundidad
 * y gira mientras la página baja. Al pararse se para y al subir se deshace. El
 * puntero solo lo inclina, y solo donde hay puntero de verdad.
 *
 * **Y desde la fase 6C.1 hay una excepción, deliberada: la vuelta ocasional.**
 * Cada diez segundos el objeto da una vuelta lenta sobre sí mismo para que se
 * le vean todas las caras, y eso sí tiene reloj propio.
 *
 * La ley —"lo único que puede mover la escena es el scroll"— se escribió para
 * el RECORRIDO, donde un latido temporal rompe dos cosas concretas: que la
 * misma posición de scroll dé el mismo cuadro, y que un emisivo que crece por
 * su cuenta cruce el umbral del bloom y parpadee. Aquí no aplica ninguna de las
 * dos: este objeto está fuera del recorrido, no pasa por el compositor y no lo
 * mide ningún script de reversibilidad. Lo que sí se conserva es el motivo de
 * fondo de aquella regla —que nada consuma con el visitante quieto— y por eso
 * la vuelta no enciende el bucle de render: pide frames solo mientras gira, y
 * solo si el objeto está en pantalla.
 */

/**
 * `?obj3d=0` apaga los objetos editoriales.
 *
 * Es el mismo mecanismo que ya tienen `?glass=0`, `?bloom=0`, `?corridor=0` y
 * `?grain=0`, y existe por el mismo motivo: **para poder atribuir un coste hay
 * que poder comparar con y sin sobre el MISMO build**. Sin este interruptor, la
 * única forma de saber qué cuestan sería medir dos compilaciones distintas, que
 * es justo la clase de medición que este proyecto tiene prohibida.
 */
const enabled = () => {
  if (typeof window === 'undefined') return true
  return new URLSearchParams(window.location.search).get('obj3d') !== '0'
}

/** Cuánto gira en toda su travesía por la pantalla. Media vuelta escasa. */
const TURN = Math.PI * 0.45
/** Y de qué tamaño arranca. Termina siempre en el que le toca. */
const BORN = 0.72
/**
 * ── Y CUÁNTO SE GIRA CUANDO BAJAS DEPRISA ───────────────────────────────────
 *
 * Seis grados escasos a velocidad máxima. Es el canal `rush` de la pose y es
 * la aplicación más pequeña posible de `useScrollVelocity`: el objeto no se
 * mueve de sitio, solo cede un poco sobre su eje —como cede algo que tiene
 * inercia— y vuelve solo al soltar.
 *
 * Está aquí y no en las capturas porque un objeto es lo único de la página que
 * tiene un eje propio. Y es pequeño a propósito: por encima de diez grados deja
 * de leerse como peso y pasa a leerse como un efecto de scroll.
 */
const RUSH = 0.1
/** Y cuánto lo inclina el cursor, como mucho. */
const TILT = 0.16

/**
 * El modelo, centrado en su caja y escalado a una unidad.
 *
 * El `.glb` no viene centrado en su origen —ya pasó con el cerebro— así que se
 * mide y se coloca. Es la misma cuenta del visor de auditoría de la fase 5D.2.
 */
function Model({ url, pose }) {
  const { scene } = useGLTF(url, '/draco/')

  const prepared = useMemo(() => {
    const root = scene.clone(true)
    const box = new Box3().setFromObject(root)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const scale = 1 / Math.max(size.x, size.y, size.z)
    root.scale.setScalar(scale)
    root.position.set(-center.x * scale, -center.y * scale, -center.z * scale)
    return root
  }, [scene])

  /*
    Dos niveles, y hacen falta los dos: el hijo lleva el CENTRADO y el ajuste
    de tamaño del modelo —que dependen de su caja y no cambian nunca— y el
    padre lleva la ENTRADA, que sí se mueve con el scroll.

    Con un solo nivel, escribir `position.z` o `scale` para la entrada
    machacaría el centrado, y el objeto se descolocaría al entrar. Un dueño
    por transformación, la misma regla que ya ordena las capas de una captura.
  */
  return (
    <group ref={pose}>
      <primitive object={prepared} />
    </group>
  )
}

/**
 * Publica `invalidate` hacia fuera del canvas.
 *
 * Quien mueve el objeto es un `ScrollTrigger`, que vive en el DOM y no dentro
 * del reconciliador de react-three-fiber. Con `frameloop="demand"` alguien
 * tiene que pedir el frame, y este es el puente.
 */
function Bridge({ onReady }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => onReady(invalidate), [invalidate, onReady])
  return null
}

/**
 * `coda` es la variante del cierre, y solo la usa Olaz en Contacto.
 *
 * Llega desde 4,2 unidades en vez de 2,4, así que a mitad de su entrada mide
 * un 15% menos que cualquier otro objeto y en el primer tercio un 24% menos.
 * Es la única concesión teatral de todo el editorial y se la lleva el último
 * objeto de la página, que es donde llegar de lejos se lee como un final.
 *
 * ── LA TEATRALIDAD ES PROFUNDIDAD, Y NO PUEDE SER DURACIÓN ───────────────
 *
 * El primer intento fue las dos cosas: de más lejos Y más despacio
 * (`span` 0,58). No se podía, y la medición dice por qué. El disparador de
 * este objeto va de `top bottom` a `bottom top`, así que su progreso solo
 * llega a uno cuando el objeto sale por arriba — y **el último objeto de la
 * página nunca sale por arriba**, porque el documento se acaba antes. Medido
 * sobre el build, el progreso máximo que alcanza Olaz con la página en su
 * tope:
 *
 *     2560x1440  0,319      1920x1080  0,364      1280x1024  0,372
 *     1920x1200  0,351      1512x982   0,378
 *
 * Con 0,58 se quedaba clavado a mitad de camino —al 92% de su tamaño y a una
 * unidad y cuarto de profundidad— para siempre y en todas las pantallas. Un
 * tramo de entrada más largo que el scroll que queda por debajo no es una
 * entrada lenta: es una entrada que no termina.
 *
 * Y acortarlo tampoco valía. Con 0,26 el objeto llegaba ANTES que los demás, y
 * como parte de más lejos y termina antes, las dos curvas se CRUZAN: primero
 * más pequeño, después más grande, y en el medio idénticas. Eso no es una
 * entrada de más lejos, es un tirón.
 *
 * Así que la coda conserva el MISMO tramo que todos —0,34, que cabe en el peor
 * caso medido con un margen del 0,5% de escala— y lo único que cambia es la
 * distancia. Con la misma curva y más profundidad, la coda es más pequeña que
 * las demás en todos y cada uno de los puntos de su entrada, y las dos llegan
 * juntas al mismo sitio. Es lo que además se ve mejor: la parte lejana del
 * viaje apenas se mueve en pantalla —la perspectiva la comprime— así que más
 * profundidad no se lee como más velocidad, se lee como más lejos.
 *
 * No cambia nada más: misma escala final, misma rotación, mismo dueño de
 * `rotation.y`, misma vuelta ocasional.
 */
const ARRIVAL = {
  normal: { depth: 2.4, span: 0.34 },
  coda: { depth: 4.2, span: 0.34 },
}

export default function EditorialObject({ model, className = '', style, arrival = 'normal', cue }) {
  const host = useRef(null)
  const pose = useRef(null)
  const invalidateRef = useRef(null)
  const pointer = useRef({ x: 0, y: 0 })
  /*
    ── LA POSE, POR CANALES ────────────────────────────────────────────────

    Cuatro cosas quieren mover este objeto a la vez —el scroll, la vuelta
    ocasional, el cursor y ahora la velocidad— y `rotation.y` es un número.
    Ninguna de las cuatro lo escribe: cada una escribe SU canal y el aplicador
    de `createPose` es el único que toca el grupo.

    Es la misma ley que ordena las cuatro capas de una captura, aplicada a una
    propiedad en vez de a un elemento — y es lo que hace que añadir la quinta
    influencia sea añadir un canal y un sumando, no reescribir esto.
  */
  const rig = useRef(null)
  const [live, setLive] = useState(false)
  const [roomy, setRoomy] = useState(false)
  const reduced = usePrefersReducedMotion()

  /*
    En pantalla estrecha no hay objeto. No es una degradación: es que el
    presupuesto de móvil ya está gastado y un adorno no puede ser lo que lo
    rompa. Se decide con una media query, no con el ancho del render, para que
    girar el teléfono no monte un contexto WebGL a mitad de lectura.
  */
  useEffect(() => {
    if (!enabled()) return
    const mq = window.matchMedia('(min-width: 1024px)')
    const apply = () => setRoomy(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  /* Montaje perezoso con histéresis: media pantalla para entrar, dos para salir. */
  useEffect(() => {
    const el = host.current
    if (!el || !roomy) return

    const near = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setLive(true),
      { rootMargin: '50% 0px' },
    )
    const far = new IntersectionObserver(
      ([entry]) => !entry.isIntersecting && setLive(false),
      { rootMargin: '200% 0px' },
    )
    near.observe(el)
    far.observe(el)
    return () => {
      near.disconnect()
      far.disconnect()
    }
  }, [roomy])

  /* El giro sale del scroll. Y el puntero solo inclina. */
  useLayoutEffect(() => {
    const el = host.current
    if (!el || !live || reduced) return

    const draw = () => invalidateRef.current?.()

    /*
      ── UN SOLO DUEÑO PARA `rotation.y` ───────────────────────────────────

      Hay DOS cosas que quieren girar el objeto —el scroll y la vuelta
      ocasional— y solo puede haber un escritor, o una pisa a la otra sin
      avisar. Así que ninguna de las dos escribe: las dos guardan su valor y
      esta función los SUMA y lo aplica.

      Es la misma regla que ordena las cuatro capas de una captura, aquí
      aplicada a una propiedad en vez de a un elemento.
    */
    const stage = createPose(
      (c) => {
        const group = pose.current
        if (!group) return
        group.rotation.y = -TURN / 2 + c.scroll * TURN + c.spin + c.rush
        group.rotation.x = c.tiltX
        group.rotation.z = c.tiltZ
        group.position.z = c.z
        group.scale.setScalar(c.size)
        draw()
      },
      { scroll: 0, spin: 0, rush: 0, tiltX: 0, tiltZ: 0, z: 0, size: 1 },
    )
    rig.current = stage

    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        if (!pose.current) return

        /*
          ── LLEGA DESDE EL FONDO ─────────────────────────────────────────

          El objeto no aparece: VIENE. Durante el primer tercio de su
          travesía sale de 2,4 unidades de profundidad y crece de 0,72 a uno,
          así que cuando el nombre del proyecto termina de subir, el objeto
          acaba de llegar a su sitio. Los dos gestos son el mismo tiempo —el
          scroll— y por eso se leen como una sola entrada y no como dos
          animaciones que coinciden.

          Es lo único de la web que usa la profundidad de verdad para entrar,
          y puede hacerlo justamente porque es 3D: una imagen que se escala
          es una imagen que se escala; un objeto que se acerca tiene
          perspectiva, y el escorzo cambia mientras viene.

          `smootherstep` y no una rampa lineal: al llegar tiene que FRENAR.
          Un objeto que se detiene en seco a la velocidad a la que venía se
          lee como un corte de vídeo.
        */
        const { depth, span } = ARRIVAL[arrival] ?? ARRIVAL.normal
        const t = Math.min(1, self.progress / span)
        const ease = t * t * t * (t * (t * 6 - 15) + 10)

        // Tres canales de una vez: una sola recomposición y un solo frame.
        stage.setAll({
          scroll: self.progress,
          z: -depth * (1 - ease),
          size: BORN + (1 - BORN) * ease,
        })
      },
    })

    /*
      ── LA VUELTA OCASIONAL ───────────────────────────────────────────────

      El objeto está quieto y de vez en cuando da una vuelta lenta sobre sí
      mismo, para que se le vean todas las caras. No es un spinner: es una
      pieza expuesta que alguien gira despacio y vuelve a dejar.

      Tres decisiones que lo separan de una animación de carga:

      - **la vuelta dura 3,2 s y el intervalo entre vueltas es de 7**, o sea
        una vuelta cada diez segundos y el objeto quieto dos tercios del
        tiempo. Si girase seguido dejaría de ser una pieza y pasaría a ser un
        elemento de interfaz;
      - **`power2.inOut`**: arranca de la nada y frena hasta pararse. Con una
        curva lineal se ve el momento exacto en que empieza y en que acaba, y
        eso es lo que delata un bucle;
      - **el ángulo se ACUMULA en el mismo dueño que el scroll**, así que
        girar con la rueda mientras da la vuelta compone los dos movimientos
        en vez de que uno cancele al otro.

      ## Y no enciende el bucle de render

      El canvas sigue en `frameloop="demand"`. La animación no dibuja: escribe
      un número y llama a `invalidate()`, así que solo hay frames MIENTRAS
      gira. En reposo el coste es exactamente el de antes: cero.

      Y solo gira lo que se está viendo. El canvas ya se desmonta cuando el
      objeto queda lejos, pero entre "montado" y "en pantalla" hay media
      pantalla de margen: sin este observador, un objeto montado y fuera de
      cuadro seguiría pidiendo frames para un giro que nadie ve.
    */
    const turn = gsap.to(stage.channels, {
      spin: Math.PI * 2,
      duration: 3.2,
      ease: 'power2.inOut',
      repeat: -1,
      repeatDelay: 7,
      paused: true,
      onUpdate: stage.apply,
      // Cada vuelta vuelve a empezar en cero: el ángulo es equivalente a 2π y
      // así el número no crece sin límite en una sesión larga.
      onRepeat: () => {
        stage.channels.spin = 0
      },
    })

    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? turn.play() : turn.pause()),
      { threshold: 0.2 },
    )
    io.observe(el)

    const onMove = (event) => {
      const rect = el.getBoundingClientRect()
      pointer.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.current.y = ((event.clientY - rect.top) / rect.height) * 2 - 1
      if (!pose.current) return
      stage.setAll({
        tiltX: MathUtils.clamp(pointer.current.y * TILT, -TILT, TILT),
        tiltZ: MathUtils.clamp(-pointer.current.x * TILT * 0.4, -TILT, TILT),
      })
    }
    // Solo donde hay cursor: en táctil no hay nada que seguir y el listener
    // sobra.
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (fine) window.addEventListener('pointermove', onMove, { passive: true })

    return () => {
      st.kill()
      turn.kill()
      io.disconnect()
      if (fine) window.removeEventListener('pointermove', onMove)
      rig.current = null
    }
  }, [live, reduced, arrival])

  /*
    ── EL OBJETO NOTA LA PRISA ─────────────────────────────────────────────

    Un canal más, y por eso cabe en cuatro líneas: la velocidad no escribe
    `rotation.y`, escribe `rush`, y el aplicador ya sabe sumarlo a lo que
    estén haciendo el scroll, la vuelta y el cursor.

    Solo mientras el objeto está vivo —montado y cerca— así que un objeto
    desmontado no aparece en la lista de suscriptores de la fuente.
  */
  const onVelocity = useCallback((v) => rig.current?.set('rush', v * RUSH), [])
  useScrollVelocity(onVelocity, { enabled: live && roomy && !reduced })

  if (!roomy) return null

  return (
    /*
      `aria-hidden` y sin texto alternativo, a propósito: esto es identidad
      visual, no contenido. Lo que la sección tiene que decir lo dice su texto,
      que es DOM real y no depende de que haya WebGL. Un lector de pantalla no
      se pierde nada, y con `pointer-events: none` tampoco se cuela en el orden
      de tabulación ni intercepta un clic.
    */
    <div
      ref={host}
      /*
        El hueco se puede señalar desde fuera aunque el canvas todavía no esté
        montado. Es lo que permite a las herramientas medir la entrada: sin
        esto solo hay canvas, y el canvas no existe hasta que el objeto ya ha
        empezado a llegar.
      */
      data-object3d={arrival}
      /* El papel que hace dentro de la escena de su sección, si le toca uno.
         El hueco es DOM y entra con el resto de la composición; la llegada
         desde la profundidad la sigue haciendo el objeto en 3D. */
      data-cue={cue}
      style={style}
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      {live && (
        <Canvas
          frameloop="demand"
          dpr={[1, 1.75]}
          camera={{ position: [0, 0, 2.6], fov: 32 }}
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: 'low-power',
            // La misma curva que el mundo grande, puesta donde no cuesta un
            // pase de postproceso.
            toneMapping: ACESFilmicToneMapping,
            outputColorSpace: SRGBColorSpace,
          }}
          style={{ width: '100%', height: '100%' }}
          onCreated={({ invalidate }) => invalidate()}
        >
          <Bridge onReady={(fn) => (invalidateRef.current = fn)} />
          {/*
            El MISMO HDRI que ilumina el recorrido. Dos motivos: ya está en la
            caché del navegador —no es una petición nueva— y hace que el objeto
            comparta la luz del mundo del que sale, que es lo que impide que se
            lea como una calcomanía pegada encima de la página.
          */}
          <Environment files="/hdri/studio.hdr" environmentIntensity={0.9} />
          <directionalLight position={[2.4, 3.2, 2.6]} intensity={1.6} color="#F5EFE6" />
          <directionalLight position={[-2.2, 0.6, -1.8]} intensity={0.5} color="#E9CDBD" />
          <Suspense fallback={null}>
            <Model url={model} pose={pose} />
          </Suspense>
        </Canvas>
      )}
    </div>
  )
}
