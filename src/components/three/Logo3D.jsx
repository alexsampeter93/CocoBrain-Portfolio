import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, MathUtils, Vector3 } from 'three'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

/**
 * El logotipo "CocoBrain" con la mascota colgada de la C, a resolución alta:
 * 351.216 triángulos y texturas de 2048. Es una malla fusionada, así que de
 * momento se anima el conjunto, no las letras por separado.
 */
const MODEL_URL = '/preview/logo-cocobrain-hq.glb'
const DRACO_PATH = '/draco/'

const FILL_RATIO = 0.72
const MAX_SCALE = 3.6

const FLOAT_AMPLITUDE = 0.04
const FLOAT_SPEED = 0.5

export default function Logo3D({ position = [0, 0, 0], ...props }) {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH)
  const viewportWidth = useThree((state) => state.viewport.width)
  const reducedMotion = usePrefersReducedMotion()
  const fitRef = useRef(null)
  const floatRef = useRef(null)

  /**
   * Ajuste de materiales. Meshy exporta un mapa metallic-roughness que deja
   * el coco con brillo de plástico bajo un HDRI. Se anula el metalizado y se
   * sube la respuesta al entorno, que es de donde sale el volumen.
   */
  const tunedScene = useMemo(() => {
    scene.traverse((object) => {
      if (!object.isMesh) return
      const material = object.material
      if (!material) return

      material.metalness = 0
      material.envMapIntensity = 1.35
      material.needsUpdate = true

      object.castShadow = true
      object.receiveShadow = true
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
    if (size.x === 0) return

    const fit = Math.min(MAX_SCALE, (viewportWidth * FILL_RATIO) / size.x)
    group.scale.setScalar(fit)
    group.position.set(-center.x * fit, -center.y * fit, -center.z * fit)
  }, [tunedScene, viewportWidth])

  useFrame((state) => {
    const group = floatRef.current
    if (!group || reducedMotion) return

    const t = state.clock.elapsedTime * FLOAT_SPEED
    group.position.y = Math.sin(t) * FLOAT_AMPLITUDE

    // Giro suave hacia el cursor. Con lerp, nunca asignación directa: sin
    // suavizado el logo persigue el ratón a tirones.
    const { x, y } = state.pointer
    group.rotation.y = MathUtils.lerp(group.rotation.y, x * 0.16, 0.045)
    group.rotation.x = MathUtils.lerp(group.rotation.x, -y * 0.08, 0.045)
  })

  return (
    <group position={position} {...props}>
      <group ref={floatRef}>
        <group ref={fitRef}>
          <primitive object={tunedScene} />
        </group>
      </group>
    </group>
  )
}

useGLTF.preload(MODEL_URL, DRACO_PATH)
