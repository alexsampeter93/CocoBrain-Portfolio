import { Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, PerformanceMonitor, Stats } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { ACESFilmicToneMapping, Vector3 } from 'three'
import { advance, journey } from '../journey/clock'
import { useViewportAspect } from '../layout/useViewportAspect'
import { cameraPath, layerOpacity, sampleCamera } from '../journey/stages'
import MascotStage from './MascotStage'
import MindStage from './MindStage'

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

/**
 * Presupuesto de píxeles por frame, no de `dpr`.
 *
 * Fijar `dpr = 2` parece un límite razonable hasta que alguien abre la web en
 * una pantalla grande: a 1900 × 1100 de ventana son 8,4 MILLONES de píxeles
 * que hay que sombrear en cada frame. Con iluminación HDRI y materiales PBR,
 * eso solo ya se come el presupuesto entero.
 *
 * El error es que `dpr` no dice cuánto trabajo hay: dice cuánto trabajo hay
 * POR PÍXEL DE CSS. El trabajo real es el área, y el área depende del tamaño
 * de la ventana, que no controlamos. Así que se fija el área y se deduce el
 * `dpr`, que es al revés de como suele hacerse pero es el orden correcto.
 */
const PIXEL_BUDGET = IS_COARSE_POINTER ? 1_800_000 : 3_200_000

function pickDpr() {
  if (typeof window === 'undefined') return 1

  const ceiling = Math.min(window.devicePixelRatio || 1, IS_COARSE_POINTER ? 1.5 : 2)
  const area = window.innerWidth * window.innerHeight
  if (!area) return ceiling

  // El `dpr` escala el área al cuadrado, de ahí la raíz.
  const affordable = Math.sqrt(PIXEL_BUDGET / area)
  return Math.max(1, Math.min(ceiling, affordable))
}

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
 * Cuanto bloom, ajustable con `?bloom=0`.
 *
 * Mismo motivo que el del cristal: es el efecto mas caro que se puede meter y
 * hay que poder compararlo con y sin el, en una maquina de verdad, sin tocar
 * codigo. El peor frame ya iba en 41 ms antes de esto.
 */
function readBloom() {
  if (typeof window === 'undefined') return 1
  const raw = new URLSearchParams(window.location.search).get('bloom')
  if (raw === null) return 1
  const value = Number(raw)
  return Number.isFinite(value) ? Math.min(2, Math.max(0, value)) : 1
}

/**
 * El resplandor.
 *
 * `mipmapBlur` en vez del desenfoque clasico: consigue el mismo radio ancho
 * reduciendo la imagen por pasos en lugar de recorrer un kernel grande, y
 * cuesta bastante menos. Con un presupuesto ya justo, es la diferencia entre
 * poder ponerlo y no.
 *
 * El umbral alto es a proposito: solo florece lo que ya es luz —los nodos
 * emisivos y los surcos del cerebro—. Bajarlo hace que empiece a brillar todo,
 * y ahi el efecto deja de dirigir la mirada y solo ensucia.
 */
function Glow({ compact }) {
  const bloomRef = useRef(null)
  const max = compact ? 0 : readBloom()

  /**
   * El bloom solo existe DENTRO del cerebro.
   *
   * Aplicado a toda la web se comia la portada: las zapatillas y los guantes
   * de Olaz son casi blancos, pasaban el umbral y el personaje entero salia
   * resplandeciendo como si estuviera en una discoteca. Ese no es el efecto,
   * y ademas contradice la portada, que es calida y luminosa por si sola.
   *
   * Ligandolo al mismo valor que hace aparecer la mente, la portada se ve
   * limpia y el resplandor entra justo cuando hay algo que deba brillar. De
   * paso deja de costar en el tramo en el que no aporta nada.
   */
  useFrame(() => {
    if (bloomRef.current) {
      bloomRef.current.intensity = max * layerOpacity('mind', journey.progress)
    }
  })

  if (max <= 0) return null

  return (
    <EffectComposer disableNormalPass multisampling={0}>
      <Bloom
        ref={bloomRef}
        intensity={0}
        luminanceThreshold={0.18}
        luminanceSmoothing={0.3}
        mipmapBlur
        radius={0.4}
      />
    </EffectComposer>
  )
}

