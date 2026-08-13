import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles, useGLTF } from '@react-three/drei'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

/**
 * El cerebro luminoso que Olaz sostiene en la mano.
 *
 * Va como objeto aparte y superpuesto porque el modelo de Olaz es una única
 * malla con un solo material: no hay forma de hacer que brille solo esa parte.
 * Con un objeto propio, además, el brillo es luz de verdad —emisivo, bloom,
 * destellos y una luz puntual que tiñe la mano— y no una textura pintada.
 */
const MODEL_URL = '/preview/brain-orb.glb'
const DRACO_PATH = '/draco/'

export default function GlowingBrain({ position, scale = 1, visible = true }) {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH)
  const groupRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  const tuned = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((object) => {
      if (!object.isMesh || !object.material) return
      const material = object.material.clone()
      material.metalness = 0
      material.roughness = 0.45
      material.emissive?.set('#FF6B85')
      material.emissiveIntensity = 1.6
      material.toneMapped = false
      object.material = material
    })
    return clone
  }, [scene])

  useFrame((state) => {
    const group = groupRef.current
    if (!group || reducedMotion) return

    const t = state.clock.elapsedTime
    group.rotation.y = t * 0.35
    group.position.y = Math.sin(t * 1.1) * 0.02

    // Latido en la intensidad, no en la escala: un cerebro que crece y
    // encoge parece un globo; uno que palpita de brillo parece encendido.
    group.traverse((object) => {
      if (object.isMesh && object.material) {
        object.material.emissiveIntensity = 1.35 + Math.sin(t * 2.4) * 0.35
      }
    })
  })

  if (!visible) return null

  return (
    <group position={position} scale={scale}>
      <group ref={groupRef}>
        <primitive object={tuned} />
      </group>

      {/* Luz puntual corta: tiñe la mano y el pecho de rosa, que es lo que
          vende que el brillo procede del objeto. */}
      <pointLight color="#FF6B85" intensity={2.2} distance={1.6} decay={2} />

      <Sparkles count={22} scale={0.75} size={1.6} speed={0.5} color="#FFC2CC" opacity={0.9} />
    </group>
  )
}

useGLTF.preload(MODEL_URL, DRACO_PATH)
