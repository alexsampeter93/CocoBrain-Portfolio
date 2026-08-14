import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, MathUtils, Vector3 } from 'three'
import gsap from 'gsap'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { usePointer } from '../../hooks/usePointer'
import { journey } from '../../journey/clock'
import { ramp } from '../../journey/stages'

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
 * Encuadre: se respeta el limite mas restrictivo de los dos.
 *
 * Ajustar solo por altura funcionaba en escritorio y rompia en movil: en una
 * pantalla alta y estrecha, el alto visible en unidades de mundo es grande y
 * el personaje se salia por los lados.
 */
const FILL_HEIGHT = 0.72
const FILL_WIDTH = 0.58

/**
 * Limites de la mirada. 65 grados es lo maximo que deja la cara legible:
 * mas alla se lee como "se ha dado la vuelta", no como "esta mirando".
 */
const MAX_YAW = MathUtils.degToRad(65)
const MAX_PITCH = MathUtils.degToRad(26)
const LOOK_EASING = 0.11

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
const LOOK_SATURATION = 0.55

// Inclinacion del cuerpo acompanando a la mirada. Es lo que hace que el
// gesto se note: girar solo sobre el eje vertical se lee como un maniqui
// rotando; inclinarse un poco se lee como interes.
const LEAN_AMOUNT = 0.1

const BREATH_SPEED = 1.5
const BREATH_AMOUNT = 0.016

const FLOAT_AMPLITUDE = 0.045
const FLOAT_SPEED = 0.6

export default function Mascot3D({
  url,
  children,
  reaction = 0,
  startle = 0,
  turnAway = 0,
  lookEnabled = true,
  idleEnabled = true,
  fillWidth = FILL_WIDTH,
  fillHeight = FILL_HEIGHT,
  fadeRange = null,
  onPoke,
}) {
  const { scene } = useGLTF(url, DRACO_PATH)
  const camera = useThree((state) => state.camera)
  const viewport = useThree((state) => state.viewport)
  const reducedMotion = usePrefersReducedMotion()
  const pointer = usePointer()

  const fitRef = useRef(null)
  const motionRef = useRef(null)
  const breathRef = useRef(null)
  const jumpRef = useRef(null)
  const fadeRef = useRef(1)

  const tuned = useMemo(() => {
    scene.traverse((object) => {
      if (!object.isMesh || !object.material) return
      // Meshy exporta metallic-roughness que bajo un HDRI deja el coco con
      // brillo de plastico. Se anula y se sube la respuesta al entorno.
      object.material.metalness = 0
      object.material.envMapIntensity = 1.25
      object.material.needsUpdate = true
    })
    return scene
  }, [scene])

  useLayoutEffect(() => {
    const group = fitRef.current
    if (!group) return

    group.scale.setScalar(1)
    group.position.set(0, 0, 0)

    const box = new Box3().setFromObject(group)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    if (size.y === 0) return

    const fit = Math.min(
      (viewport.height * fillHeight) / size.y,
      (viewport.width * fillWidth) / size.x,
    )
    group.scale.setScalar(fit)
    group.position.set(-center.x * fit, -center.y * fit, -center.z * fit)
  }, [tuned, viewport.height, viewport.width, fillWidth, fillHeight])

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
    const fade = fadeRange ? 1 - ramp(journey.progress, fadeRange[0], fadeRange[1]) : 1
    fadeRef.current = fade

    const visible = fade > 0.01
    tuned.visible = visible
    if (!visible) return

    tuned.traverse((object) => {
      if (!object.isMesh || !object.material) return
      object.material.transparent = fade < 0.999
      object.material.opacity = fade
      object.material.depthWrite = fade > 0.5
    })
  })

  useFrame((state) => {
    const motion = motionRef.current
    const breath = breathRef.current
    if (!motion || reducedMotion) return

    const t = state.clock.elapsedTime
    motion.position.y = Math.sin(t * FLOAT_SPEED) * FLOAT_AMPLITUDE

    if (breath && !gsap.isTweening(breath.scale)) {
      const value = Math.sin(t * BREATH_SPEED) * BREATH_AMOUNT
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

    if (lookEnabled) {
      const screen = motion.getWorldPosition(new Vector3()).project(camera)

      // `pointer` viene con +1 abajo y la proyeccion con +1 arriba.
      const dx = pointer.current.x - screen.x
      const dy = pointer.current.y + screen.y

      yaw = MathUtils.clamp((dx / LOOK_SATURATION) * MAX_YAW, -MAX_YAW, MAX_YAW)
      pitch = MathUtils.clamp((dy / LOOK_SATURATION) * MAX_PITCH, -MAX_PITCH, MAX_PITCH)
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
