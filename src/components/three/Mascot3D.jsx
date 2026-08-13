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
 * mano, y `Brainy_Coconut` es el pensativo. Las claves de aqui si describen
 * lo que se ve.
 */
export const MASCOT_MODELS = {
  brain: '/preview/olaz-thinker.glb',
  thinker: '/preview/olaz-brain.glb',
}

const DRACO_PATH = '/draco/'

const FILL_HEIGHT = 0.72

/**
 * Limites de la mirada.
 *
 * El giro completo era un error: al llevar el cursor a los botones, Olaz
 * daba media vuelta y ensenaba la espalda. Una persona gira la cabeza hacia
 * lo que mira, no se da la vuelta. 55 grados a cada lado es el maximo que
 * mantiene la cara visible.
 */
const MAX_YAW = MathUtils.degToRad(55)
const MAX_PITCH = MathUtils.degToRad(22)
const LOOK_EASING = 0.09

// Respiracion: escala no uniforme, muy corta. El cuerpo se ensancha un pelo
// mientras se acorta, que es lo que hace que parezca que respira en vez de
// que se infla.
const BREATH_SPEED = 1.5
const BREATH_AMOUNT = 0.016

const FLOAT_AMPLITUDE = 0.045
const FLOAT_SPEED = 0.6

export default function Mascot3D({ url, children, reaction = 0 }) {
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
      // Meshy exporta un mapa metallic-roughness que bajo un HDRI deja el
      // coco con brillo de plastico. Se anula y se sube la respuesta al
      // entorno, que es de donde sale el volumen.
      object.material.metalness = 0
      object.material.envMapIntensity = 1.25
      object.material.needsUpdate = true
    })
    return scene
  }, [scene])

  /** Encuadre automatico: el GLB no viene ni centrado ni a escala conocida. */
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

  /**
   * Salto con aplastado al aterrizar.
   *
   * Es la unica deformacion permitida con una malla fusionada: escalar el
   * cuerpo entero de forma no uniforme. Da mucho caracter y no necesita
   * piezas separadas.
   */
  useEffect(() => {
    if (!reaction || reducedMotion) return

    const group = jumpRef.current
    const breath = breathRef.current
    if (!group || !breath) return

    // Matar el anterior antes de arrancar: si se solapan, el personaje
    // tiembla.
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

  useFrame((state) => {
    const motion = motionRef.current
    const breath = breathRef.current
    if (!motion || reducedMotion) return

    const t = state.clock.elapsedTime
    motion.position.y = Math.sin(t * FLOAT_SPEED) * FLOAT_AMPLITUDE

    // Respiracion, solo si no hay un salto en curso pisando la escala.
    if (breath && !gsap.isTweening(breath.scale)) {
      const breathValue = Math.sin(t * BREATH_SPEED) * BREATH_AMOUNT
      breath.scale.set(1 - breathValue, 1 + breathValue, 1 - breathValue)
    }

    /**
     * Mirada: se proyecta el cursor al espacio 3D y se apunta hacia el punto,
     * en vez de rotar en proporcion a la posicion del raton. La diferencia es
     * que asi mira de verdad a donde esta el cursor —incluidos los botones—
     * y los limites impiden que llegue a darse la vuelta.
     */
    const target = new Vector3(pointer.current.x, -pointer.current.y, 0.5).unproject(camera)
    const origin = motion.getWorldPosition(new Vector3())
    const toTarget = target.sub(origin)

    const yaw = MathUtils.clamp(Math.atan2(toTarget.x, toTarget.z), -MAX_YAW, MAX_YAW)
    const pitch = MathUtils.clamp(
      -Math.atan2(toTarget.y, Math.hypot(toTarget.x, toTarget.z)),
      -MAX_PITCH,
      MAX_PITCH,
    )

    // Lerp siempre: sin suavizado persigue el raton a tirones y parece un
    // objeto arrastrado, no un personaje mirando.
    motion.rotation.y = MathUtils.lerp(motion.rotation.y, yaw, LOOK_EASING)
    motion.rotation.x = MathUtils.lerp(motion.rotation.x, pitch, LOOK_EASING)
  })

  return (
    <group>
      <group ref={jumpRef}>
        <group ref={motionRef}>
          <group ref={breathRef}>
            <group ref={fitRef}>
              <primitive object={tuned} />
              {/* Los hijos van dentro del grupo escalado: sus coordenadas se
                  expresan en el espacio del modelo y acompanan al personaje
                  cuando gira. */}
              {children}
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
