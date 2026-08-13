import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, Environment, PerformanceMonitor, Stats } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { ACESFilmicToneMapping } from 'three'
import Logo3D from './Logo3D'
import NeuralNodes from './NeuralNodes'
import { sections } from '../../data/sections'

// Se evalúa una vez al cargar el módulo: no cambia durante la sesión.
const IS_COARSE_POINTER =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

const MAX_DPR = IS_COARSE_POINTER ? 1.5 : 2

export default function Scene() {
  const [dpr, setDpr] = useState(MAX_DPR)

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0, 5.5], fov: 40, near: 0.1, far: 100 }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      // Canvas transparente: el fondo es el degradado radial de CSS. Un color
      // plano detrás del modelo es lo que lo hace parecer un recorte pegado.
      aria-hidden="true"
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(MAX_DPR)} />

      <Suspense fallback={null}>
        {/*
          HDRI de estudio real (Poly Haven, CC0), servido desde /public.
          Esto es lo que faltaba: un entorno de verdad da reflejos, rebotes y
          gradientes en las superficies. Las luces direccionales sueltas y un
          entorno procedural no producen eso, y por eso el modelo se veía
          plano comparado con el visor de Meshy o con Blender.
        */}
        <Environment files="/hdri/studio.hdr" environmentIntensity={1.1} />

        {/* Relleno mínimo: el grueso de la luz lo pone el HDRI. */}
        <ambientLight intensity={0.15} color="#FFF0DC" />
        <directionalLight position={[4, 5, 4]} intensity={1.2} color="#FFF6EA" castShadow />

        <Logo3D />

        <ContactShadows
          position={[0, -1.55, 0]}
          scale={10}
          opacity={0.4}
          blur={2.4}
          far={4.5}
          resolution={1024}
          color="#4A2F1C"
        />

        {/* La constelación va detrás y más abierta: hace de fondo con
            profundidad en vez de competir con el logo por el mismo espacio. */}
        <group position={[0, 0.2, -3]} scale={1.7}>
          <NeuralNodes sections={sections} />
        </group>
      </Suspense>

      <EffectComposer disableNormalPass>
        {/* Umbral alto: solo prenden los nodos y el cerebro, no el crema. */}
        <Bloom intensity={0.7} luminanceThreshold={0.8} luminanceSmoothing={0.35} mipmapBlur />
      </EffectComposer>

      {/* Contador de fps: fuera del build de producción */}
      {import.meta.env.DEV && <Stats />}
    </Canvas>
  )
}
