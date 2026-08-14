import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, FrontSide, MathUtils, Vector3 } from 'three'
import gsap from 'gsap'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { usePointer } from '../../hooks/usePointer'
import { journey } from '../../journey/clock'
import { layerOpacity, ramp } from '../../journey/stages'

/**
 * Ojo con los nombres: los que puso Meshy no corresponden con lo que
 * contienen los archivos. `Coco_Thinker` es el que sostiene el cerebro en la
 * mano, y `Brainy_Coconut` es el pensativo.
 */
export const MASCOT_MODELS = {
  brain: '/preview/olaz-thinker.glb',
  thinker: '/preview/olaz-brain.glb',
}

const DRACO_PATH = '/draco/'

/**
 * Limites de la mirada.
 *
 * Estaban en 65 y 26 grados, y era demasiado: el personaje se pasaba el rato
 * girando de lado a lado y mareaba. Un gesto de atencion no necesita amplitud,
 * necesita direccion. Con 24 grados se entiende perfectamente que te sigue, y
 * ademas la cara se mantiene siempre de frente.
 */
const MAX_YAW = MathUtils.degToRad(24)
const MAX_PITCH = MathUtils.degToRad(11)

/** Bajo a proposito: el gesto llega despacio y se lee como calma, no como nervio. */
const LOOK_EASING = 0.055

/**
 * Tramo en el que el personaje se queda quieto.
 *
 * En cuanto empiezas a bajar deja de seguir al cursor y se para. Son dos
 * problemas de un tiro:
 *
 * 1. El cerebro de la mano cuelga del grupo que rota, asi que al girar el
 *    personaje el cerebro se movia —y la camara volaba a la posicion medida en
 *    reposo, no a donde estaba en ese momento. De ahi que "segun la posicion
 *    del cursor, la camara no va al cerebro".
 * 2. Un personaje que sigue moviendose mientras la camara se le echa encima
 *    compite con el movimiento de camara y ensucia la entrada.
 *
 * Ademas tiene sentido narrativo: te saluda mientras miras, y se queda quieto
 * cuando decides entrar.
 */
const SETTLE_RANGE = [0.02, 0.14]

/**
 * Distancia en pantalla, en coordenadas normalizadas, a la que la mirada
 * llega a su tope. 0.55 significa: separando el cursor algo mas de media
 * pantalla del personaje, ya esta girado del todo.
 *
 * Antes esto se resolvia proyectando el cursor al espacio 3D con `unproject`
 * a profundidad 0.5, pero con near 0.1 y far 100 ese punto cae a 0.4 unidades
 * de la camara: practicamente encima. El angulo resultante variaba unos dos
 * grados y por eso el seguimiento no se notaba.
 */
const LOOK_SATURATION = 0.85

// Inclinacion del cuerpo acompanando a la mirada. Es lo que hace que el
// gesto se note: girar solo sobre el eje vertical se lee como un maniqui
// rotando; inclinarse un poco se lee como interes.
const LEAN_AMOUNT = 0.05

/**
 * Vector reutilizado para medir la posicion en pantalla.
 *
 * Crear un `new Vector3()` dentro del bucle de render son sesenta objetos por
 * segundo que el recolector de basura tiene que limpiar. Cada limpieza es una
 * micropausa, y una micropausa en mitad de un scroll se ve como un tiron.
 */
const SCRATCH = new Vector3()

const BREATH_SPEED = 1.5
const BREATH_AMOUNT = 0.01

const FLOAT_AMPLITUDE = 0.02
const FLOAT_SPEED = 0.6

