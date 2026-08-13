import { Suspense, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, PerformanceMonitor, Sparkles, Stats } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { ACESFilmicToneMapping, MathUtils } from 'three'
import Mascot3D, { MASCOT_MODELS } from './Mascot3D'
import NeuralNodes from './NeuralNodes'
import CameraRig from './CameraRig'
import GlowingBrain from './GlowingBrain'
import { DEFAULT_BRAIN_TRANSFORM } from '../ui/TuningPanel'

const IS_COARSE_POINTER =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

const MAX_DPR = IS_COARSE_POINTER ? 1.5 : 2

// El viaje se parte en dos mitades y el cambio de escena ocurre en el medio,
// tapado por un fundido. Nunca se ve el salto.
export const SWAP_POINT = 0.5

function OffsetGroup({ xRatio, children }) {
  const width = useThree((state) => state.viewport.width)
  return <group position={[width * xRatio, 0, 0]}>{children}</group>
}

function CameraRigBridge({ xRatio, ...props }) {
  const width = useThree((state) => state.viewport.width)
  return <CameraRig offsetX={width * xRatio} {...props} />
}

/**
 * Empuje de camara guiado por el scroll.
 *
 * Fuera: se acerca al personaje hasta "entrar" en el.
 * Dentro: retrocede despacio por la constelacion, como si se recorriera.
 *
 * Solo actua cuando no hay una seccion abierta: si hay una, manda el
 * CameraRig y las dos animaciones se pelearian por la misma camara.
 */
function ScrollDolly({ progress, inside, enabled }) {
  const camera = useThree((state) => state.camera)
  const width = useThree((state) => state.viewport.width)

  useFrame(() => {
    if (!enabled) return

    if (!inside) {
      const t = MathUtils.clamp(progress / SWAP_POINT, 0, 1)
      // Acelera al final: la sensacion de "entrar" viene de que los ultimos
      // metros se recorren mas rapido que los primeros.
      const eased = t * t
      camera.position.z = MathUtils.lerp(6, 1.6, eased)
      camera.position.x = MathUtils.lerp(0, width * 0.12, eased)
      camera.position.y = MathUtils.lerp(0, -0.05, eased)
    } else {
      const t = MathUtils.clamp((progress - SWAP_POINT) / (1 - SWAP_POINT), 0, 1)
      camera.position.z = MathUtils.lerp(2.6, 5.4, t)
      camera.position.x = 0
      camera.position.y = MathUtils.lerp(0, 0.4, t)
    }

    camera.lookAt(0, 0, 0)
  })

  return null
}

/** Primera pantalla: Olaz grande con el cerebro en la mano. */
function OuterScene({
  model,
  xRatio,
  sections,
  activeSection,
  onSelect,
  brainTransform,
  reaction,
}) {
  // Suspense propio: si el cerebro tarda o falla, el personaje se ve igual.
  // Compartir el Suspense del padre hacia que un asset secundario bloqueara
  // la escena entera.
  const glow = (
    <Suspense fallback={null}>
      <GlowingBrain
        position={[brainTransform.x, brainTransform.y, brainTransform.z]}
        scale={brainTransform.scale}
      />
    </Suspense>
  )

  return (
    <>
      <Environment files="/hdri/studio.hdr" environmentIntensity={1} />
      <directionalLight position={[3, 5, 4]} intensity={0.8} color="#FFF6EA" />

      <OffsetGroup xRatio={xRatio}>
        <Mascot3D url={model} reaction={reaction}>
          {glow}
        </Mascot3D>

        <NeuralNodes sections={sections} activeSection={activeSection} onSelect={onSelect} />

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
    </>
  )
}

/** Dentro del cerebro: Olaz pensativo pequeno, rodeado por la constelacion. */
function InnerScene({ sections, activeSection, onSelect }) {
  return (
    <>
      <Environment files="/hdri/studio.hdr" environmentIntensity={0.75} />
      <directionalLight position={[2, 3, 4]} intensity={0.5} color="#FFE8E4" />
      {/* Luz rosa cercana: aqui dentro la fuente es el propio cerebro. */}
      <pointLight position={[0, 0.4, 1.4]} intensity={4} color="#FF6B85" distance={7} />

      <group scale={0.34} position={[0, -0.25, 0]}>
        <Mascot3D url={MASCOT_MODELS.thinker} />
      </group>

      <NeuralNodes sections={sections} activeSection={activeSection} onSelect={onSelect} />

      {/* Particulas cercanas: dan la sensacion de estar dentro de algo, no
          mirandolo desde fuera. */}
      <Sparkles count={70} scale={7} size={2.4} speed={0.28} color="#FF9AAA" opacity={0.7} />
    </>
  )
}

export default function Scene({
  model = MASCOT_MODELS.brain,
  xRatio = 0,
  sections,
  activeSection,
  onSelect,
  progress = 0,
  brainTransform = DEFAULT_BRAIN_TRANSFORM,
  reaction = 0,
}) {
  const [dpr, setDpr] = useState(MAX_DPR)
  const inside = progress >= SWAP_POINT

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

      <ScrollDolly progress={progress} inside={inside} enabled={!activeSection} />

      {activeSection && (
        <CameraRigBridge
          xRatio={inside ? 0 : xRatio}
          sections={sections}
          activeSection={activeSection}
        />
      )}

      <Suspense fallback={null}>
        {inside ? (
          <InnerScene
            sections={sections}
            activeSection={activeSection}
            onSelect={onSelect}
          />
        ) : (
          <OuterScene
            model={model}
            xRatio={xRatio}
            sections={sections}
            activeSection={activeSection}
            onSelect={onSelect}
            brainTransform={brainTransform}
            reaction={reaction}
          />
        )}
      </Suspense>

      {/* Solo dentro: el bloom aqui esta motivado por el cerebro que ilumina.
          Fuera lavaba el crema del fondo sin ganar nada. */}
      {inside && (
        <EffectComposer disableNormalPass multisampling={0}>
          <Bloom intensity={0.9} luminanceThreshold={0.6} luminanceSmoothing={0.4} mipmapBlur />
        </EffectComposer>
      )}

      {import.meta.env.DEV && <Stats />}
    </Canvas>
  )
}
