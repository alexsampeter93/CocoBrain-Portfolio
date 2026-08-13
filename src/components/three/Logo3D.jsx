import { useLayoutEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, Vector3 } from 'three'

/**
 * PROVISIONAL — el logotipo "CocoBrain" en 3D, tal cual salió de Meshy.
 *
 * Es una única malla fusionada, así que las letras no se pueden animar por
 * separado todavía: la intro solo puede mover el logo entero. Para el stagger
 * letra a letra hace falta separarlo en Blender (ver _docs/mascot-pipeline.md).
 *
 * La alternativa procedural sigue en Title3D.jsx por si volvemos a ella.
 */
const MODEL_URL = '/preview/logo-cocobrain.glb'

const FILL_RATIO = 0.78
const MAX_SCALE = 4

export default function Logo3D({ position = [0, 0, 0], ...props }) {
  const { scene } = useGLTF(MODEL_URL)
  const viewportWidth = useThree((state) => state.viewport.width)
  const groupRef = useRef(null)

  useLayoutEffect(() => {
    const group = groupRef.current
    if (!group) return

    // El GLB de Meshy no viene ni centrado ni a una escala conocida, así que
    // se mide y se normaliza aquí en vez de hardcodear números mágicos.
    group.scale.setScalar(1)
    group.position.set(0, 0, 0)

    const box = new Box3().setFromObject(group)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    if (size.x === 0) return

    const fit = Math.min(MAX_SCALE, (viewportWidth * FILL_RATIO) / size.x)
    group.scale.setScalar(fit)
    group.position.set(-center.x * fit, -center.y * fit, -center.z * fit)
  }, [scene, viewportWidth])

  return (
    <group position={position} {...props}>
      <group ref={groupRef}>
        <primitive object={scene} />
      </group>
    </group>
  )
}

useGLTF.preload(MODEL_URL)
