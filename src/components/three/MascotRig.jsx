import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, MathUtils, Vector3 } from 'three'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { usePointer } from '../../hooks/usePointer'

/**
 * Mascota montada a partir de las cinco piezas sueltas.
 *
 * A diferencia del modelo fusionado, aquí cada extremidad es un objeto con su
 * propio origen en la articulación, así que se puede rotar por separado:
 * apuntar, saludar, caminar. La jerarquía se construye con grupos anidados y
 * no hace falta ni rig ni skinning, que es justo lo que se quería evitar.
 */
const DRACO_PATH = '/draco/'

const FILL_HEIGHT = 0.72

const LOOK_YAW = Math.PI
const LOOK_PITCH = 0.34
const LOOK_EASING = 0.11

const FLOAT_AMPLITUDE = 0.05
const FLOAT_SPEED = 0.6

/** Una pieza con su origen recolocado en la articulación. */
function Part({ part, children }) {
  const { scene } = useGLTF(part.url, DRACO_PATH)

  const model = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((object) => {
      if (!object.isMesh || !object.material) return
      const material = object.material.clone()
      // Meshy exporta metallic-roughness que bajo un HDRI da brillo de
      // plástico. Se anula y se sube la respuesta al entorno.
      material.metalness = 0
      material.envMapIntensity = 1.25
      object.material = material
    })
    return clone
  }, [scene])

  return (
    <group position={part.position} rotation={part.rotation}>
      {/* Desplazar la malla por el negativo del pivote es lo que deja el
          origen del grupo exterior justo en la articulación. */}
      <group
        position={[
          -part.pivot[0] * part.scale,
          -part.pivot[1] * part.scale,
          -part.pivot[2] * part.scale,
        ]}
        scale={part.scale}
      >
        <primitive object={model} />
      </group>
      {children}
    </group>
  )
}

export default function MascotRig({ parts, children }) {
  const viewport = useThree((state) => state.viewport)
  const reducedMotion = usePrefersReducedMotion()
  const pointer = usePointer()
  const fitRef = useRef(null)
  const motionRef = useRef(null)

  const body = parts.find((part) => part.id === 'body')
  const limbs = parts.filter((part) => part.id !== 'body')

  /** Encuadre automático sobre el conjunto ya montado. */
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
  }, [viewport.height, parts])

  useFrame((state) => {
    const group = motionRef.current
    if (!group || reducedMotion) return

    const t = state.clock.elapsedTime
    group.position.y = Math.sin(t * FLOAT_SPEED) * FLOAT_AMPLITUDE

    const { x, y } = pointer.current
    group.rotation.y = MathUtils.lerp(group.rotation.y, x * LOOK_YAW, LOOK_EASING)
    group.rotation.x = MathUtils.lerp(group.rotation.x, y * LOOK_PITCH, LOOK_EASING)
  })

  if (!body) return null

  return (
    <group>
      <group ref={motionRef}>
        <group ref={fitRef}>
          {/* Las extremidades cuelgan del cuerpo: mover o rotar el cuerpo las
              arrastra, que es lo que permite el squash & stretch global. */}
          <Part part={body}>
            {limbs.map((part) => (
              <Part key={part.id} part={part} />
            ))}
            {children}
          </Part>
        </group>
      </group>
    </group>
  )
}
