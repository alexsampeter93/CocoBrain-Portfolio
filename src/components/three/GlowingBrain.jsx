import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { AdditiveBlending, CanvasTexture } from 'three'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

/**
 * Resplandor sobre el cerebro que Olaz ya sostiene en la mano.
 *
 * No añade ninguna malla. El primer intento superponía el modelo del cerebro
 * encima, pero el que viene pintado en la textura de Olaz sigue ahí debajo y
 * no hay tamaño que lo tape sin quedar deforme.
 *
 * Así que se ilumina el que ya existe: un halo aditivo, una luz puntual corta
 * que tiñe la mano, y destellos. El resultado es que brilla el cerebro de
 * verdad, no una copia colocada encima.
 */

/** Halo radial generado en un canvas: no hace falta traer una textura. */
function useGlowTexture() {
  return useMemo(() => {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const context = canvas.getContext('2d')
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    )
    // Centro casi blanco y caída rápida: un degradado lineal se ve como un
    // disco de niebla, no como una luz.
    gradient.addColorStop(0, 'rgba(255,235,238,0.95)')
    gradient.addColorStop(0.25, 'rgba(255,107,133,0.55)')
    gradient.addColorStop(1, 'rgba(255,107,133,0)')

    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)

    return new CanvasTexture(canvas)
  }, [])
}

export default function GlowingBrain({ position, scale = 1, fade = 1 }) {
  const texture = useGlowTexture()
  const haloRef = useRef(null)
  const lightRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    // Latido en la intensidad y en el tamaño del halo, nunca en la geometría:
    // lo que palpita es la luz, no el objeto.
    const pulse = reducedMotion ? 1 : 1 + Math.sin(t * 2.4) * 0.14

    if (haloRef.current) {
      haloRef.current.scale.setScalar(pulse)
      haloRef.current.material.opacity = fade
      haloRef.current.visible = fade > 0.01
    }

    if (lightRef.current) {
      const base = reducedMotion ? 1.6 : 1.6 + Math.sin(t * 2.4) * 0.5
      lightRef.current.intensity = base * fade
    }
  })

  if (fade <= 0.01) return null

  return (
    // Nombre para que la camara del scroll pueda localizarlo y volar hacia
    // el sin necesidad de duplicar aqui sus coordenadas.
    <group name="brain-target" position={position} scale={scale}>
      {/* El sprite siempre mira a cámara, así el halo no se ve de canto. */}
      <sprite ref={haloRef} scale={[4.2, 4.2, 1]}>
        <spriteMaterial
          map={texture}
          blending={AdditiveBlending}
          depthWrite={false}
          // `depthTest` activado. Desactivarlo hacia que el halo se dibujara
          // por encima de todo: al acercarse la camara llenaba la pantalla de
          // rosa y parecia que la web se quedaba colgada.
          depthTest
          transparent
          toneMapped={false}
        />
      </sprite>

      <pointLight ref={lightRef} color="#FF6B85" intensity={1.6} distance={4} decay={2} />

      <Sparkles count={18} scale={2.6} size={2.2} speed={0.45} color="#FFC2CC" opacity={0.85} />
    </group>
  )
}
