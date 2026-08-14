import { Suspense, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, PerformanceMonitor, Sparkles, Stats } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { ACESFilmicToneMapping, MathUtils, Vector3 } from 'three'
import Mascot3D, { MASCOT_MODELS } from './Mascot3D'
import NeuralNodes from './NeuralNodes'
import CameraRig from './CameraRig'
import GlowingBrain from './GlowingBrain'

const IS_COARSE_POINTER =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

const MAX_DPR = IS_COARSE_POINTER ? 1.5 : 2

/**
 * Sitio del cerebro luminoso sobre la mano, en el espacio del modelo.
 * Ajustado por Alex con el panel de colocacion, que ya se ha retirado.
 */
export const BRAIN_TRANSFORM = { x: -0.53, y: 0.23, z: 0.66, scale: 0.17 }

/**
 * Actos del recorrido, en fraccion de scroll.
 *
 *   0    -> TURN_START   portada, la camara se acerca al cerebro de la mano
 *   TURN_START -> SWAP   Olaz se gira de espaldas y entramos
 *   SWAP -> INSIDE_END   dentro del cerebro: aqui viven los nodos
 *   INSIDE_END -> 1      se sale de la escena y sigue la pagina normal
 */
export const TURN_START = 0.26
export const SWAP_POINT = 0.42
export const INSIDE_END = 0.66

function OffsetGroup({ xRatio, children }) {
  const width = useThree((state) => state.viewport.width)
  return <group position={[width * xRatio, 0, 0]}>{children}</group>
}

function CameraRigBridge({ xRatio, ...props }) {
  const width = useThree((state) => state.viewport.width)
  return <CameraRig offsetX={width * xRatio} {...props} />
}

/**
 * Camara guiada por el scroll.
 *
 * Fuera vuela hacia el cerebro que Olaz sostiene: no se escriben aqui sus
 * coordenadas, se busca el objeto por nombre en la escena. Asi, si el cerebro
 * cambia de sitio, la camara le sigue sin tocar este archivo.
 *
 * Solo actua si no hay una seccion abierta: si la hay, manda el CameraRig y
 * las dos animaciones se pelearian por la misma camara.
 */
function ScrollDolly({ progress, inside, enabled }) {
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const target = useRef(new Vector3())
  const look = useRef(new Vector3())

  useFrame(() => {
    if (!enabled) return

    if (!inside) {
      const brain = scene.getObjectByName('brain-target')
      if (brain) brain.getWorldPosition(target.current)

      const t = MathUtils.clamp(progress / SWAP_POINT, 0, 1)
      // Acelera al final: la sensacion de entrar viene de que los ultimos
      // metros se recorren mas rapido que los primeros.
      const eased = t * t

      camera.position.x = MathUtils.lerp(0, target.current.x, eased)
      camera.position.y = MathUtils.lerp(0, target.current.y, eased)
      camera.position.z = MathUtils.lerp(6, target.current.z + 0.45, eased)

      look.current.lerpVectors(new Vector3(0, 0, 0), target.current, eased)
    } else {
      const t = MathUtils.clamp((progress - SWAP_POINT) / (INSIDE_END - SWAP_POINT), 0, 1)
      camera.position.set(0, MathUtils.lerp(0, 0.5, t), MathUtils.lerp(2.4, 5.6, t))
      look.current.set(0, 0, 0)
    }

    camera.lookAt(look.current)
  })

  return null
}

/** Portada: Olaz con el cerebro encendido y el logotipo al fondo. */
function OuterScene({
  model,
  xRatio,
  brainTransform,
  reaction,
  startle,
  turnAway,
  compact,
  onPoke,
}) {
  const glow = (
    // Suspense propio: si el cerebro tarda o falla, el personaje se ve igual.
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
        {/* En pantalla estrecha el personaje sube para dejar sitio al texto
            debajo, en vez de compartir la fila con el. */}
        <group position={[0, compact ? 0.85 : 0, 0]}>
          <Mascot3D
            url={model}
            reaction={reaction}
            startle={startle}
            turnAway={turnAway}
            lookEnabled={turnAway < 0.05}
            idleEnabled={turnAway < 0.05}
            fillWidth={compact ? 0.8 : 0.58}
            onPoke={onPoke}
          >
            {glow}
          </Mascot3D>
        </group>

        <ContactShadows
          position={[0, compact ? -1.1 : -1.9, 0]}
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

/**
 * Dentro del cerebro. Los nodos existen SOLO aqui: fuera hay una persona,
 * dentro estan sus pensamientos. Poder navegarlos desde fuera era lo que no
 * tenia sentido.
 */
function InnerScene({ sections, activeSection, onSelect }) {
  return (
    <>
      {/*
        Niebla de profundidad: lo lejano se disuelve y el ojo deja de poder
        medir donde acaba el espacio. El color coincide con el degradado de
        la pagina para que la disolucion sea invisible.

        La densidad es baja a proposito. Mas espesa daba mas atmosfera pero
        se comia los nodos del fondo, y los nodos son navegacion: no pueden
        depender de que se vean o no.
      */}
      <fogExp2 attach="fog" args={['#F0DDC6', 0.055]} />

      <Environment files="/hdri/studio.hdr" environmentIntensity={0.7} />
      <directionalLight position={[2, 3, 4]} intensity={0.45} color="#FFE8E4" />
      {/* Aqui dentro la fuente de luz es el propio cerebro. */}
      <pointLight position={[0, 0.4, 1.4]} intensity={4} color="#FF6B85" distance={7} />

      <group scale={0.3} position={[0, -0.3, 0]}>
        <Mascot3D url={MASCOT_MODELS.thinker} />
      </group>

      <NeuralNodes sections={sections} activeSection={activeSection} onSelect={onSelect} />

      {/* Particulas cercanas: dan la sensacion de estar dentro de algo, no
          de mirarlo desde fuera. */}
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
  brainTransform = BRAIN_TRANSFORM,
  reaction = 0,
  startle = 0,
  compact = false,
  onPoke,
}) {
  const [dpr, setDpr] = useState(MAX_DPR)
  const inside = progress >= SWAP_POINT

  // De 0 a 1 en la franja previa al cambio: es lo que gira a Olaz de espaldas
  // justo antes de entrar.
  const turnAway = MathUtils.clamp(
    (progress - TURN_START) / (SWAP_POINT - TURN_START),
    0,
    1,
  )

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
        <CameraRigBridge xRatio={0} sections={sections} activeSection={activeSection} />
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
            brainTransform={brainTransform}
            reaction={reaction}
            startle={startle}
            turnAway={turnAway}
            compact={compact}
            onPoke={onPoke}
          />
        )}
      </Suspense>

      {/* Solo dentro: aqui el bloom esta motivado por el cerebro que ilumina.
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