export default function Mascot3D({
  url,
  children,
  reaction = 0,
  startle = 0,
  turnAway = 0,
  lookEnabled = true,
  idleEnabled = true,
  /** Altura del personaje en unidades de mundo. Sale de `tokens.mascot.height`. */
  height = 3,
  /** Tope de anchura, tambien en unidades de mundo. */
  maxWidth = Infinity,
  /** Capa de `LAYERS` que decide cuando se desvanece. */
  layer = 'mascot',
  /** Punto del modelo cuya posicion en el mundo hay que medir y reportar. */
  anchorLocal = null,
  onAnchor,
  onPoke,
}) {
  const { scene } = useGLTF(url, DRACO_PATH)
  const camera = useThree((state) => state.camera)
  const reducedMotion = usePrefersReducedMotion()
  const pointer = usePointer()

  const fitRef = useRef(null)
  const motionRef = useRef(null)
  const breathRef = useRef(null)
  const jumpRef = useRef(null)
  // -1 para que el primer frame siempre escriba.
  const fadeRef = useRef(-1)

  /**
   * Los materiales se recogen UNA vez en una lista.
   *
   * Antes el desvanecido hacia `scene.traverse(...)` en cada frame. Recorrer
   * el grafo entero de una malla de noventa mil triangulos sesenta veces por
   * segundo, para tocar unas pocas opacidades, era una de las fuentes reales
   * de tirones. Recorrer y tocar son dos cosas distintas: lo que hay que hacer
   * cada frame es tocar.
   */
  const { tuned, materials } = useMemo(() => {
    const list = []

    scene.traverse((object) => {
      if (!object.isMesh || !object.material) return
      // Meshy exporta metallic-roughness que bajo un HDRI deja el coco con
      // brillo de plastico. Se anula y se sube la respuesta al entorno.
      object.material.metalness = 0
      object.material.envMapIntensity = 1.25
      /**
       * El exportador marca el material como de doble cara. En una malla
       * cerrada como esta no aporta nada y sale caro: desactiva el descarte de
       * caras traseras, asi que la tarjeta rasteriza tambien las mitad de los
       * triangulos que miran hacia el lado contrario y que nunca se ven.
       */
      object.material.side = FrontSide
      object.material.needsUpdate = true
      list.push(object.material)
    })

    return { tuned: scene, materials: list }
  }, [scene])

  /**
   * Encuadre en unidades de mundo, no en fraccion de pantalla.
   *
   * Antes el tamano salia del `viewport` de R3F, que se mide a la distancia a
   * la que esta la camara. Como la camara se mueve durante el recorrido, el
   * personaje se reescalaba mientras te acercabas: de ahi salia parte de la
   * sensacion de que "todo bailaba".
   *
   * Ahora Olaz mide lo que dice `tokens.mascot.height` y no cambia nunca. Solo
   * se comprueba que no se salga de ancho, porque en una pantalla alta y
   * estrecha el hueco horizontal es mucho menor que el vertical.
   */
  useLayoutEffect(() => {
    const group = fitRef.current
    if (!group) return

    group.scale.setScalar(1)
    group.position.set(0, 0, 0)

    const box = new Box3().setFromObject(group)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    if (size.y === 0) return

    const fit = Math.min(height / size.y, maxWidth / size.x)
    group.scale.setScalar(fit)
    group.position.set(-center.x * fit, -center.y * fit, -center.z * fit)

    /**
     * El cerebro de la mano es la puerta por la que entra la camara, asi que
     * su posicion tiene que ser la de verdad y no una estimacion. Se mide una
     * vez, al terminar el encuadre, y se reporta hacia arriba.
     */
    if (anchorLocal && onAnchor) {
      group.updateWorldMatrix(true, false)
      onAnchor(group.localToWorld(anchorLocal.clone()))
    }
  }, [tuned, height, maxWidth, anchorLocal, onAnchor])

  /** Salto con aplastado: la unica deformacion que aguanta una malla fusionada. */
  useEffect(() => {
    if (!reaction || reducedMotion) return

    const group = jumpRef.current
    const breath = breathRef.current
    if (!group || !breath) return

    // Matar el anterior antes de arrancar: si se solapan, tiembla.
    gsap.killTweensOf([group.position, breath.scale])

    const timeline = gsap.timeline()
    timeline
      .to(breath.scale, { x: 1.1, y: 0.86, duration: 0.11, ease: 'power2.out' })
      .to(group.position, { y: 0.32, duration: 0.3, ease: 'power2.out' }, '<')
      .to(breath.scale, { x: 0.93, y: 1.12, duration: 0.18, ease: 'power2.out' }, '<0.05')
      .to(group.position, { y: 0, duration: 0.26, ease: 'power2.in' })
      .to(breath.scale, { x: 1.14, y: 0.82, duration: 0.09, ease: 'power2.out' })
      .to(breath.scale, { x: 1, y: 1, duration: 0.6, ease: 'elastic.out(1, 0.42)' })

    return () => timeline.kill()
  }, [reaction, reducedMotion])

  /**
   * Respingo al empezar a bajar. Mas corto y mas seco que el salto: es un
   * susto, no una celebracion.
   */
  useEffect(() => {
    if (!startle || reducedMotion) return

    const group = jumpRef.current
    const breath = breathRef.current
    if (!group || !breath) return

    gsap.killTweensOf([group.position, breath.scale])

    const timeline = gsap.timeline()
    timeline
      .to(breath.scale, { x: 0.9, y: 1.16, duration: 0.09, ease: 'power3.out' })
      .to(group.position, { y: 0.14, duration: 0.16, ease: 'power3.out' }, '<')
      .to(group.position, { y: 0, duration: 0.32, ease: 'bounce.out' })
      .to(breath.scale, { x: 1, y: 1, duration: 0.45, ease: 'elastic.out(1, 0.4)' }, '<')

    return () => timeline.kill()
  }, [startle, reducedMotion])

  /**
   * Gestos de reposo.
   *
   * Ahora que los nodos viven dentro del cerebro, la primera pantalla se
   * queda sin nada que hacer aparte de seguir el cursor. Cada pocos segundos
   * el personaje hace algo por su cuenta: un brinco, un suspiro o un
   * bamboleo. Sin esto se lee como un modelo expuesto, no como alguien
   * esperando.
   *
   * Los intervalos son irregulares a proposito: a intervalo fijo el ojo
   * detecta el patron enseguida y deja de leerse como espontaneo.
   */
  useEffect(() => {
    if (reducedMotion || !idleEnabled) return

    let timer

    const play = () => {
      const jump = jumpRef.current
      const breath = breathRef.current
      if (!jump || !breath) return
      // No pisar un salto o un respingo en curso.
      if (gsap.isTweening(jump.position) || gsap.isTweening(breath.scale)) return
      // Ni arrancar uno si ya se esta bajando: el personaje tiene que estar
      // quieto cuando la camara se le acerca.
      if (journey.progress > 0.03) return

      const timeline = gsap.timeline()
      const gesture = Math.floor(Math.random() * 3)

      if (gesture === 0) {
        // Brinco corto.
        timeline
          .to(breath.scale, { x: 1.06, y: 0.92, duration: 0.1 })
          .to(jump.position, { y: 0.12, duration: 0.2, ease: 'power2.out' }, '<')
          .to(jump.position, { y: 0, duration: 0.24, ease: 'power2.in' })
          .to(breath.scale, { x: 1, y: 1, duration: 0.45, ease: 'elastic.out(1, 0.5)' }, '<')
      } else if (gesture === 1) {
        // Suspiro: se hincha despacio y se desinfla.
        timeline
          .to(breath.scale, { x: 0.97, y: 1.05, duration: 0.8, ease: 'sine.inOut' })
          .to(breath.scale, { x: 1.03, y: 0.97, duration: 0.5, ease: 'sine.inOut' })
          .to(breath.scale, { x: 1, y: 1, duration: 0.5, ease: 'sine.out' })
      } else {
        // Bamboleo lateral.
        timeline
          .to(jump.rotation, { z: 0.09, duration: 0.35, ease: 'sine.inOut' })
          .to(jump.rotation, { z: -0.07, duration: 0.5, ease: 'sine.inOut' })
          .to(jump.rotation, { z: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' })
      }
    }

    const schedule = () => {
      timer = setTimeout(() => {
        play()
        schedule()
      }, 5500 + Math.random() * 5500)
    }

    schedule()
    return () => clearTimeout(timer)
  }, [reducedMotion, idleEnabled])

  /**
   * Desvanecido por opacidad en vez de desmontar el modelo.
   *
   * Es lo que permite que la camara atraviese la portada sin tirones: la
   * malla sigue en memoria y en la GPU, solo deja de verse. Desmontarla a
   * mitad de recorrido era la causa de los saltos.
   */
  useFrame(() => {
    const fade = layerOpacity(layer, journey.progress)

    // Durante la mayor parte del recorrido el desvanecido no se mueve (vale 1
    // en la portada y 0 dentro del cerebro). Si no ha cambiado no hay nada que
    // escribir, y esos son casi todos los frames.
    if (Math.abs(fade - fadeRef.current) < 0.002) return
    fadeRef.current = fade

    const visible = fade > 0.01
    tuned.visible = visible
    if (!visible) return

    for (const material of materials) {
      material.transparent = fade < 0.999
      material.opacity = fade
      material.depthWrite = fade > 0.5
    }
  })

  useFrame((state) => {
    const motion = motionRef.current
    const breath = breathRef.current
    if (!motion || reducedMotion) return

    /**
     * Cuanto queda de "vida propia". Vale 1 en la portada y 0 en cuanto
     * empiezas a bajar. Multiplica a todo lo que se mueve por su cuenta, asi
     * que el personaje no se detiene de golpe: se va quedando quieto.
     */
    const alive = 1 - ramp(journey.progress, SETTLE_RANGE[0], SETTLE_RANGE[1])

    /**
     * Si empiezas a bajar con un gesto a medias, se corta y vuelve al reposo.
     * Dejarlo terminar significaria que el cerebro sigue moviendose justo
     * cuando la camara esta calculando hacia donde volar.
     */
    const jump = jumpRef.current
    if (jump && alive < 0.98) {
      if (gsap.isTweening(jump.position) || gsap.isTweening(jump.rotation)) {
        gsap.killTweensOf([jump.position, jump.rotation])
      }
      jump.position.y = MathUtils.lerp(jump.position.y, 0, 0.12)
      jump.rotation.z = MathUtils.lerp(jump.rotation.z, 0, 0.12)
    }

    const t = state.clock.elapsedTime
    motion.position.y = Math.sin(t * FLOAT_SPEED) * FLOAT_AMPLITUDE * alive

    if (breath && !gsap.isTweening(breath.scale)) {
      const value = Math.sin(t * BREATH_SPEED) * BREATH_AMOUNT * alive
      breath.scale.set(1 - value, 1 + value, 1 - value)
    }

    /**
     * Mirada, medida en pantalla y no en el espacio 3D.
     *
     * Se proyecta la posicion del personaje a coordenadas de pantalla y se
     * mide cuanto se aparta el cursor de el. Trabajar en 2D aqui no es una
     * simplificacion perezosa: el gesto que se busca —"te esta mirando a
     * ti"— es una relacion entre dos puntos de la pantalla, no entre dos
     * puntos del mundo.
     */
    let yaw = 0
    let pitch = 0

    if (lookEnabled && alive > 0.01) {
      const screen = motion.getWorldPosition(SCRATCH).project(camera)

      // `pointer` viene con +1 abajo y la proyeccion con +1 arriba.
      const dx = pointer.current.x - screen.x
      const dy = pointer.current.y + screen.y

      yaw = MathUtils.clamp((dx / LOOK_SATURATION) * MAX_YAW, -MAX_YAW, MAX_YAW) * alive
      pitch = MathUtils.clamp((dy / LOOK_SATURATION) * MAX_PITCH, -MAX_PITCH, MAX_PITCH) * alive
    }

    // `turnAway` va de 0 a 1 y suma media vuelta: es como se gira de espaldas
    // antes de entrar en el cerebro.
    const targetYaw = yaw + turnAway * Math.PI

    motion.rotation.y = MathUtils.lerp(motion.rotation.y, targetYaw, LOOK_EASING)
    motion.rotation.x = MathUtils.lerp(motion.rotation.x, pitch, LOOK_EASING)
    // El cuerpo se inclina hacia donde mira. Sin esto el giro se lee como un
    // maniqui sobre un plato giratorio.
    motion.rotation.z = MathUtils.lerp(
      motion.rotation.z,
      (-yaw / MAX_YAW) * LEAN_AMOUNT,
      LOOK_EASING,
    )
  })

  return (
    <group>
      <group ref={jumpRef}>
        <group ref={motionRef}>
          <group ref={breathRef}>
            <group
              ref={fitRef}
              onClick={
                onPoke &&
                ((event) => {
                  event.stopPropagation()
                  onPoke()
                })
              }
              onPointerOver={
                onPoke &&
                (() => {
                  document.body.style.cursor = 'pointer'
                })
              }
              onPointerOut={
                onPoke &&
                (() => {
                  document.body.style.cursor = ''
                })
              }
            >
              <primitive object={tuned} />
              {/* Los hijos van dentro del grupo escalado: sus coordenadas se
                  expresan en el espacio del modelo y acompanan al personaje. */}
              {children}
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
