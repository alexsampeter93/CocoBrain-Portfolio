import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, MathUtils, Vector3 } from 'three'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

export const MASCOT_MODELS = {
  thinker: '/preview/olaz-thinker.glb',
  brain: '/preview/olaz-brain.glb',
}

const DRACO_PATH = '/draco/'

// Fracción de la altura visible que ocupa el personaje. Es el número que más
// afecta a que la composición respire: por encima de 0.8 se sale por arriba.
const FILL_HEIGHT = 0.72

const FLOAT_AMPLITUDE = 0.035
const FLOAT_SPEED = 0.6

export default function Mascot3D({ url, xRatio = 0 }) {
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
    group.position.y = Math.sin(t * FLOAT_SPEED) * FLOAT_AMPLITUDE

    // Se gira hacia el cursor con lerp. Sin suavizado persigue el ratón a
    // tirones y parece un objeto arrastrado, no un personaje mirando.
    const { x, y } = state.pointer
    group.rotation.y = MathUtils.lerp(group.rotation.y, x * 0.35, 0.05)
    group.rotation.x = MathUtils.lerp(group.rotation.x, -y * 0.12, 0.05)
  })

  // El desplazamiento se expresa como fracción del ancho visible, no en
  // unidades: así el personaje mantiene su sitio en la composición al
  // cambiar el tamaño de la ventana.
  return (
    <group position={[viewport.width * xRatio, 0, 0]}>
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
