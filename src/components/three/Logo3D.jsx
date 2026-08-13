import { useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, MathUtils, Vector3 } from 'three'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

/**
 * PROVISIONAL — el logotipo "CocoBrain" con la mascota colgada de la C, tal
 * como salió de Meshy. Es una única malla fusionada: la intro solo puede
 * mover el conjunto, no las letras por separado.
 */
const MODEL_URL = '/preview/logo-cocobrain.glb'

// El decodificador Draco se sirve desde /public, no desde el CDN de Google
// que usa drei por defecto: sin peticiones a terceros y funciona sin red.
const DRACO_PATH = '/draco/'

// Fracción del ancho visible que ocupa el logo, con tope para que en
// pantallas anchas no se coma la pantalla entera.
const FILL_RATIO = 0.62
const MAX_SCALE = 3.2

// Flotación en reposo: lenta y de recorrido corto, lo justo para que la
// escena no parezca una captura de pantalla.
const FLOAT_AMPLITUDE = 0.045
const FLOAT_SPEED = 0.55
const TILT_AMPLITUDE = 0.03

export default function Logo3D({ position = [0, 0, 0], ...props }) {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH)
  const viewportWidth = useThree((state) => state.viewport.width)
  const reducedMotion = usePrefersReducedMotion()
  const fitRef = useRef(null)
  const floatRef = useRef(null)

  useLayoutEffect(() => {
    const group = fitRef.current
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

  useFrame((state) => {
    const group = floatRef.current
    if (!group || reducedMotion) return

    const t = state.clock.elapsedTime * FLOAT_SPEED
    group.position.y = Math.sin(t) * FLOAT_AMPLITUDE

    // La cabeza gira un poco hacia el cursor. Lerp, nunca asignación directa:
    // sin suavizado el logo persigue el ratón a tirones.
    const { x, y } = state.pointer
    group.rotation.y = MathUtils.lerp(group.rotation.y, x * 0.12, 0.04)
    group.rotation.x = MathUtils.lerp(
      group.rotation.x,
      -y * 0.06 + Math.sin(t * 0.7) * TILT_AMPLITUDE,
      0.04,
    )
  })

  return (
    <group position={position} {...props}>
      <group ref={floatRef}>
        <group ref={fitRef}>
          <primitive object={scene} />
        </group>
      </group>
    </group>
  )
}

useGLTF.preload(MODEL_URL, DRACO_PATH)
