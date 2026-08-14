import { Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, PerformanceMonitor, Stats } from '@react-three/drei'
import { ACESFilmicToneMapping, Vector3 } from 'three'
import { advance, journey } from '../journey/clock'
import { cameraPath, sampleCamera } from '../journey/stages'
import MascotStage from './MascotStage'
import MindBlockout from './Blockout'

/**
 * El mundo. Un solo canvas, una sola escena, montada una vez.
 *
 * La regla que ordena todo esto: NADA se monta ni se desmonta mientras se hace
 * scroll. Antes había dos escenas que se intercambiaban a mitad de recorrido y
 * de ahí venían el parpadeo y los tirones —montar una malla obliga a compilar
 * su shader, y eso son varios frames perdidos justo en el peor momento.
 *
 * Aquí todo está siempre presente y lo único que cambia son opacidades y
 * posiciones, que es trabajo que la GPU ya estaba haciendo de todos modos.
 */

const IS_COARSE_POINTER =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

const MAX_DPR = IS_COARSE_POINTER ? 1.5 : 2

/**
 * Adelanta el reloj antes que nada.
 *
 * La prioridad negativa es lo importante: `useFrame` ejecuta primero los
 * números más bajos, así que el progreso queda actualizado antes de que
 * ninguna otra pieza lo lea. Sin ese orden, unas piezas leerían el valor de
 * este frame y otras el del anterior, y esa mezcla se ve como vibración.
 */
function JourneyClock() {
  useFrame((_, delta) => advance(delta), -100)
  return null
}

/**
 * Mueve la cámara leyendo la tabla. No tiene lógica propia: si el recorrido
 * está mal, se corrige en `stages.js`, no aquí.
 */
function CameraDirector({ tokens, handBrain }) {
  const camera = useThree((state) => state.camera)
  const path = useMemo(() => cameraPath(tokens, handBrain), [tokens, handBrain])

  const position = useRef(new Vector3())
  const target = useRef(new Vector3())

  useFrame(() => {
    sampleCamera(path, journey.progress, position.current, target.current)
    camera.position.copy(position.current)
    camera.lookAt(target.current)
  })

  return null
}

export default function World({
  tokens,
  sections,
  model,
  compact = false,
  reaction,
  onPoke,
  active = true,
}) {
  const [dpr, setDpr] = useState(MAX_DPR)

  /**
   * Dónde ha quedado el cerebro de la mano una vez encuadrado el modelo. Es
   * el único dato del mundo que no se puede escribir a mano: depende de la
   * malla. Se mide al cargar y se reconstruye el recorrido con él.
   */
  const [handBrain, setHandBrain] = useState(null)

  const onAnchor = useCallback((point) => {
    // Solo se acepta si de verdad se ha movido. Sin esta guarda, cualquier
    // remedida devolvía un objeto nuevo, React lo veía como un cambio y
    // reconstruía el recorrido de la cámara sin motivo.
    setHandBrain((current) =>
      current && current.distanceToSquared(point) < 1e-6 ? current : point,
    )
  }, [])

  return (
    <Canvas
      dpr={dpr}
      // Se deja de dibujar cuando el recorrido sale de pantalla: seguir
      // renderizando WebGL debajo del contenido es gasto puro.
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0, 6], fov: 35, near: 0.1, far: 60 }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1,
      }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(MAX_DPR)} />

      <JourneyClock />
      <CameraDirector tokens={tokens} handBrain={handBrain} />

      {/* HDRI de estudio (Poly Haven, CC0). De aquí sale casi toda la luz: es
          la diferencia entre un visor de modelos y una escena dirigida. */}
      <Environment files="/hdri/studio.hdr" environmentIntensity={1} />
      <directionalLight position={[3, 5, 4]} intensity={0.8} color="#FFF6EA" />

      <Suspense fallback={null}>
        <MascotStage
          tokens={tokens}
          model={model}
          compact={compact}
          onAnchor={onAnchor}
          reaction={reaction}
          onPoke={onPoke}
        />
      </Suspense>

      <MindBlockout tokens={tokens} sections={sections} />

      {import.meta.env.DEV && <Stats />}
    </Canvas>
  )
}
