import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, MathUtils, Vector3 } from 'three'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

/**
 * Ojo con los nombres: los que puso Meshy no corresponden con lo que
 * contienen los archivos. `Coco_Thinker` es el que sostiene el cerebro en la
 * mano, y `Brainy_Coconut` es el pensativo. Las claves de aquí sí describen
 * lo que se ve.
 */
export const MASCOT_MODELS = {
  brain: '/preview/olaz-thinker.glb',
  thinker: '/preview/olaz-brain.glb',
}

const DRACO_PATH = '/draco/'

// Fracción de la altura visible que ocupa el personaje. Es el número que más
// afecta a que la composición respire: por encima de 0.8 se sale por arriba.
const FILL_HEIGHT = 0.72

const FLOAT_AMPLITUDE = 0.05
const FLOAT_SPEED = 0.6

// Cuánto se gira hacia el cursor, en radianes. El valor anterior (0.35) era
// tan corto que no se percibía que estuviera mirando a nada.
const LOOK_YAW = 0.62
const LOOK_PITCH = 0.22

// Deriva de reposo: sigue girando despacio aunque el cursor no se mueva, para
// que nunca se quede clavado como una figura de museo.
const DRIFT_AMOUNT = 0.16
const DRIFT_SPEED = 0.22

export default function Mascot3D({ url }) {
  const { scene } = useGLTF(url, DRACO_PATH)
  const viewport = useThree((state) => state.viewport)
  const reducedMotion = usePrefersReducedMotion()
  const fitRef = useRef(null)
  const motionRef = useRef(null)

  /**
   * Meshy exporta un mapa metallic-roughness que bajo un HDRI deja el coco
   * con brillo de plástico. Se anula el metalizado y se sube la respuesta al
   * entorno, que es de donde sale el volumen real.
   */
  const tuned = useMemo(() => {
    scene.traverse((object) => {
      if (!object.isMesh || !object.material) return
      object.material.metalness = 0
      object.material.envMapIntensity = 1.25
      object.material.needsUpdate = true
    })
    return scene
  }, [scene])

  /**
   * Encuadre automático: se mide el modelo y se escala a la altura visible.
   * Los GLB de Meshy no vienen centrados ni a escala conocida, así que
   * cualquier número fijo aquí se rompe al cambiar de modelo.
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

    const fit = (viewport.height * FILL_HEIGHT) / size.y
    group.scale.setScalar(fit)
    group.position.set(-center.x * fit, -center.y * fit, -center.z * fit)
  }, [tuned, viewport.height])

  useFrame((state) => {
    const group = motionRef.current
    if (!group || reducedMotion) return

    const t = state.clock.elapsedTime

    // Flotación y un balanceo lateral mínimo: peso, no levitación.
    group.position.y = Math.sin(t * FLOAT_SPEED) * FLOAT_AMPLITUDE
    group.rotation.z = MathUtils.lerp(group.rotation.z, Math.sin(t * 0.4) * 0.035, 0.05)

    // Mirada = deriva lenta + cursor. Sumar las dos es lo que hace que
    // parezca que piensa por su cuenta y además te ha visto; solo con el
    // cursor se queda inmóvil en cuanto sueltas el ratón.
    const { x, y } = state.pointer
    const driftYaw = Math.sin(t * DRIFT_SPEED) * DRIFT_AMOUNT
    const driftPitch = Math.cos(t * DRIFT_SPEED * 0.7) * DRIFT_AMOUNT * 0.35

    // Lerp siempre: sin suavizado persigue el ratón a tirones y parece un
    // objeto arrastrado, no un personaje mirando.
    group.rotation.y = MathUtils.lerp(group.rotation.y, x * LOOK_YAW + driftYaw, 0.045)
    group.rotation.x = MathUtils.lerp(group.rotation.x, -y * LOOK_PITCH + driftPitch, 0.045)
  })

  return (
    <group>
      <group ref={motionRef}>
        <group ref={fitRef}>
          <primitive object={tuned} />
        </group>
      </group>
    </group>
  )
}

// No se precargan los dos modelos: son 10,8 MB juntos y solo se ve uno.
// El que toque lo pide `useGLTF` al montar.
