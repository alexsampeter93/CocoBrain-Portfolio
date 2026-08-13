import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor, Stats } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { ACESFilmicToneMapping } from 'three'
import NeuralNodes from './NeuralNodes'
import { sections } from '../../data/sections'

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
        intensity={0.85}
        color={CREAM}
        scale={[12, 12, 1]}
        position={[0, 6, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      {/* Key alta y lateral. Estrecha a propósito: una fuente ancha aplana
          el relieve de las letras y la cara del coco queda de plastilina. */}
      <Lightformer
        form="rect"
        intensity={2.6}
        color="#FFFFFF"
        scale={[2.5, 5, 1]}
        position={[4, 4, 4]}
        rotation={[0, -Math.PI / 6, 0]}
      />
      {/* Rebote rosa por la izquierda: liga la escena con el cerebro */}
      <Lightformer
        form="rect"
        intensity={0.6}
        color="#F2939E"
        scale={[5, 5, 1]}
        position={[-5, 1.5, 2]}
        rotation={[0, Math.PI / 3, 0]}
      />
      {/* Contra por detrás: separa la silueta del fondo crema */}
      <Lightformer
        form="rect"
        intensity={1.4}
        color="#FFE9CC"
        scale={[4, 2, 1]}
        position={[-1, 2, -5]}
        rotation={[0, Math.PI, 0]}
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
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
      }}
      // Canvas transparente a propósito: el fondo lo pone un degradado radial
      // en CSS. Un color plano detrás es justo lo que hace que el modelo
      // parezca recortado y pegado encima.
      aria-hidden="true"
    >

      {/* Si el framerate cae, baja el dpr antes que la calidad visual */}
      <PerformanceMonitor
        onDecline={() => setDpr(1)}
        onIncline={() => setDpr(MAX_DPR)}
      />

      {/* Ambiente bajo: el relleno lo pone el entorno. Subirlo aquí es lo
          que dejaba la escena plana y sin volumen. */}
      <ambientLight intensity={0.22} color="#FFF0DC" />
      <directionalLight position={[4, 5, 4]} intensity={2.1} color="#FFF6EA" />
      <directionalLight position={[-4, 1, -3]} intensity={0.5} color="#F2939E" />

      <Suspense fallback={null}>
        <StudioEnvironment />
        <NeuralNodes sections={sections} />
      </Suspense>

      <EffectComposer disableNormalPass>
        {/* Umbral alto: solo prenden los nodos y los pulsos. Bajarlo lava el
            crema del fondo y se pierde el contraste de la marca. */}
        <Bloom intensity={0.85} luminanceThreshold={0.75} luminanceSmoothing={0.35} mipmapBlur />
      </EffectComposer>

      {/* Contador de fps: fuera del build de producción */}
      {import.meta.env.DEV && <Stats />}
    </Canvas>
  )
}
