import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, MathUtils, Vector3 } from 'three'
import gsap from 'gsap'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { usePointer } from '../../hooks/usePointer'

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

const FILL_HEIGHT = 0.72

/**
 * Limites de la mirada. 65 grados es lo maximo que deja la cara legible:
 * mas alla se lee como "se ha dado la vuelta", no como "esta mirando".
 */
const MAX_YAW = MathUtils.degToRad(65)
const MAX_PITCH = MathUtils.degToRad(26)
const LOOK_EASING = 0.11

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

    const fit = (viewport.height * FILL_HEIGHT) / size.y
    group.scale.setScalar(fit)
    group.position.set(-center.x * fit, -center.y * fit, -center.z * fit)
  }, [tuned, viewport.height])

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
     * Mirada: se proyecta el cursor al espacio 3D y se apunta al punto, en
     * vez de rotar en proporcion a la posicion del raton. Asi mira de verdad
     * a donde esta el cursor —botones incluidos— y los topes impiden que
     * llegue a darse la vuelta.
     */
    let yaw = 0
    let pitch = 0

    if (lookEnabled) {
      const target = new Vector3(pointer.current.x, -pointer.current.y, 0.5).unproject(camera)
      const origin = motion.getWorldPosition(new Vector3())
      const toTarget = target.sub(origin)

      yaw = MathUtils.clamp(Math.atan2(toTarget.x, toTarget.z), -MAX_YAW, MAX_YAW)
      pitch = MathUtils.clamp(
        -Math.atan2(toTarget.y, Math.hypot(toTarget.x, toTarget.z)),
        -MAX_PITCH,
        MAX_PITCH,
      )
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
            <group ref={fitRef}>
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
