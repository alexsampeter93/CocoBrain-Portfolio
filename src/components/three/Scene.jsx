import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  ContactShadows,
  Environment,
  MeshReflectorMaterial,
  PerformanceMonitor,
  Stats,
} from '@react-three/drei'
import {
  Bloom,
  DepthOfField,
  EffectComposer,
  Noise,
  Vignette,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { ACESFilmicToneMapping } from 'three'
import Logo3D from './Logo3D'
import NeuralNodes from './NeuralNodes'
import { sections } from '../../data/sections'

// Se evalúa una vez al cargar el módulo: no cambia durante la sesión.
const IS_COARSE_POINTER =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

const MAX_DPR = IS_COARSE_POINTER ? 1.5 : 2

const FLOOR_Y = -1.6

/**
 * Suelo reflectante. Es la pieza que más cambia la percepción de toda la
 * escena: sin un plano donde apoyarse, cualquier modelo flota en un vacío y
 * el ojo lo lee como una captura recortada, no como un espacio.
 *
 * El reflejo va muy difuminado y poco intenso a propósito. Un espejo nítido
 * duplica el modelo y distrae; lo que buscamos es que el suelo tenga materia.
 */
function ReflectiveFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]}>
      <planeGeometry args={[42, 42]} />
      <MeshReflectorMaterial
        blur={[380, 110]}
        resolution={1024}
        mixBlur={1.1}
        mixStrength={22}
        roughness={0.92}
        depthScale={1.15}
        minDepthThreshold={0.35}
        maxDepthThreshold={1.35}
        color="#EBD7BE"
        metalness={0.35}
        mirror={0}
      />
    </mesh>
  )
}

export default function Scene() {
  const [dpr, setDpr] = useState(MAX_DPR)
  // Los efectos caros se caen enteros en móvil, no se atenúan: media pantalla
  // de bokeh en una GPU integrada cuesta más que todo lo demás junto.
  const heavyEffects = !IS_COARSE_POINTER

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0.35, 5.5], fov: 40, near: 0.1, far: 100 }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      aria-hidden="true"
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(MAX_DPR)} />

      <Suspense fallback={null}>
        {/* HDRI de estudio real (Poly Haven, CC0). Un entorno de verdad da
            reflejos y rebotes; las luces sueltas nunca producen eso. */}
        <Environment files="/hdri/studio.hdr" environmentIntensity={1.1} />

        <ambientLight intensity={0.15} color="#FFF0DC" />
        <directionalLight position={[4, 5, 4]} intensity={1.2} color="#FFF6EA" />

        <Logo3D position={[0, 0.25, 0]} />

        <ReflectiveFloor />

        {/* La sombra de contacto va justo encima del suelo: el reflejo por sí
            solo no ancla el objeto, hace falta el contacto oscuro. */}
        <ContactShadows
          position={[0, FLOOR_Y + 0.01, 0]}
          scale={12}
          opacity={0.45}
          blur={2.2}
          far={5}
          resolution={1024}
          color="#4A2F1C"
        />

        {/* Constelación al fondo: con profundidad de campo activa queda
            desenfocada y hace de atmósfera en vez de competir con el logo. */}
        <group position={[0, 0.6, -4.5]} scale={2}>
          <NeuralNodes sections={sections} />
        </group>
      </Suspense>

      <EffectComposer disableNormalPass multisampling={0}>
        {heavyEffects ? (
          <DepthOfField focusDistance={0.055} focalLength={0.028} bokehScale={3.2} height={480} />
        ) : (
          <></>
        )}
        <Bloom intensity={0.7} luminanceThreshold={0.8} luminanceSmoothing={0.35} mipmapBlur />
        {/* Grano: lo que más separa un render crudo de una pieza dirigida.
            Muy sutil — a partir de 0.06 se nota como suciedad. */}
        <Noise opacity={0.042} premultiply blendFunction={BlendFunction.OVERLAY} />
        <Vignette offset={0.32} darkness={0.5} />
      </EffectComposer>

      {/* Contador de fps: fuera del build de producción */}
      {import.meta.env.DEV && <Stats />}
    </Canvas>
  )
}
