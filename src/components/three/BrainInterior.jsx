import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { BackSide, Color } from 'three'
import { journey, ramp } from '../../state/journey'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

/**
 * El interior del cerebro, construido con el propio modelo del cerebro.
 *
 * Se escala mucho y se dibuja por la cara interior (`BackSide`), asi que la
 * camara acaba literalmente dentro de el: las paredes de la sala son los
 * pliegues del cerebro. Antes la constelacion flotaba en un vacio crema y por
 * eso "el interior" no se leia como un sitio.
 *
 * El material se pasa a emisivo suave en vez de depender de la luz: por
 * dentro no llega ninguna, y sin esto se ve una cueva negra.
 */
const MODEL_URL = '/preview/brain-orb.glb'
const DRACO_PATH = '/draco/'

const SIZE = 11

export default function BrainInterior() {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH)
  const groupRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  const shell = useMemo(() => {
    const clone = scene.clone(true)

    clone.traverse((object) => {
      if (!object.isMesh || !object.material) return
      const material = object.material.clone()
      material.side = BackSide
      material.metalness = 0
      material.roughness = 1
      material.emissive = new Color('#8E3A4A')
      material.emissiveIntensity = 0.55
      material.transparent = true
      // Sin escritura de profundidad: la sala no debe tapar los nodos que
      // quedan por detras de su centro.
      material.depthWrite = false
      object.material = material
      object.renderOrder = -1
    })

    return clone
  }, [scene])

  useFrame((state) => {
    const group = groupRef.current
    if (!group) return

    // Aparece a la vez que la constelacion, y solo entonces: vista desde
    // fuera seria una bola gigante tapando la portada.
    const fade = ramp(journey.progress, 0.34, 0.6)
    group.visible = fade > 0.02

    group.traverse((object) => {
      if (object.isMesh && object.material) {
        object.material.opacity = fade
      }
    })

    if (!reducedMotion) {
      group.rotation.y = state.clock.elapsedTime * 0.012
    }
  })

  return (
    <group ref={groupRef} scale={SIZE} visible={false}>
      <primitive object={shell} />
    </group>
  )
}

useGLTF.preload(MODEL_URL, DRACO_PATH)
