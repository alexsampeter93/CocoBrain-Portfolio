import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { MathUtils, Vector3 } from 'three'
import Mascot3D, { MASCOT_MODELS } from '../components/three/Mascot3D'
import GlowingBrain from '../components/three/GlowingBrain'

/**
 * La portada: Olaz en el hueco que la fase 0 dejó validado.
 *
 * Este componente no decide nada de la coreografía. Coloca al personaje donde
 * dicen los tokens y le pone luz debajo; cuándo aparece y cuándo se va sale de
 * la tabla.
 */

/**
 * Dónde cae el cerebro dentro del modelo, en coordenadas del propio modelo.
 * Valores medidos a mano sobre la malla —no hay hueso ni nodo al que
 * agarrarse, es una malla fusionada—. Al ser locales sobreviven a cualquier
 * cambio de encuadre: si el personaje se escala, el cerebro se escala con él.
 */
const HAND_BRAIN = { x: -0.53, y: 0.23, z: 0.66, scale: 0.17 }
const HAND_BRAIN_LOCAL = new Vector3(HAND_BRAIN.x, HAND_BRAIN.y, HAND_BRAIN.z)

/**
 * Ancho visible en unidades de mundo a la distancia de la portada.
 *
 * Hace falta calcularlo a mano en vez de usar el `viewport` de R3F porque ese
 * se mide donde está la cámara AHORA, y la cámara se mueve durante todo el
 * recorrido. Usarlo hacía que el personaje se reescalara mientras te acercabas.
 */
function useHeroWidth(tokens) {
  const size = useThree((state) => state.size)
  const fov = useThree((state) => state.camera.fov)

  return useMemo(() => {
    const visibleHeight = 2 * Math.tan(MathUtils.degToRad(fov) / 2) * tokens.heroDistance
    return visibleHeight * (size.width / size.height)
  }, [fov, size.width, size.height, tokens])
}

export default function MascotStage({ tokens, model = MASCOT_MODELS.brain, onAnchor, reaction, onPoke }) {
  const heroWidth = useHeroWidth(tokens)
  const { position, height, widthFill } = tokens.mascot

  return (
    <group position={position}>
      <Mascot3D
        url={model}
        height={height}
        maxWidth={heroWidth * widthFill}
        layer="mascot"
        anchorLocal={HAND_BRAIN_LOCAL}
        onAnchor={onAnchor}
        reaction={reaction}
        onPoke={onPoke}
      >
        {/* Va dentro del grupo escalado, así que sus coordenadas son las del
            modelo y acompaña a la mano pase lo que pase con el encuadre. */}
        <GlowingBrain
          position={[HAND_BRAIN.x, HAND_BRAIN.y, HAND_BRAIN.z]}
          scale={HAND_BRAIN.scale}
          layer="handBrain"
        />
      </Mascot3D>

      {/* Sombra de contacto: es lo que ancla al personaje al suelo. Sin ella
          flota, por muy bien iluminado que esté. */}
      <ContactShadows
        position={[0, -height * 0.52, 0]}
        scale={height * 2.4}
        opacity={0.3}
        blur={2.4}
        far={3}
        resolution={512}
        color="#4A2F1C"
      />
    </group>
  )
}
