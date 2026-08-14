import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles, useGLTF } from '@react-three/drei'
import { Box3, Color, Vector3 } from 'three'
import { journey } from '../../journey/clock'
import { layerOpacity } from '../../journey/stages'
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

export default function FloatingBrain({ size = 2.1, layer = 'mind' }) {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH)
  const rootRef = useRef(null)
  const spinRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()
  const fadeRef = useRef(-1)

  const { model, scale, materials } = useMemo(() => {
    const clone = scene.clone(true)
    const list = []

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
      list.push(material)
    })

    const bounds = new Box3().setFromObject(clone).getSize(new Vector3())
    const largest = Math.max(bounds.x, bounds.y, bounds.z) || 1

    return { model: clone, scale: size / largest, materials: list }
  }, [scene, size])

  useFrame((state) => {
    const root = rootRef.current
    if (!root) return

    const fade = layerOpacity(layer, journey.progress)

    // Los materiales solo se tocan cuando el desvanecido se mueve de verdad,
    // que son unos pocos frames de todo el recorrido.
    if (Math.abs(fade - fadeRef.current) > 0.002) {
      fadeRef.current = fade
      root.visible = fade > 0.02
      for (const material of materials) material.opacity = fade
    }

    if (!root.visible || reducedMotion) return

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

      {/* La luz nace del cerebro y alcanza a los nodos que lo rodean. Su
          alcance sale del tamaño: en móvil todo es más pequeño y una luz de
          alcance fijo se comería la escena entera. */}
      <pointLight color="#FF6B85" intensity={9} distance={size * 3.4} decay={2} />

      <Sparkles
        count={26}
        scale={size * 1.5}
        size={2.4}
        speed={0.3}
        color="#FFC2CC"
        opacity={0.8}
      />
    </group>
  )
}

useGLTF.preload(MODEL_URL, DRACO_PATH)
