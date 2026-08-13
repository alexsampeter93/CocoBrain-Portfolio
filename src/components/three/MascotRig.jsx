import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, MathUtils, Vector3 } from 'three'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { usePointer } from '../../hooks/usePointer'
import { analysePart, orientationFor } from '../../utils/autoRig'
import { RIG_BODY, RIG_PARTS } from '../../data/rigLayout'

/**
 * Mascota montada a partir de las cinco piezas sueltas.
 *
 * El montaje es automático: se mide la geometría de cada extremidad para
 * deducir dónde está su articulación y hacia dónde apunta. Ver
 * `src/utils/autoRig.js`.
 *
 * Cada extremidad queda dentro de un grupo cuyo origen coincide con la
 * articulación, así que rotar ese grupo mueve el brazo como un brazo. Es el
 * mismo resultado que colocar orígenes en Blender, sin rig ni skinning.
 */
const DRACO_PATH = '/draco/'

const FILL_HEIGHT = 0.72

const LOOK_YAW = Math.PI
const LOOK_PITCH = 0.34
const LOOK_EASING = 0.11

const FLOAT_AMPLITUDE = 0.05
const FLOAT_SPEED = 0.6

/** Anula el metalizado de Meshy, que bajo un HDRI da brillo de plástico. */
function useTunedClone(url) {
  const { scene } = useGLTF(url, DRACO_PATH)

  return useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((object) => {
      if (!object.isMesh || !object.material) return
      const material = object.material.clone()
      material.metalness = 0
      material.envMapIntensity = 1.25
      object.material = material
    })
    return clone
  }, [scene])
}

/**
 * Una extremidad, con su origen recolocado en la articulación.
 * `bodyRadius` traduce las medidas declaradas —que van en radios de cuerpo—
 * a unidades de la escena.
 */
function Limb({ part, bodyRadius, children }) {
  const model = useTunedClone(part.url)

  const { pivot, quaternion, scale } = useMemo(() => {
    const { pivot, direction, length } = analysePart(model)
    return {
      pivot,
      quaternion: orientationFor(direction, part.aim),
      scale: (part.length * bodyRadius) / (length || 1),
    }
  }, [model, part, bodyRadius])

  return (
    <group
      position={[
        part.attach[0] * bodyRadius,
        part.attach[1] * bodyRadius,
        part.attach[2] * bodyRadius,
      ]}
      quaternion={quaternion}
    >
      {/* Desplazar la malla por el negativo del pivote deja el origen del
          grupo exterior exactamente en la articulación. */}
      <group position={pivot.clone().multiplyScalar(-scale)} scale={scale}>
        <primitive object={model} />
      </group>
      {children}
    </group>
  )
}

export default function MascotRig({ children }) {
  const viewport = useThree((state) => state.viewport)
  const reducedMotion = usePrefersReducedMotion()
  const pointer = usePointer()
  const fitRef = useRef(null)
  const motionRef = useRef(null)

  const body = useTunedClone(RIG_BODY.url)

  // Todas las medidas de las extremidades se expresan en radios de cuerpo,
  // así que este número es el que las ata todas.
  const bodyRadius = useMemo(() => {
    const size = new Box3().setFromObject(body).getSize(new Vector3())
    return Math.max(size.x, size.y, size.z) / 2
  }, [body])

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
  }, [viewport.height, bodyRadius])

  useFrame((state) => {
    const group = motionRef.current
    if (!group || reducedMotion) return

    const t = state.clock.elapsedTime
    group.position.y = Math.sin(t * FLOAT_SPEED) * FLOAT_AMPLITUDE

    const { x, y } = pointer.current
    group.rotation.y = MathUtils.lerp(group.rotation.y, x * LOOK_YAW, LOOK_EASING)
    group.rotation.x = MathUtils.lerp(group.rotation.x, y * LOOK_PITCH, LOOK_EASING)
  })

  return (
    <group ref={motionRef}>
      <group ref={fitRef}>
        {/* Las extremidades cuelgan del cuerpo: moverlo o escalarlo las
            arrastra, que es lo que permitirá el squash & stretch. */}
        <primitive object={body} />
        {RIG_PARTS.map((part) => (
          <Limb key={part.id} part={part} bodyRadius={bodyRadius} />
        ))}
        {children}
      </group>
    </group>
  )
}

useGLTF.preload(RIG_BODY.url, DRACO_PATH)
RIG_PARTS.forEach((part) => useGLTF.preload(part.url, DRACO_PATH))
