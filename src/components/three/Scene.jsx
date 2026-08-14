import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, PerformanceMonitor, Sparkles, Stats } from '@react-three/drei'
import { ACESFilmicToneMapping, Vector3 } from 'three'
import Mascot3D, { MASCOT_MODELS } from './Mascot3D'
import GlowingBrain from './GlowingBrain'
import NeuralNodes from './NeuralNodes'
import FloatingBrain from './FloatingBrain'
import { journey } from '../../state/journey'

/**
 * Portada e interior del cerebro, en UNA sola escena y sin props de scroll.
 *
 * Todo lo que depende del recorrido se lee del objeto `journey` dentro del
 * bucle de render. React no participa: no hay props que cambien por frame ni
 * arbol que reconciliar mientras se hace scroll.
 */
const IS_COARSE_POINTER =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

const MAX_DPR = IS_COARSE_POINTER ? 1.5 : 2

/** Sitio del cerebro luminoso sobre la mano, en el espacio del modelo. */
export const BRAIN_TRANSFORM = { x: -0.53, y: 0.23, z: 0.66, scale: 0.17 }

/** Donde vive la constelacion: dentro del cerebro, detras de la portada. */
const INSIDE_CENTER = new Vector3(0, 0, -9)

// Momentos del recorrido, en fraccion de scroll.
export const MASCOT_FADE = [0.28, 0.46]
export const INSIDE_FADE = [0.34, 0.62]

function OffsetGroup({ xRatio, yRatio, children }) {
  const viewport = useThree((state) => state.viewport)
  return (
    <group position={[viewport.width * xRatio, viewport.height * yRatio, 0]}>{children}</group>
  )
}

/**
 * Camara guiada por el scroll: un unico recorrido de tres puntos.
 *
 * Pasa junto a la mano de Olaz —no a traves de su cuerpo— y sigue hasta el
 * centro de la constelacion. Todo se calcula a partir de un solo valor, asi
 * que no hay dos animaciones que puedan desincronizarse.
 */
function CameraPath({ xRatio }) {
  const camera = useThree((state) => state.camera)
  const width = useThree((state) => state.viewport.width)

  const points = useMemo(() => {
    const heroX = width * xRatio
    return {
      start: new Vector3(0, 0, 6),
      gate: new Vector3(heroX + BRAIN_TRANSFORM.x * 1.4, 0.1, 1.1),
      end: new Vector3(0, 0.15, INSIDE_CENTER.z + 7.4),
      heroLook: new Vector3(heroX, 0, 0),
    }
  }, [width, xRatio])

  const position = useRef(new Vector3())
  const target = useRef(new Vector3())

  useFrame(() => {
    const t = Math.min(1, Math.max(0, journey.progress))

    if (t < 0.5) {
      // Acelera al acercarse: la sensacion de entrar viene de que los
      // ultimos metros se recorren mas rapido que los primeros.
      const k = (t / 0.5) ** 2
      position.current.lerpVectors(points.start, points.gate, k)
      target.current.lerpVectors(points.heroLook, INSIDE_CENTER, k)
    } else {
      const k = (t - 0.5) / 0.5
      position.current.lerpVectors(points.gate, points.end, k)
      target.current.copy(INSIDE_CENTER)
    }

    camera.position.copy(position.current)
    camera.lookAt(target.current)
  })

  return null
}

export default function Scene({
  model = MASCOT_MODELS.brain,
  compact = false,
  reaction = 0,
  onPoke,
  active = true,
  sections,
  activeSection,
  onSelectSection,
}) {
  const [dpr, setDpr] = useState(MAX_DPR)
  const xRatio = compact ? 0 : 0.24

  return (
    <Canvas
      dpr={dpr}
      // Se deja de dibujar cuando el recorrido sale de pantalla: seguir
      // renderizando WebGL bajo el contenido es gasto puro.
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0, 6], fov: 35, near: 0.1, far: 100 }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1,
      }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(MAX_DPR)} />

      <CameraPath xRatio={xRatio} />

      <Suspense fallback={null}>
        {/* HDRI de estudio (Poly Haven, CC0). De aqui sale casi toda la luz. */}
        <Environment files="/hdri/studio.hdr" environmentIntensity={1} />
        <directionalLight position={[3, 5, 4]} intensity={0.8} color="#FFF6EA" />

        {/* Portada */}
        <OffsetGroup xRatio={xRatio} yRatio={compact ? 0.17 : 0}>
          <Mascot3D
            url={model}
            reaction={reaction}
            fadeRange={MASCOT_FADE}
            fillWidth={compact ? 0.56 : 0.42}
            fillHeight={compact ? 0.36 : 0.66}
            onPoke={onPoke}
          >
            <Suspense fallback={null}>
              <GlowingBrain
                position={[BRAIN_TRANSFORM.x, BRAIN_TRANSFORM.y, BRAIN_TRANSFORM.z]}
                scale={BRAIN_TRANSFORM.scale}
              />
            </Suspense>
          </Mascot3D>

          <ContactShadows
            position={[0, compact ? -1.3 : -1.9, 0]}
            scale={7}
            opacity={0.3}
            blur={2.4}
            far={3}
            resolution={512}
            color="#4A2F1C"
          />
        </OffsetGroup>

        {/* Interior del cerebro */}
        <group position={INSIDE_CENTER}>
          <FloatingBrain fadeRange={INSIDE_FADE} />

          <NeuralNodes
            sections={sections}
            activeSection={activeSection}
            onSelect={onSelectSection}
            fadeRange={INSIDE_FADE}
          />

          {/* Polvo lejano. La luz cercana la pone el propio cerebro. */}
          <Sparkles
            count={compact ? 26 : 48}
            scale={9}
            size={1.8}
            speed={0.22}
            color="#FF9AAA"
            opacity={0.45}
          />
        </group>
      </Suspense>

      {import.meta.env.DEV && <Stats />}
    </Canvas>
  )
}
