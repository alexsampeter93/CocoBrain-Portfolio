import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor, Stats } from '@react-three/drei'
import Title3D from './Title3D'

const CREAM = '#F5E6D3'

// Se evalúa una vez al cargar el módulo: no cambia durante la sesión.
const IS_COARSE_POINTER =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

// dpr máximo por dispositivo. Presupuesto: [1,2] escritorio, [1,1.5] móvil.
const MAX_DPR = IS_COARSE_POINTER ? 1.5 : 2

/**
 * Entorno generado en el propio navegador con Lightformers.
 * No usamos los presets de drei a propósito: descargan un HDR de un CDN
 * externo y se llevarían por delante el presupuesto de carga de 4 MB.
 * `frames={1}` lo cocina una sola vez, no cada frame.
 */
function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      {/* Cúpula cálida: es lo que tiñe toda la escena de crema */}
      <Lightformer
        form="rect"
        intensity={1.6}
        color={CREAM}
        scale={[12, 12, 1]}
        position={[0, 6, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      {/* Key frontal suave */}
      <Lightformer
        form="rect"
        intensity={2.2}
        color="#FFFFFF"
        scale={[6, 6, 1]}
        position={[3, 3, 5]}
        rotation={[0, -Math.PI / 8, 0]}
      />
      {/* Rebote rosa por la izquierda: liga la escena con el cerebro */}
      <Lightformer
        form="rect"
        intensity={1.1}
        color="#F2939E"
        scale={[5, 5, 1]}
        position={[-5, 1.5, 2]}
        rotation={[0, Math.PI / 3, 0]}
      />
    </Environment>
  )
}

export default function Scene() {
  const [dpr, setDpr] = useState(MAX_DPR)

  return (
    <Canvas
      dpr={dpr}
      // Sin OrbitControls: la cámara la dirige el CameraRig en la fase 8.
      camera={{ position: [0, 0, 5.5], fov: 40, near: 0.1, far: 100 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      // La escena es decorativa: el contenido real vive en el DOM.
      aria-hidden="true"
    >
      <color attach="background" args={[CREAM]} />

      {/* Si el framerate cae, baja el dpr antes que la calidad visual */}
      <PerformanceMonitor
        onDecline={() => setDpr(1)}
        onIncline={() => setDpr(MAX_DPR)}
      />

      <ambientLight intensity={0.7} color="#FFF0DC" />
      <directionalLight position={[4, 6, 4]} intensity={1.5} color="#FFF6EA" />
      <directionalLight position={[-4, 2, -3]} intensity={0.45} color="#F2939E" />

      <Suspense fallback={null}>
        <StudioEnvironment />
        <Title3D />
      </Suspense>

      {/* Contador de fps: fuera del build de producción */}
      {import.meta.env.DEV && <Stats />}
    </Canvas>
  )
}
