import { Vector3 } from 'three'
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

export default function MascotStage({
  tokens,
  model = MASCOT_MODELS.brain,
  compact = false,
  onMeasure,
  reaction,
  onPoke,
}) {
  const { position, height } = tokens.mascot

  return (
    <group position={position}>
      <Mascot3D
        url={model}
        height={height}
        layer="mascot"
        anchorLocal={HAND_BRAIN_LOCAL}
        onMeasure={onMeasure}
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
        ── AQUÍ NO HAY SOMBRA, Y ES UNA DECISIÓN ─────────────────────────────

        Estuvieron las dos —`ContactShadows` para el contacto y `GroundContact`
        para el cuerpo y la difusión— y las dos han salido. No por rendimiento:
        medido, apagarlas no cambia nada (0,86 ms por frame contra 0,94, dentro
        del ruido). Han salido porque no funcionaban, y porque la causa de que
        no funcionaran no se arregla con una sombra mejor.

        ## Por qué nunca iba a funcionar

        El suelo de la fotografía está visto DESDE ARRIBA; Olaz está visto casi
        a la altura de sus pies. Son dos cámaras distintas, y ninguna mancha en
        el suelo reconcilia dos perspectivas. Comparando los recortes de los
        pies con y sin, la sombra salía desprendida del zapato y se leía como
        una mancha del pavimento, no como su sombra.

        Se probaron: `ContactShadows` sola, un charco radial, dos huellas, la
        sombra respirando con el personaje, cinco escalas, tres posiciones y dos
        `renderOrder`. Ninguna combinación pasó de "borrón".

        **Una ausencia de sombra es preferible a una sombra falsa.** Sin ella la
        imagen queda limpia; con ella queda limpia menos una mancha.

        ## Y de paso

        `ContactShadows` volvía a dibujar la escena entera desde abajo en cada
        frame: 242.000 triángulos por frame en la portada contra los 121.000 que
        tiene el personaje. Ese pase sobra durante todo el recorrido.

        Si alguna vez hace falta anclarlo, el sitio donde se arregla es el
        ENCUADRE —que la línea del suelo de la sala pase por sus pies—, no un
        plano más.
      */}
    </group>
  )
}
