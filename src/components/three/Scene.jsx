import { Suspense, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, PerformanceMonitor, Stats } from '@react-three/drei'
import { ACESFilmicToneMapping } from 'three'
import Mascot3D, { MASCOT_MODELS } from './Mascot3D'
import GlowingBrain from './GlowingBrain'

/**
 * Escena de portada. Nada mas.
 *
 * Hubo aqui un recorrido con scroll que entraba dentro del cerebro,
 * intercambiaba escenas y movia la camara. Se ha retirado: encadenaba
 * demasiadas maquinas de estado sobre el mismo valor de scroll y el
 * resultado se sentia roto, sobre todo en movil.
 *
 * Se reconstruye por partes y solo cuando esto de aqui sea impecable. El
 * codigo retirado sigue en el historial de git.
 */
const IS_COARSE_POINTER =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

const MAX_DPR = IS_COARSE_POINTER ? 1.5 : 2

/** Sitio del cerebro luminoso sobre la mano, en el espacio del modelo. */
export const BRAIN_TRANSFORM = { x: -0.53, y: 0.23, z: 0.66, scale: 0.17 }

/**
 * Desplaza a sus hijos una fraccion del ancho visible, para que la
 * composicion aguante al cambiar el tamano de la ventana.
 */
function OffsetGroup({ xRatio, yRatio, children }) {
  const viewport = useThree((state) => state.viewport)
  return (
    <group position={[viewport.width * xRatio, viewport.height * yRatio, 0]}>{children}</group>
  )
}

export default function Scene({
  model = MASCOT_MODELS.brain,
  compact = false,
  reaction = 0,
  onPoke,
  active = true,
}) {
  const [dpr, setDpr] = useState(MAX_DPR)

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

        <OffsetGroup xRatio={compact ? 0 : 0.24} yRatio={compact ? 0.17 : 0}>
          <Mascot3D
            url={model}
            reaction={reaction}
            fillWidth={compact ? 0.56 : 0.42}
            fillHeight={compact ? 0.36 : 0.66}
            onPoke={onPoke}
          >
            {/* Suspense propio: si el resplandor tarda, el personaje se ve
                igual en vez de bloquear la escena entera. */}
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
      </Suspense>

      {import.meta.env.DEV && <Stats />}
    </Canvas>
  )
}