/**
 * Mueve la cámara leyendo la tabla. No tiene lógica propia: si el recorrido
 * está mal, se corrige en `stages.js`, no aquí.
 */
function CameraDirector({ tokens, measure, nodeOrder }) {
  const camera = useThree((state) => state.camera)
  const aspect = useViewportAspect()

  const path = useMemo(
    () =>
      cameraPath(tokens, {
        handBrain: measure?.anchor ?? null,
        mascotWidth: measure?.width ?? null,
        fov: camera.fov,
        aspect,
        nodeOrder,
      }),
    [tokens, measure, camera.fov, aspect, nodeOrder],
  )

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
  activeSection,
  onSelectSection,
  active = true,
}) {
  const [dpr, setDpr] = useState(pickDpr)

  // El orden de las paradas del recorrido sale de los datos, no de una lista
  // aparte que hubiera que mantener en paralelo.
  const nodeOrder = useMemo(() => sections.map((section) => section.nodeName), [sections])

  /**
   * Lo que la mascota mide de sí misma al cargar: su ancho ya escalado y dónde
   * ha quedado el cerebro de la mano. Son los dos datos del mundo que no se
   * pueden escribir a mano porque dependen de la malla.
   */
  const [measure, setMeasure] = useState(null)

  const onMeasure = useCallback((next) => {
    // Solo se acepta si de verdad ha cambiado. Sin esta guarda, cualquier
    // remedida devolvía un objeto nuevo, React lo veía como un cambio y
    // reconstruía el recorrido de la cámara sin motivo.
    setMeasure((current) => {
      if (!current) return next
      const sameWidth = Math.abs(current.width - next.width) < 1e-4
      const sameAnchor =
        !current.anchor || !next.anchor || current.anchor.distanceToSquared(next.anchor) < 1e-6
      return sameWidth && sameAnchor ? current : next
    })
  }, [])

  return (
    <Canvas
      dpr={dpr}
      // Se deja de dibujar cuando el recorrido sale de pantalla: seguir
      // renderizando WebGL debajo del contenido es gasto puro.
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0, 6], fov: 35, near: 0.1, far: 60 }}
      gl={{
        // El suavizado por multimuestreo cuesta, y por encima de 1,3 de `dpr`
        // ya está suavizando la propia resolución. Se paga solo si hace falta.
        antialias: dpr < 1.3,
        powerPreference: 'high-performance',
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1,
      }}
    >
      {/*
        La bajada de resolución es de ida y sin vuelta, a propósito.

        Con `onIncline` devolviendo el valor alto, en cuanto los fps rondaban
        el umbral el monitor rebotaba: subía, bajaba, subía. Y cada cambio de
        `dpr` obliga a redimensionar el búfer de dibujo del canvas, que es una
        operación cara. El propio mecanismo que debía proteger el rendimiento
        se convertía en una fuente de parones periódicos.

        `flipflops` es la red de seguridad de la librería: tras tres dudas se
        queda abajo y deja de medir.
      */}
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => setDpr(1)}
        onFallback={() => setDpr(1)}
      />

      <JourneyClock />
      <CameraDirector tokens={tokens} measure={measure} nodeOrder={nodeOrder} />

      {/* HDRI de estudio (Poly Haven, CC0). De aquí sale casi toda la luz: es
          la diferencia entre un visor de modelos y una escena dirigida. */}
      <Environment files="/hdri/studio.hdr" environmentIntensity={1} />
      <directionalLight position={[3, 5, 4]} intensity={0.8} color="#FFF6EA" />

      <Suspense fallback={null}>
        <MascotStage
          tokens={tokens}
          model={model}
          compact={compact}
          onMeasure={onMeasure}
          reaction={reaction}
          onPoke={onPoke}
        />
      </Suspense>

      <MindStage
        tokens={tokens}
        sections={sections}
        activeSection={activeSection}
        onSelectSection={onSelectSection}
        compact={compact}
      />

      {/* Va al final: el postproceso se aplica sobre todo lo anterior. */}
      <Glow compact={compact} />

      {import.meta.env.DEV && <Stats />}
    </Canvas>
  )
}
