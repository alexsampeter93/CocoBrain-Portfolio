import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { MathUtils, Quaternion, Vector3 } from 'three'
import { journey } from '../journey/clock'
import { EXIT_AXIS, emergence, orbitFraming } from '../journey/stages'
import { getVisualAsset } from '../data/visualAssets'

/**
 * EL ESPACIO EXTERIOR. Lo que hay al otro lado cuando el recorrido sale del
 * cerebro.
 *
 * ## Por que existe
 *
 * Cuando esta web tuvo por primera vez un tramo de salida, se retiro por tres
 * motivos y el primero era este: al salir, detras de los nodos no quedaba mas
 * que el telon, un campo marron liso sin arquitectura. El cerebro flotaba
 * sobre nada y la constelacion parecia pegada encima.
 *
 * Esto es ese fondo. La constelacion de puntos y filamentos de la lamina, con
 * el centro luminoso y vacio, cruzando de anil profundo a rosa palido: los
 * cuatro colores de la marca, en un solo archivo y en la proporcion correcta.
 *
 * ## Y por que es geometria y no una capa del DOM
 *
 * La regla del manual es que los fondos van en el DOM: son imagenes fijas sin
 * perspectiva ni luz, y meterlas en WebGL solo anade pixeles que sombrear.
 * Esta es la excepcion, y el motivo es geometrico:
 *
 * - el cerebro y los cinco nodos tienen que estar POR DELANTE, y entre el DOM
 *   y ellos esta `MindBackdrop`, que es una esfera opaca a pantalla completa.
 *   Una capa del DOM quedaria detras del telon, o sea invisible;
 * - tiene que haber PARALAJE. La camara pasa de 0,95 a 4,65 cerebros del
 *   centro, o sea se aleja del cerebro casi cinco veces; de un plano que esta
 *   seis cerebros mas lejos se aleja un 35%. El fondo se abre mientras el
 *   objeto se retira, y eso es profundidad. Escalando una imagen en el DOM no
 *   se consigue: escalar una lamina se lee como una lamina acercandose, que es
 *   la leccion que costo cinco fases en la portada.
 *
 * ## Se usa como ATMOSFERA, no como red
 *
 * El plano es a proposito mucho mayor que el encuadre: lo que llena el cuadro
 * es su centro —el degradado limpio, donde va el cerebro— y su anillo de
 * puntos queda repartido por los bordes, como luces lejanas.
 *
 * Poner su red dibujada justo donde estan los cinco nodos de verdad seria
 * repetir el error que ya costo una vuelta dentro del cerebro: dos redes en
 * pantalla, y la falsa —mas definida, mas contrastada y quieta— robandole la
 * lectura a la que si responde al puntero.
 *
 * Determinista: su opacidad sale de `emergence(progress)` y su posicion no se
 * mueve nunca. Parado, quieto.
 */

/** Cuantos cerebros por DETRAS del centro se cuelga la lamina. */
const DEPTH = 6

/**
 * Cuanto mayor que el encuadre es la lamina, para que su anillo de puntos
 * quede repartido por los bordes y el centro limpio se lleve el cuadro.
 *
 * En vertical se baja: ahi la camara se aleja mucho mas para que quepa la
 * constelacion, y con el mismo factor no se veria mas que un trozo de
 * degradado sin un solo punto.
 */
const COVER = { regular: 1.72, portrait: 1.2 }

/** El +Z de un plano de three, que es hacia donde mira sin girar. */
const FLAT = new Vector3(0, 0, 1)

/** La lamina es 16:9. */
const IMAGE_ASPECT = 16 / 9

/** Opacidad maxima. No llega a uno: es el fondo, no el sujeto. */
const PRESENCE = 0.72

/**
 * Y se pinta ATENUADA. El archivo tiene la mitad derecha casi blanca, y a
 * pantalla completa eso es un fogonazo justo en el tramo en el que la luz
 * tiene que volver DESPACIO. Multiplicando el color se recupera la luz sin el
 * salto: el exterior acaba mas claro que el interior, que es lo que pide el
 * guion, pero por una rampa y no por un escalon.
 */
