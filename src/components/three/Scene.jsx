import { Suspense, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, PerformanceMonitor, Stats } from '@react-three/drei'
import { ACESFilmicToneMapping } from 'three'
import Mascot3D, { MASCOT_MODELS } from './Mascot3D'
import NeuralNodes from './NeuralNodes'
import CameraRig from './CameraRig'

const IS_COARSE_POINTER =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

const MAX_DPR = IS_COARSE_POINTER ? 1.5 : 2

/**
 * Desplaza a sus hijos una fracción del ancho visible. Se expresa en
 * fracción y no en unidades para que la composición aguante al cambiar el
 * tamaño de la ventana.
 */
function OffsetGroup({ xRatio, children }) {
  const width = useThree((state) => state.viewport.width)
  return <group position={[width * xRatio, 0, 0]}>{children}</group>
}

/** Lee el desplazamiento en unidades de mundo para pasárselo al CameraRig. */
function CameraRigBridge({ xRatio, ...props }) {
  const width = useThree((state) => state.viewport.width)
  return <CameraRig offsetX={width * xRatio} {...props} />
}

export default function Scene({
  model = MASCOT_MODELS.brain,
  xRatio = 0,
  sections,
  activeSection,
  onSelect,
}) {
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
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(MAX_DPR)} />

      <CameraRigBridge
        xRatio={xRatio}
        sections={sections}
        activeSection={activeSection}
      />

      <Suspense fallback={null}>
        {/* HDRI de estudio (Poly Haven, CC0). De aquí sale casi toda la luz. */}
        <Environment files="/hdri/studio.hdr" environmentIntensity={1} />

        {/* Un único direccional, solo para dar dirección a la sombra. */}
        <directionalLight position={[3, 5, 4]} intensity={0.8} color="#FFF6EA" />

        <OffsetGroup xRatio={xRatio}>
          <Mascot3D url={model} />

          <NeuralNodes
            sections={sections}
            activeSection={activeSection}
            onSelect={onSelect}
          />

          <ContactShadows
            position={[0, -1.9, 0]}
            scale={7}
            opacity={0.32}
            blur={2.4}
            far={3}
            resolution={512}
            color="#4A2F1C"
          />
        </OffsetGroup>
      </Suspense>

      {import.meta.env.DEV && <Stats />}
    </Canvas>
  )
}
