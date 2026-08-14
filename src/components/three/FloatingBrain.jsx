import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles, useGLTF } from '@react-three/drei'
import { Box3, Color, Vector3 } from 'three'
import { journey } from '../../journey/clock'
import { ramp } from '../../journey/stages'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

/**
 * El cerebro, flotando, con los nodos orbitandolo.
 *
 * El intento anterior metia la camara DENTRO del modelo escalado y dibujado
 * por la cara interior. El resultado era una pared de pliegues rosas que
 * llenaba la pantalla y tapaba los nodos: no se leia como un sitio, se leia
 * como un fallo. Visto desde fuera, como objeto, si se entiende.
 */
const MODEL_URL = '/preview/brain-orb.glb'
const DRACO_PATH = '/draco/'

// Diametro objetivo en unidades de mundo. Los nodos orbitan mas lejos.
const TARGET_SIZE = 2.1

export default function FloatingBrain({ fadeRange }) {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH)
  const rootRef = useRef(null)
  const spinRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  const { model, scale } = useMemo(() => {
    const clone = scene.clone(true)

    clone.traverse((object) => {
      if (!object.isMesh || !object.material) return
      const material = object.material.clone()
      material.metalness = 0
      material.roughness = 0.55
      // Emisivo propio: aqui no hay estudio ni HDRI que lo ilumine, la luz
      // sale del cerebro mismo.
      material.emissive = new Color('#FF6B85')
      material.emissiveIntensity = 0.45
      material.transparent = true
      object.material = material
    })

    const size = new Box3().setFromObject(clone).getSize(new Vector3())
    const largest = Math.max(size.x, size.y, size.z) || 1

    return { model: clone, scale: TARGET_SIZE / largest }
  }, [scene])

  useFrame((state) => {
    const root = rootRef.current
    if (!root) return

    const fade = ramp(journey.progress, fadeRange[0], fadeRange[1])
    root.visible = fade > 0.02
    if (!root.visible) return

    root.traverse((object) => {
      if (object.isMesh && object.material) object.material.opacity = fade
    })

    if (reducedMotion) return

    const t = state.clock.elapsedTime
    if (spinRef.current) {
      spinRef.current.rotation.y = t * 0.14
      spinRef.current.position.y = Math.sin(t * 0.5) * 0.09
    }
  })

  return (
    <group ref={rootRef} visible={false}>
      <group ref={spinRef} scale={scale}>
        <primitive object={model} />
      </group>

      {/* La luz nace del cerebro y alcanza a los nodos que lo rodean. */}
      <pointLight color="#FF6B85" intensity={9} distance={7} decay={2} />

      <Sparkles count={26} scale={3.2} size={2.4} speed={0.3} color="#FFC2CC" opacity={0.8} />
    </group>
  )
}

useGLTF.preload(MODEL_URL, DRACO_PATH)
