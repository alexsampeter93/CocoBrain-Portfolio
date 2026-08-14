import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { MathUtils, Vector3 } from 'three'
import Mascot3D, { MASCOT_MODELS } from '../components/three/Mascot3D'
import GlowingBrain from '../components/three/GlowingBrain'
import { useViewportAspect } from '../layout/useViewportAspect'

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
 * Dos cosas que NO se usan aquí, y por qué:
 *
 * - El `viewport` de R3F se mide donde está la cámara AHORA, y la cámara se
 *   mueve durante todo el recorrido: usarlo reescalaba al personaje mientras
 *   te acercabas.
 * - El `size` del canvas cambia cada vez que ScrollTrigger fija y suelta el
 *   contenedor, así que al volver hacia arriba el encuadre se recalculaba con
 *   otro número y el personaje se descolocaba.
 *
 * La proporción de la ventana no sufre ninguno de los dos problemas.
 */
function useHeroWidth(tokens) {
  const aspect = useViewportAspect()
  const fov = useThree((state) => state.camera.fov)

  return useMemo(() => {
    const visibleHeight = 2 * Math.tan(MathUtils.degToRad(fov) / 2) * tokens.heroDistance
    return visibleHeight * aspect
  }, [fov, aspect, tokens])
}

export default function MascotStage({
  tokens,
  model = MASCOT_MODELS.brain,
  compact = false,
  onAnchor,
  reaction,
  onPoke,
}) {
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

      {/*
        Sombra de contacto: es lo que ancla al personaje al suelo. Sin ella
        flota, por muy bien iluminado que esté.

        En móvil se quita ENTERA, no se atenúa. Vuelve a dibujar la profundidad
        de la escena en cada frame, y en una GPU integrada eso se veía como un
        parpadeo de luz en la parte baja de la pantalla, además de costar
        frames. Media sombra barata sigue siendo cara: se corta del todo.
      */}
      {!compact && (
        <ContactShadows
          position={[0, -height * 0.52, 0]}
          scale={height * 2.4}
          opacity={0.3}
          blur={2.2}
          far={height}
          resolution={256}
          color="#4A2F1C"
        />
      )}
    </group>
  )
}
