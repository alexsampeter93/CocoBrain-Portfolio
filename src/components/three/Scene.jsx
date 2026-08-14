import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, PerformanceMonitor, Sparkles, Stats } from '@react-three/drei'
import { ACESFilmicToneMapping, MathUtils, Vector3 } from 'three'
import Mascot3D, { MASCOT_MODELS } from './Mascot3D'
import GlowingBrain from './GlowingBrain'
import NeuralNodes from './NeuralNodes'

/**
 * Portada y interior del cerebro, en UNA sola escena.
 *
 * La version anterior tenia dos escenas y las intercambiaba a mitad de
 * scroll, tapando el cambio con un fundido. Eso montaba y desmontaba modelos
 * pesados en pleno movimiento —de ahi los tirones— y obligaba a sincronizar
 * seis animaciones distintas contra el mismo numero.
 *
 * Aqui todo existe desde el primer frame. La constelacion esta detras, en el
 * sitio donde estaria el interior del cerebro, y lo unico que se mueve es la
 * camara. Lo demas se desvanece por opacidad, que es continuo por definicion
 * y no puede dar un salto.
 */
const IS_COARSE_POINTER =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

const MAX_DPR = IS_COARSE_POINTER ? 1.5 : 2

/** Sitio del cerebro luminoso sobre la mano, en el espacio del modelo. */
export const BRAIN_TRANSFORM = { x: -0.53, y: 0.23, z: 0.66, scale: 0.17 }

/** Donde vive la constelacion: detras de la portada, en su propio espacio. */
const INSIDE_CENTER = new Vector3(0, 0, -9)

// Momentos del recorrido, en fraccion de scroll.
const FADE_OUT_START = 0.3
const FADE_OUT_END = 0.5
const FADE_IN_START = 0.32
const FADE_IN_END = 0.62

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
 * centro de la constelacion. Todo se calcula a partir de este valor, asi que
 * no hay dos animaciones que puedan desincronizarse.
 */
function CameraPath({ progress, heroOffsetX }) {
  const camera = useThree((state) => state.camera)

  const waypoints = useMemo(() => {
    const gate = new Vector3(heroOffsetX + BRAIN_TRANSFORM.x * 1.4, 0.1, 1.2)
    return {
      start: new Vector3(0, 0, 6),
      gate,
      end: new Vector3(0, 0.2, INSIDE_CENTER.z + 3.1),
    }
  }, [heroOffsetX])

  const position = useRef(new Vector3())
  const target = useRef(new Vector3())

  useFrame(() => {
    const t = MathUtils.clamp(progress, 0, 1)

    if (t < 0.5) {
      // Acelera al acercarse: la sensacion de entrar viene de que los
      // ultimos metros se recorren mas rapido que los primeros.
      const k = (t / 0.5) ** 2
      position.current.lerpVectors(waypoints.start, waypoints.gate, k)
      target.current.lerpVectors(new Vector3(heroOffsetX, 0, 0), INSIDE_CENTER, k)
    } else {
      const k = (t - 0.5) / 0.5
      position.current.lerpVectors(waypoints.gate, waypoints.end, k)
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
  progress = 0,
  sections,
  onSelectSection,
}) {
  const [dpr, setDpr] = useState(MAX_DPR)

  const heroFade = 1 - MathUtils.smoothstep(progress, FADE_OUT_START, FADE_OUT_END)
  const insideFade = MathUtils.smoothstep(progress, FADE_IN_START, FADE_IN_END)
  const heroOffsetX = compact ? 0 : 0.24

  return (
    <Canvas
      dpr={dpr}
      // Se deja de dibujar cuando la portada sale de pantalla: seguir
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

      <Suspense fallback={null}>
        {/* HDRI de estudio (Poly Haven, CC0). De aqui sale casi toda la luz. */}
        <Environment files="/hdri/studio.hdr" environmentIntensity={1} />
        <directionalLight position={[3, 5, 4]} intensity={0.8} color="#FFF6EA" />

        <CameraPathBridge progress={progress} xRatio={heroOffsetX} />

        {/* Portada */}
        <OffsetGroup xRatio={heroOffsetX} yRatio={compact ? 0.17 : 0}>
          <Mascot3D
            url={model}
            reaction={reaction}
            fade={heroFade}
            fillWidth={compact ? 0.56 : 0.42}
            fillHeight={compact ? 0.36 : 0.66}
            onPoke={heroFade > 0.6 ? onPoke : undefined}
            lookEnabled={heroFade > 0.6}
            idleEnabled={heroFade > 0.6}
          >
            <Suspense fallback={null}>
              <GlowingBrain
                position={[BRAIN_TRANSFORM.x, BRAIN_TRANSFORM.y, BRAIN_TRANSFORM.z]}
                scale={BRAIN_TRANSFORM.scale}
                fade={heroFade}
              />
            </Suspense>
          </Mascot3D>

          {heroFade > 0.02 && (
            <ContactShadows
              position={[0, compact ? -1.3 : -1.9, 0]}
              scale={7}
              opacity={0.3 * heroFade}
              blur={2.4}
              far={3}
              resolution={512}
              color="#4A2F1C"
            />
          )}
        </OffsetGroup>

        {/* Interior del cerebro */}
        <group position={INSIDE_CENTER}>
          <NeuralNodes
            sections={sections}
            onSelect={onSelectSection}
            fade={insideFade}
          />

          {insideFade > 0.1 && (
            <>
              {/* Aqui dentro la fuente de luz es el propio cerebro. */}
              <pointLight
                position={[0, 0.4, 1.6]}
                intensity={4 * insideFade}
                color="#FF6B85"
                distance={8}
              />
              <Sparkles
                count={compact ? 30 : 60}
                scale={6}
                size={2.2}
                speed={0.26}
                color="#FF9AAA"
                opacity={0.65 * insideFade}
              />
            </>
          )}
        </group>
      </Suspense>

      {import.meta.env.DEV && <Stats />}
    </Canvas>
  )
}

/** Traduce la fraccion de ancho a unidades de mundo para el recorrido. */
function CameraPathBridge({ progress, xRatio }) {
  const width = useThree((state) => state.viewport.width)
  return <CameraPath progress={progress} heroOffsetX={width * xRatio} />
}