/**
 * ── Y EL TINTE SE CORRIGE HACIA EL COCO ─────────────────────────────────
 *
 * Estuvo en `#7C6F6B`, que es un gris cálido con el verde solo cuatro puntos
 * por encima del azul. Medido con `scripts/palette.mjs` sobre la composición
 * del acto 7, el cuadro daba **56,7% rosa contra 39,9% coco** — la proporción
 * de la identidad, invertida—, y la sonda por zonas explicó por qué: el
 * cerebro ya era coco (verde 4,9 por encima del azul) y el que caía del lado
 * del carmín era el FONDO, que ocupa cuatro quintas partes del cuadro.
 *
 * Estaba en la frontera exacta: la regla que separa un marrón de un carmín es
 * que el verde le saque al azul más del 18% del rango, y a este le faltaban
 * cuatro décimas. Con dos puntos menos de azul las pasa, y en pantalla la
 * diferencia es que el espacio exterior se lee como tierra y no como granate.
 *
 * Se toca aquí y no en `MindBackdrop` a propósito: el telón pinta también el
 * interior, que ya está medido en 86% coco y no tiene ningún problema. Esta
 * lámina solo existe en el acto 7.
 */
const DIM = '#7E6F65'

export default function OuterSpace({ tokens, fov = 35, aspect = 1.6 }) {
  const meshRef = useRef(null)
  const shownRef = useRef(-1)

  const asset = getVisualAsset('outside.space')
  const map = useTexture(asset.src)

  const { position, facing, width, height } = useMemo(() => {
    const { brain, distance } = orbitFraming(tokens, { fov, aspect })
    const centre = new Vector3(...tokens.mind.center)

    const behind = brain * DEPTH
    const spot = centre.clone().addScaledVector(EXIT_AXIS, -behind)

    /*
      El plano se dimensiona contra el ENCUADRE FINAL, no en unidades fijas: a
      la distancia a la que acaba la camara mas lo que hay detras, cuanto mide
      medio cuadro. Asi cubre lo mismo en 1920 que en un movil, donde la camara
      esta mucho mas lejos para que quepa la constelacion.
    */
    const span = distance + behind
    const cover = aspect < 1.2 ? COVER.portrait : COVER.regular
    const halfTall = span * Math.tan(MathUtils.degToRad(fov) / 2) * cover

    /*
      De frente al eje de salida, que es desde donde mira la camara al final.
      Un plano de three mira a +Z, asi que basta con el giro que lleva +Z al
      eje de salida. Con Euler haria falta descomponer una direccion que no es
      ninguno de los ejes del mundo.
    */
    const facing = new Quaternion().setFromUnitVectors(FLAT, EXIT_AXIS)

    return {
      position: spot,
      facing,
      width: halfTall * 2 * IMAGE_ASPECT,
      height: halfTall * 2,
    }
  }, [tokens, fov, aspect])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const value = emergence(journey.progress) * PRESENCE
    if (Math.abs(value - shownRef.current) < 0.003) return
    shownRef.current = value

    mesh.visible = value > 0.004
    mesh.material.opacity = value
  })

  return (
    <mesh
      ref={meshRef}
      position={position}
      quaternion={facing}
      visible={false}
      raycast={() => null}
      renderOrder={-8}
    >
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={map}
        color={DIM}
        transparent
        opacity={0}
        depthWrite={false}
        /*
          Sin niebla: la niebla de la cavidad todavia vale algo mientras esta
          lamina empieza a aparecer, y a doce cerebros de distancia la teniria
          entera del color del aire. Es el fondo del espacio, no algo que este
          dentro de el.
        */
        fog={false}
      />
    </mesh>
  )
}

useTexture.preload(getVisualAsset('outside.space').src)
