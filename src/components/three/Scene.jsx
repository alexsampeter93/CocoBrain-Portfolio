import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, Environment, PerformanceMonitor, Stats } from '@react-three/drei'
import { ACESFilmicToneMapping } from 'three'
import Mascot3D, { MASCOT_MODELS } from './Mascot3D'

const IS_COARSE_POINTER =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

const MAX_DPR = IS_COARSE_POINTER ? 1.5 : 2

/**
 * Escena deliberadamente mínima: entorno, personaje y sombra de contacto.
 *
 * Nada de suelo reflectante, bloom, profundidad de campo ni grano. Todo eso
 * estaba apilado encima de una composición que no funcionaba, y cada capa
 * tapaba peor a la anterior. Se vuelve a añadir de una en una, y solo cuando
 * lo que hay debajo ya se sostiene.
 */
export default function Scene({ model = MASCOT_MODELS.thinker, xRatio = 0 }) {
  const [dpr, setDpr] = useState(MAX_DPR)

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0, 6], fov: 35, near: 0.1, far: 100 }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1,
      }}
      aria-hidden="true"
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(MAX_DPR)} />

      <Suspense fallback={null}>
        {/* HDRI de estudio (Poly Haven, CC0), servido desde /public. De aquí
            sale prácticamente toda la luz: reflejos, rebotes y degradados. */}
        <Environment files="/hdri/studio.hdr" environmentIntensity={1} />

        {/* Un único direccional para dar dirección a la sombra. La cantidad
            de luz la pone el HDRI; subir esto aplana el modelo. */}
        <directionalLight position={[3, 5, 4]} intensity={0.8} color="#FFF6EA" />

        <Mascot3D url={model} xRatio={xRatio} />

        <ContactShadows
          position={[0, -1.9, 0]}
          scale={7}
          opacity={0.32}
          blur={2.4}
          far={3}
          resolution={512}
          color="#4A2F1C"
        />
      </Suspense>

      {import.meta.env.DEV && <Stats />}
    </Canvas>
  )
}
