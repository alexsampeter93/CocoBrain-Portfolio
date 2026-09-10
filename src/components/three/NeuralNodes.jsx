import { useCallback, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import { AdditiveBlending, CanvasTexture, CatmullRomCurve3, Color } from 'three'
import { nodePositions, nodeConnections, spreadFor } from '../../data/nodeLayout'
import { journey } from '../../journey/clock'
import {
  hubFocus,
  hubRecede,
  layerOpacity,
  orbitBasis,
  overlayRetreat,
  ramp,
} from '../../journey/stages'
import { useViewportAspect } from '../../layout/useViewportAspect'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

/**
 * ── LAS CINCO ÁREAS DEL PORTFOLIO, ALREDEDOR DEL CEREBRO ──────────────────
 *
 * Este es el acto 7, y es el otro lado de la arquitectura: **dentro del
 * cerebro hay conocimiento, fuera hay portfolio.** Estos cinco nodos son las
 * cinco áreas editoriales —Sobre mí, Experiencia, Proyectos, Habilidades,
 * CV— y aparecen cuando el recorrido ha vuelto a salir.
 *
 * El archivo ha estado en los dos sitios y merece la pena tener escrito por
 * qué este es el bueno:
 *
 *   - **fuera, a más de tres radios de escena.** El cerebro se quedaba a media
 *     pantalla y detrás no había nada: los nodos flotaban sobre un campo
 *     marrón liso. Es lo que hizo que la fase anterior los metiera dentro;
 *   - **dentro de la cavidad.** Ahí sí había sitio y había fondo, pero rompía
 *     lo único que esta web tiene que contar: dentro del cerebro está lo que
 *     Alex sabe, no lo que Alex ha hecho;
 *   - **fuera otra vez, a 1,12–1,42 CEREBROS del centro.** Cerca. Dentro del
 *     alcance de la luz del propio cerebro, recortados contra la lámina del
 *     espacio exterior, y con el cerebro ocupando el centro del cuadro.
 *
 * El problema del primer intento no era estar fuera: era estar LEJOS y sobre
 * nada.
 *
 * Todo se mide en fracciones del CEREBRO y no del radio de la escena, que es
 * lo que conserva la composición cuando en móvil todo se encoge.
 *
 * Y se ha ido el campo de fondo —treinta y ocho puntos con sus hilos—: la
 * profundidad de aquí fuera la pone `three/OuterSpace.jsx`, que es una lámina
 * de verdad a doce cerebros de distancia, no polvo añadido.
 */

/**
 * El resplandor de las áreas.
 *
 * Era #FF6B85, un coral casi fluorescente que no esta en la paleta de nadie:
 * con el emisivo al 1.4 del estado activo se iba a rojo saturado y los cinco
 * nodos parecian botones encendidos. Es el rosa de marca, que es el mismo que
 * usa el cerebro, asi que las dos capas de la red emiten la misma luz.
 */
const GLOW = '#E98FA0'
/**
 * El rosa apagado del acto 2, no el beige del acto 1.
 *
 * Estaba en #B08355, que es un marrón cálido heredado de la portada, y en la
 * mente se leía como un elemento de otra escena: la constelación entera colgaba
 * de hilos de un color que no pertenece a ese sitio. Es el mismo valor que usan
 * las conexiones de dentro del cerebro, así que las dos capas de la red pasan a
 * estar hechas del mismo material.
 */
const LINE = '#B85C76'

/** Cuánto llega a verse una conexión, ya tejida del todo. */
const LINK_OPACITY = 0.3

/**
 * Cuanto sube una conexion cuando uno de sus extremos esta señalado.
 *
 * Es lo unico que se toca del enlace: ni grosor ni color. Cambiar el ancho de
 * una linea obliga a rehacer su geometria, y cambiar el color de la arista
 * activa la sacaria de la paleta del acto. Con la opacidad basta: sobre un
 * fondo oscuro, pasar de 0,30 a 0,85 se lee como que el camino se enciende.
 */
const LINK_NEAR = 2.8

/**
 * Todas las medidas son fracciones del CEREBRO, no del radio de la escena.
 *
 * Es el cambio que las mete dentro. Con el radio de la constelación (3,4) un
 * área medía 0,15 de mundo, que vista desde fuera y a cuatro unidades era un
 * punto de luz; dentro de una cavidad que mide dos de ancho y con la cámara a
 * medio metro, la misma bola llenaría un tercio del cuadro.
 *
 * Con 0,011 del cerebro el área mide 0,023 y ocupa 3,3 grados de radio desde la
 * parada del recorrido —unos 200 píxeles de diámetro en 1080—: se lee como un
 * cuerpo con presencia y deja ver la red que tiene detrás.
 *
 * A 0,024 no lo dejaba: medido en la captura de la primera parada, el área
 * salía como un disco quemado de 400 píxeles de radio con un halo aún mayor, y
 * el resto del cuadro era pared. Un nodo que ocupa un tercio de la pantalla ya
 * no es un punto de una red, es un objeto.
 */
/**
 * ── Y VUELVEN A MEDIRSE PARA EL EXTERIOR ──────────────────────────────────
 *
 * 0,011 del cerebro era la medida de DENTRO, con la cámara a medio metro del
 * área. Fuera, la cámara final está a 4,65 cerebros del centro y a unos 4,8 de
 * cada nodo: el mismo tamaño saldría como un píxel encendido.
 *
 * El número sale del encuadre, no de probar. A esa distancia, un cuerpo de
 * radio `r` mide en pantalla `r / cerebro x 354` píxeles sobre 1080. Con 0,034
 * el núcleo son trece píxeles de radio; con el bloom encima, un punto de luz
 * de unos treinta y cinco. Eso es un satélite, y el cerebro —que ocupa cerca
 * de un tercio del alto— sigue siendo el sujeto sin discusión.
 *
 * En vertical la cámara tiene que irse más lejos para que quepa la
 * constelación, así que el mismo número daría ocho píxeles. De ahí el segundo
 * valor: no es un ajuste a ojo, es la misma cuenta con otra distancia.
 */
/*
  ── Y SUBEN, PORQUE SON EL INDICE DEL PORTFOLIO ─────────────────────────

  0,026 daba diez pixeles de nucleo sobre 1080: correcto para "un punto de luz
  en una constelacion" y corto para lo que estos cinco son de verdad. Al salir
  del cerebro, la escena tiene que comunicar CEREBRO + CINCO AREAS
  IMPORTANTES, no cerebro con cinco bolitas.

  Con 0,040 el nucleo pasa a diecisiete pixeles y con el halo encima a unos
  cincuenta. Sigue muy por debajo del cerebro —que ocupa un tercio del alto—
  asi que la jerarquia no se toca: el cerebro gana igual.
*/
const NODE_SCALE = { regular: 0.04, compact: 0.056 }
/**
 * Zona sensible. Un objetivo táctil útil son unos 9 mm en pantalla, o sea unos
 * 44 píxeles de radio: eso es 0,12 cerebros a la distancia de la composición
 * final. Sigue siendo invisible; solo engorda lo que se puede tocar.
 */
const HIT_SCALE = { regular: 0.12, compact: 0.17 }
const HOVER_SCALE = 1.7

/** Cuanto mide el halo respecto al radio del nucleo. */
const HALO_SCALE = 10

/**
 * ── EL ACUSE DEL CLIC ─────────────────────────────────────────────────────
 *
 * Cuanto crece el nodo al pulsarlo y cuanto dura el impulso, en segundos.
 *
 * Es la unica animacion de toda la escena que NO sale del scroll, y esta
 * justificada: la regla del manual prohibe los latidos que el usuario no ha
 * pedido, y un acuse de pulsacion es literalmente lo contrario — es la
 * respuesta a algo que acaba de hacer. Se extingue sola en medio segundo y el
 * nodo vuelve al tamano que le dicta el progreso, asi que la escena sigue
 * siendo una funcion del scroll en cuanto termina.
 */
const POKE = { rise: 0.55, life: 0.5 }

/**
 * ── CUANDO UNO SE ELIGE, LOS DEMAS SE APARTAN ─────────────────────────────
 *
 * Cuanto se queda un nodo no elegido mientras hay otro abierto. No desaparece
 * —seguirian siendo cinco areas y el visitante tiene que poder cambiar de
 * idea— pero baja lo justo para que quede claro cual manda.
 *
 * Es lo que convierte la constelacion en un hub: sin esto, seleccionar solo
 * enciende una ficha y los cinco puntos siguen pesando igual, asi que la
 * escena no dice que se haya elegido nada.
 */
const DIMMED = 0.55

/**
 * Cuánto del acento le queda al color DIFUSO del nodo. El acento pleno vive en
 * el emisivo; aquí abajo solo hace falta lo justo para que la luz del cerebro
 * lo modele sin saturarlo. Ver la nota del material.
 */
const DIFFUSE = 0.28

/**
 * ── CÓMO APARECEN: UNO DETRÁS DE OTRO, Y CRECIENDO ────────────────────────
 *
 * Los cinco encendiéndose a la vez no se leen como una constelación
 * apareciendo: se leen como una interfaz que se enciende. Cada uno entra con
 * su propio retraso, y entra creciendo en ESCALA y no subiendo de opacidad,
 * que es la misma regla que ya gobierna los nodos de conocimiento: un punto de
 * luz que aparece creciendo se lee como que se enciende; uno que aparece con
 * la opacidad se lee como un desvanecido de interfaz.
 *
 * ## Y todos terminan de nacer ANTES de la fase de enfoque
 *
 * El reparto anterior ponía el último en 0,988, o sea que el montaje de la
 * constelación duraba hasta el último fotograma del scroll. Con el hub
 * partido en dos fases eso deja la fase B —el enfoque— compitiendo con el
 * nacimiento del quinto nodo: se acerca la cámara sobre una composición que
 * todavía se está formando.
 *
 * Ahora los cinco están puestos en 0,937, dentro de la FASE A. Lo que queda
 * después es lo que tiene que quedar: mirar lo que hay, y elegir.
 */
const BORN = { from: 0.855, step: 0.012, width: 0.034 }

/**
 * ── Y LOS ENLACES VAN DESPUÉS DE LOS NODOS, NO ANTES ──────────────────────
 *
 * Las conexiones colgaban del desvanecido del GRUPO, que se abre en 0,865 para
 * que el primer nodo pueda nacer. Y en 0,90 la cámara todavía está a cerebro y
 * medio del centro: los cinco nodos quedan fuera de cuadro, así que lo único
 * que se veía eran unos arcos rosas cruzando la pantalla sin unir nada.
 *
 * Es la regla de siempre —una capa que dice estar encendida y dibuja donde no
 * debe— y además está al revés de lo que cuenta la escena: dentro del cerebro
 * la red se descubre por la ESTRUCTURA primero, porque ahí lo que hay que leer
 * es que existe un tejido. Fuera es al contrario: lo que hay son cinco sitios a
 * los que ir, y las conexiones son lo que se ve DESPUÉS, cuando ya hay algo que
 * unir.
 *
 * Y terminan en 0,945, no en 0,995: las conexiones son la última pieza de la
 * FASE A —lo que convierte cinco puntos en una red— y por tanto lo último que
 * aparece antes de que se pueda elegir. Llegando hasta el final del scroll, la
 * red seguía tejiéndose mientras la cámara ya estaba enfocando.
 */
const LINKS = { from: 0.9, to: 0.938 }

/**
 * ── LA TEXTURA DEL HALO ───────────────────────────────────────────────────
 *
 * Un degradado radial cuya opacidad cae como (1 − r)³ y llega a cero exacto en
 * el borde. La potencia es todo: con caída lineal la pendiente es constante y
 * el ojo lee un DISCO recortado —ya está escrito para el cerebro de la mano y
 * para el halo anterior de estas mismas áreas—; con el cubo, la mayor parte del
 * brillo se concentra en el primer tercio y el resto se disuelve.
 *
 * Se genera UNA vez y la comparten los cinco: la textura es blanca y el color
 * lo pone el material del sprite, así que sirve para los cinco acentos.
 */
function useHalo() {
  return useMemo(() => {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const context = canvas.getContext('2d')
    const image = context.createImageData(size, size)
    const half = size / 2

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const dx = (x + 0.5 - half) / half
        const dy = (y + 0.5 - half) / half
        const r = Math.min(1, Math.hypot(dx, dy))
        const fall = (1 - r) ** 3
        const i = (y * size + x) * 4
        image.data[i] = 255
        image.data[i + 1] = 255
        image.data[i + 2] = 255
        image.data[i + 3] = Math.round(fall * 255)
      }
    }

    context.putImageData(image, 0, 0)
    const texture = new CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }, [])
}

const AMBIENT_PULSE_SPEED = 0.14

// Pulsos obsesivos: recorren la misma conexion de ida y vuelta sin llegar a
// resolverse nunca. Es el guino al TOC — un pensamiento que vuelve.
const OBSESSIVE_COUNT = 2
const OBSESSIVE_SPEED = 0.42

/**
 * Senales que se propagan al pasar el cursor.
 *
 * Al tocar un nodo sale un impulso hacia cada vecino; al llegar, ese vecino
 * dispara los suyos. Dos saltos son suficientes: con tres la red entera se
 * enciende a la vez y el gesto deja de leerse como propagacion.
 */
const SIGNAL_SPEED = 1.5
const SIGNAL_MAX_GENERATION = 2
const SIGNAL_POOL = 24

function Node({
  section,
  index,
  lean,
  position,
  phase,
  active,
  muted,
  onSelect,
  onAwaken,
  onNear,
  nodeRadius,
  hitRadius,
}) {
  const meshRef = useRef(null)
  const hitRef = useRef(null)
  const labelRef = useRef(null)
  const pokeRef = useRef(-1)
  const grownRef = useRef(0)
  const awayRef = useRef(-1)
  const haloRef = useRef(null)
  const halo = useHalo()

  /* El acento oscurecido, para el difuso. Ver la nota del material. */
  const dim = useMemo(() => new Color(section.accent).multiplyScalar(DIFFUSE), [section.accent])
  const [hovered, setHovered] = useState(false)
  const reducedMotion = usePrefersReducedMotion()

  /**
   * Señalar es a la vez estado local —la escala del nodo— y dato compartido:
   * las conexiones de arriba necesitan saber cual es. Se avisa por referencia,
   * no por estado, para no renderizar los cinco cada vez que el puntero cruza
   * uno.
   */
  const mark = useCallback(
    (on) => {
      setHovered(on)
      onNear(section.nodeName, on)
    },
    [onNear, section.nodeName],
  )

  const highlighted = hovered || active

  useFrame(() => {
    if (!meshRef.current) return

    /**
     * Su turno dentro de la aparición de la constelación. Es una función pura
     * del scroll: parado no crece, y volviendo al mismo punto sale el mismo
     * tamaño.
     */
    const start = BORN.from + index * BORN.step
    const born = ramp(journey.progress, start, start + BORN.width)

    /*
      ── LA GUARDA VIGILA LAS DOS SENALES, NO SOLO UNA ──────────────────────

      Esto era `Math.abs(born - grownRef.current) > 0.001`, o sea que el bloque
      solo se ejecutaba cuando cambiaba la aparicion del nodo. Y dentro se
      escribe tambien `away`, que sale del OTRO canal del reloj.

      Consecuencia medida: en el editorial el progreso esta clavado en 1, asi
      que `born` no se mueve y el bloque no llegaba a ejecutarse nunca. Las
      cinco etiquetas se quedaban con el ultimo valor que tuvieron en el hub
      —opacidad 1 y `tabIndex` 0— encima del texto y por delante de el en el
      orden de tabulacion. La correccion de `overlayRetreat` estaba escrita y
      no se ejecutaba: parecia un fallo de la senal y era de control de flujo.

      Es literalmente el error que este manual ya tiene documentado para
      `cortex`. Una guarda tiene que vigilar TODAS las senales que se escriben
      dentro de ella.
    */
    const away = overlayRetreat(journey.threshold)

    if (
      Math.abs(born - grownRef.current) > 0.001 ||
      Math.abs(away - awayRef.current) > 0.004
    ) {
      awayRef.current = away
      grownRef.current = born
      /**
       * Y tampoco se puede TOCAR hasta que le toca. Se apaga con la escala y
       * no con `visible`, y no es un capricho: three recorre los objetos
       * invisibles igual que los demás cuando lanza un rayo —`intersectObject`
       * comprueba las capas, no la visibilidad—, así que una esfera sensible
       * invisible sigue interceptando el puntero. Con escala cero no hay nada
       * que acertar.
       */
      if (hitRef.current) hitRef.current.scale.setScalar(born > 0.35 ? 1 : 0)
      if (labelRef.current) {
        /*
          Y fuera de su tramo se quita del flujo entero. Un bloque de `Html` con
          la opacidad a cero sigue existiendo en el DOM y sigue colocandose por
          proyeccion, tambien cuando el nodo esta detras de la camara — o sea
          durante todo el primer acto. Con `display: none` no hay nada que
          colocar.
        */
        /*
          Y con la lectura editorial se va del todo. La retirada de la escena se
          escribia sobre el CANVAS, y esta etiqueta no esta dentro de el: `Html`
          de drei la pone en un portal HERMANO, asi que sobrevivia entera
          —opaca y tabulable— encima del texto. Ver `overlayRetreat`.
        */
        labelRef.current.style.display = born > 0.02 && away > 0.01 ? '' : 'none'
        /*
          Y el foco se habilita aqui, no en el render: `born` sale de una ref
          —para no re-renderizar el arbol en cada pixel de scroll— asi que un
          `tabIndex` calculado durante el render se quedaria congelado en el
          valor del primer frame, que es -1. El nodo nunca entraria en el orden
          de tabulacion.
        */
        labelRef.current.tabIndex = born > 0.35 && away > 0.5 ? 0 : -1
        labelRef.current.style.opacity = ramp(born, 0.45, 1) * away
        /*
          La etiqueta se ancla HACIA DENTRO, no centrada sobre el nodo.

          Centrada, la mitad de su ancho sobresale hacia fuera del anillo, y en
          vertical eso es lo que manda: el encuadre tiene que abrirse hasta
          caber esos sesenta y cinco pixeles, y con ellos se iba la mitad del
          ancho util. Poniendola del lado del cerebro, el nodo mas exterior de
          la constelacion pasa a ser el propio nodo y no su texto.

          El 4% extra es el aire entre el punto y la palabra.
        */
        const anchor = lean * -54
        labelRef.current.style.transform = `translateX(calc(${anchor}% + ${(1 - born) * lean * 6}px))`
      }
    }

    /*
      El acuse del clic: un impulso que decae. Usa `performance.now()` y no el
      progreso porque no viene del scroll, viene del dedo — igual que las
      senales que se propagan por la red al pasar el puntero.
    */
    let poke = 0
    if (pokeRef.current > 0) {
      const age = (performance.now() - pokeRef.current) / 1000 / POKE.life
      if (age >= 1) pokeRef.current = -1
      else poke = POKE.rise * (1 - age) * (1 - age)
    }

    const breath = reducedMotion ? 1 : 1 + Math.sin(journey.beat * 1.4 + phase) * 0.09
    /*
      ── APARTADO, Y MÁS APARTADO CUANTO MÁS SE ENFOCA ────────────────────

      Un nodo no elegido baja a `DIMMED` en cuanto hay otro abierto, y baja
      todavía más a medida que avanza la FASE B del hub. No desaparece nunca:
      seguirían siendo cinco áreas y el visitante tiene que poder cambiar de
      idea, y además un nodo sin sus vecinos deja de ser parte de una red.

      Que dependa de `hubFocus` es lo que hace que el enfoque se lea como un
      movimiento del RECORRIDO y no como un estado de la interfaz: la cámara
      entra, el elegido crece y los demás ceden, y las tres cosas las manda el
      mismo número. Y es también lo que permite que enfocar no toque la
      cámara —ver `hubFocus` en la tabla—: lo que la selección mueve son
      escalas y opacidades, nunca una posición.
    */
    const focus = hubFocus(journey.progress)
    const aside = muted ? DIMMED * (1 - focus * 0.45) : 1 + (active ? focus * 0.3 : 0)
    const target = born * breath * aside * (highlighted ? HOVER_SCALE : 1) * (1 + poke)
    // Lerp en vez de asignar: el cambio de escala tiene que sentirse como un
    // musculo, no como un interruptor.
    meshRef.current.scale.lerp({ x: target, y: target, z: target }, 0.18)

    /*
      El halo crece con el nucleo. Sin esto se quedaria a tamano completo desde
      el primer frame y los cinco nodos apareceria antes su resplandor que
      ellos, que es justo el orden contrario al que cuenta la escena.
    */
    if (haloRef.current) {
      const spread = HALO_SCALE * meshRef.current.scale.x
      haloRef.current.scale.set(nodeRadius * spread, nodeRadius * spread, 1)
    }
  })

  return (
    <group position={position}>
      {/*
        Zona sensible invisible, mucho mayor que el nodo. Un nodo de 5,5 cm
        de radio es imposible de acertar con el dedo: en tactil el objetivo
        util son unos 9 mm en pantalla, y por eso no funcionaban en movil.
      */}
      <mesh
        ref={hitRef}
        visible={false}
        onPointerOver={(event) => {
          event.stopPropagation()
          mark(true)
          onAwaken(section.nodeName)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          mark(false)
          document.body.style.cursor = ''
        }}
        // `onPointerDown` ademas de `onClick`: en tactil no hay hover previo,
        // asi el nodo se enciende en cuanto se toca.
        onPointerDown={(event) => {
          event.stopPropagation()
          mark(true)
          onAwaken(section.nodeName)
        }}
        onClick={(event) => {
          event.stopPropagation()
          pokeRef.current = performance.now()
          onSelect(section.id)
        }}
      >
        <sphereGeometry args={[hitRadius, 12, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/*
        ── EL ÁREA SE ILUMINA A SÍ MISMA ──────────────────────────────────

        Estaba con `emissive={GLOW}` a 0,55 y el resto lo ponía la luz de la
        escena. Funcionaba mientras las áreas vivían fuera del cerebro, donde
        les llegaba el HDRI de estudio entero. Dentro de la cavidad la única
        luz es la de la red, y hubo que cerrarla al 4% para que las paredes no
        salieran quemadas: medido con la sonda, el área estaba en el cuadro, a
        281 píxeles de radio, con la malla visible y la opacidad a uno — y no
        se veía, porque su material lit no recibía prácticamente nada.

        Es la misma lección que ya costó una vuelta con la corteza: **un objeto
        que tiene que verse en un sitio sin luz no puede depender de la luz.**

        Emisivo con SU PROPIO acento, no con el rosa común. Así los cinco se
        distinguen entre sí —coco, añil, rosa— y el color que la página usa
        para cada área es el mismo que tiene su nodo en la escena, que es lo
        que hace que la constelación y el texto se sientan la misma web.

        Y con niebla: es un objeto en el espacio, y que se apague con la
        distancia es la mitad de la profundidad de la cavidad.
      */}
      <mesh ref={meshRef} raycast={() => null}>
        <sphereGeometry args={[nodeRadius, 20, 16]} />
        <meshStandardMaterial
          /**
           * ── EL DIFUSO VA OSCURO, Y AHÍ ESTABA EL NÚCLEO BLANCO ─────────
           *
           * El nodo llevaba el acento pleno también en el color difuso, y eso
           * es lo que lo quemaba. La luz del cerebro es una puntual de 9 con
           * caída cuadrática y el nodo está a un cerebro del centro, o sea a
           * unas 2,1 unidades: entrega 9 / 2,1² = **2,05 veces** su intensidad
           * nominal. Multiplicado por un albedo claro, el canal rojo del coco
           * ya se iba por encima de uno ANTES de sumarle el emisivo y el
           * bloom. Tres cosas claras coincidiendo, que es el error de siempre
           * en esta web.
           *
           * Con el albedo al 28% esa misma luz entrega un modelado suave —el
           * nodo sigue teniendo una cara iluminada y otra en sombra, que es lo
           * que lo ata a la escena— y el color del centro pasa a decidirlo el
           * EMISIVO, que sí lleva el acento puro. Los tres canales se quedan
           * por debajo de la saturación y el centro conserva su tono.
           *
           * No es bajar el brillo: el nodo sigue floreciendo. Es que lo que
           * florece ahora tiene color.
           */
          color={dim}
          emissive={section.accent}
          /**
           * Y SUBE, porque el sitio ha cambiado.
           *
           * 0,22 era lo justo dentro de la cavidad, donde el nodo estaba a
           * medio metro y el bloom lo desbordaba solo. Fuera está a diez
           * unidades y compite con un cerebro iluminado: con ese valor no
           * llegaba al umbral de floración (0,32 de luminancia) y salía como
           * una bolita mate. Con 1,15 florece, que es lo que hace que un punto
           * pequeño se lea como una luz y no como un objeto lejano.
           */
          /**
           * ── Y EL NÚCLEO DEJA DE SER BLANCO ────────────────────────────
           *
           * El nodo salía con el centro en blanco puro y el acento reducido al
           * halo del bloom. La causa no era el emisivo: era el ESPECULAR. Con
           * rugosidad 0,42 la esfera devuelve el HDRI de estudio y la luz del
           * cerebro como un punto muy duro, y ese punto —que es blanco, porque
           * un reflejo especular no lleva el color del material— cae justo en
           * el centro del nodo y satura por encima del umbral del bloom.
           *
           * Casi mate (0,88) no hay punto: lo que se ve es el emisivo, que SÍ
           * lleva el acento. Y el emisivo sube a 1,25 para compensar, porque
           * ahora es lo único que enciende el nodo. Lectura resultante:
           *
           *     acento saturado en el centro → caída del halo → atmósfera
           *
           * y no "blanco → halo", que es lo que había.
           */
          emissiveIntensity={highlighted ? 1.45 : muted ? 0.42 : 0.86}
          roughness={0.88}
          /**
           * Y CASI SIN ENTORNO. Aquí estaba el núcleo blanco.
           *
           * `envMapIntensity` vale uno por defecto, así que el HDRI de estudio
           * —que es el que ilumina la portada— seguía bañando las áreas dentro
           * del cerebro con luz de plató. Sumado al emisivo, el resultado
           * pasaba el umbral del bloom y el nodo salía con el centro en blanco
           * puro: el color del área, que es lo único que ese nodo tiene que
           * decir, desaparecía.
           *
           * Dentro no hay estudio. Lo poco que queda es rebote.
           *
           * Fuera sí lo hay, y además está la luz del propio cerebro: a un
           * cerebro del centro, un nodo está dentro del alcance de esa fuente.
           * Un poco de entorno es lo que le da una cara iluminada y otra en
           * sombra, que es lo que lo ata a la escena. Pero solo un poco: con
           * el entorno entero el núcleo salía blanco y el acento del área, que
           * es lo único que ese nodo dice, desaparecía.
           */
          envMapIntensity={0.12}
          transparent
        />
      </mesh>

      {/*
        ── Y AHORA SÍ HAY HALO, PORQUE ESTE SÍ CAE ─────────────────────────

        El de antes era una esfera del doble de tamaño con opacidad PLANA, y
        por eso salía como una moneda recortada: un degradado que no cae no se
        lee como luz. Este es un plano de cara a la cámara con una textura
        radial cuya opacidad cae como (1 − r)³ hasta cero — la misma corrección
        que ya arregló el halo del cerebro de la mano.

        Su trabajo es la parte de la lectura que el núcleo no puede dar: el
        acento derramándose hacia el espacio. Sin él, lo único que rodea al
        nodo es el bloom, que es blanco por definición porque florece la
        luminancia y no el tono.

        Aditivo y sin escribir profundidad: es luz, no materia.
      */}
      <sprite ref={haloRef} scale={[0, 0, 1]} raycast={() => null}>
        <spriteMaterial
          map={halo}
          color={section.accent}
          transparent
          opacity={highlighted ? 0.7 : muted ? 0.26 : 0.56}
          blending={AdditiveBlending}
          depthWrite={false}
          fog={false}
        />
      </sprite>

      {/*
        ── EL HALO ANTERIOR, Y POR QUÉ SALIÓ ───────────────────────────────

        Una segunda esfera al doble de tamaño, aditiva y con opacidad plana.
        Existía para que el área no se leyera como un píxel encendido cuando se
        veía de lejos, desde fuera del cerebro.

        Dentro de la cavidad hace lo contrario de lo que promete, y es el error
        que ya está escrito en el manual: **un degradado que no cae se ve como
        un DISCO recortado.** Una esfera de color uniforme en aditivo no tiene
        caída ninguna, así que a esta distancia salía como una moneda marrón de
        doscientos píxeles de radio pegada detrás del nodo, tapando la red y
        las etiquetas que hubiera detrás.

        Lo que hace que el área parezca luz aquí dentro no es sumarle una
        moneda: es que sea lo más claro del cuadro y que el bloom la desborde,
        que es una caída de verdad y ya estaba puesta.
      */}

      {/*
        ── LA ETIQUETA YA NO ES DE HOVER: ES LA NAVEGACIÓN ──────────────────

        Estaba montada solo mientras el puntero estaba encima, que es lo
        correcto cuando el nodo es un objeto que se explora. Fuera del cerebro
        no lo es: los cinco nodos SON el índice del portfolio, y cinco puntos
        de luz sin nombre no dicen que ahí está el trabajo de Alex. Tampoco
        funcionaría en táctil, donde no hay hover que preceda al toque.

        Así que está siempre —montada desde el primer frame, como todo lo demás
        de esta escena— y lo que cambia con el scroll es su opacidad, escrita
        directamente en el estilo. Se enciende con su nodo.

        Sin `distanceFactor` a propósito: en el interior la ficha se escalaba
        con la distancia porque estaba a medio metro y formaba parte del
        espacio. Aquí el nodo está a diez unidades y es un punto de navegación:
        su nombre tiene que poder leerse, no encogerse con la perspectiva.
      */}
      {/*
        ── Y LA ETIQUETA ES EL CONTROL ACCESIBLE ───────────────────────────

        Los nodos de la escena responden a `onClick` y `onPointerMove` de
        react-three-fiber, que son eventos de PUNTERO y nada mas: no hay foco,
        no hay Enter, no hay nada que anunciar a un lector de pantalla. Con los
        cinco nodos convertidos en el indice del portfolio, eso deja de ser una
        carencia y pasa a ser una barrera.

        La solucion no es superponer botones a la escena: es que la etiqueta
        —que ya existe, ya es DOM real y ya lleva el nombre del area— SEA el
        boton. Se gana el foco por teclado, Enter y Espacio nativos, el orden
        de tabulacion es el de `sections`, y `aria-current` dice cual esta
        abierta. Visualmente no cambia nada: sigue siendo el nombre del nodo.

        Y el foco enciende el mismo estado que el puntero, asi que navegando
        con el teclado se ve exactamente igual que con el raton.
      */}
      <Html
        center
        position={[0, nodeRadius * 2.4, 0]}
        zIndexRange={[18, 0]}
      >
        <button
          ref={labelRef}
          type="button"
          style={{ opacity: 0 }}
          tabIndex={-1}
          aria-current={active ? 'true' : undefined}
          /* Abre la ficha del area; navegar al texto es la accion de dentro. */
          aria-label={`Explorar ${section.label}`}
          onFocus={() => mark(true)}
          onBlur={() => mark(false)}
          onClick={() => {
            pokeRef.current = performance.now()
            onSelect(section.id)
          }}
          className={`pointer-events-auto flex cursor-pointer items-center gap-2 whitespace-nowrap border-l pl-2 pr-1 font-mono text-[12px] leading-none tracking-[0.01em] transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-brain-glow ${
            highlighted
              ? 'border-brain-glow text-cream'
              : muted
                ? 'border-cream/15 text-cream/40'
                : 'border-cream/30 text-cream/80'
          }`}
        >
          <span className="tabular-nums text-[9.5px] text-cream/45">
            {section.nodeName.replace('node_', 'N')}
          </span>
          {section.label}
        </button>
      </Html>
    </group>
  )
}

/** Flujo de fondo: recorre una conexion en bucle, sin relacion con el cursor. */
function AmbientPulse({ curve, offset, size, obsessive = false }) {
  const ref = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  useFrame((state) => {
    if (!ref.current) return
    if (reducedMotion) {
      ref.current.position.copy(curve.getPointAt(0.5))
      return
    }

    // El COMPÁS: el pulso obsesivo sigue recorriendo la conexión de ida y
    // vuelta, pero lo empuja el scroll. Parado no se resuelve porque no avanza.
    const elapsed = journey.beat
    let t

    if (obsessive) {
      // Onda triangular: llega al final, se da la vuelta y repite. No avanza,
      // no se resuelve.
      const raw = (elapsed * OBSESSIVE_SPEED + offset) % 2
      t = raw > 1 ? 2 - raw : raw
    } else {
      t = (elapsed * AMBIENT_PULSE_SPEED + offset) % 1
    }

    ref.current.position.copy(curve.getPointAt(t))
    /**
     * El fade del grupo se aplica aquí a mano, y hace falta: el bucle que
     * atenúa la capa entera escribe `opacity` solo cuando el fade cambia, y
     * este pulso la reescribe en CADA frame. Sin el factor, el pulso se
     * saltaba la aparición de la constelación y entraba a plena luz en el
     * primer frame en que el grupo se hace visible.
     */
    const fade =
      layerOpacity('nodes', journey.progress) *
      ramp(journey.progress, LINKS.from, LINKS.to)
    ref.current.material.opacity = Math.sin(t * Math.PI) * (obsessive ? 0.95 : 0.7) * fade
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[size * (obsessive ? 0.55 : 0.42), 10, 8]} />
      <meshBasicMaterial color={GLOW} transparent depthWrite={false} fog={false} />
    </mesh>
  )
}

/*
  ── AQUÍ ESTABA `NeuralField`, Y HA SALIDO ────────────────────────────────

  Treinta y ocho puntos con sus hilos, repartidos en una capa esférica de 1,35
  a 2,6 radios de la constelación. Su trabajo era dar profundidad por los
  bordes cuando el cerebro se veía desde fuera.

  Con las áreas dentro de la cavidad ya no puede hacerlo: vive FUERA del casco,
  así que desde dentro o no se ve o se ve a través de la pared, y las dos cosas
  son peores que no tenerlo. La profundidad de aquí dentro la ponen la pared de
  la corteza, su niebla y la red de conocimiento, que son tres capas reales a
  tres distancias reales.

  Y de paso se va lo que la dirección de arte llama exceso de partículas: no se
  añade polvo para simular espacio cuando hay espacio de verdad.
*/

export default function NeuralNodes({
  sections,
  activeSection,
  onSelect,
  brain = 2.1,
  layer = 'nodes',
}) {
  const rootRef = useRef(null)
  const basesRef = useRef(null)
  const fadeRef = useRef(-1)
  /** Cuánto se ha alejado ya la constelación en el umbral. Ver `hubRecede`. */
  const recedeRef = useRef(-1)
  const linksRef = useRef([])
  const wovenRef = useRef(-1)
  /**
   * Qué nodo está señalado ahora mismo, por puntero o por foco de teclado.
   *
   * Va en una referencia y no en el estado a propósito: lo leen las conexiones
   * en cada frame, y pasarlo por React sería volver a renderizar los cinco
   * nodos y sus cinco fichas cada vez que el puntero cruza uno.
   */
  const nearRef = useRef(null)
  const nearShownRef = useRef('')

  /**
   * El nombre de nodo del área seleccionada. `activeSection` es un id de
   * sección y `linesByNode` está indexado por nombre de nodo: la traducción se
   * hace una vez aquí y no en cada frame dentro del bucle.
   */
  const activeName = useMemo(
    () => sections.find((section) => section.id === activeSection)?.nodeName ?? null,
    [sections, activeSection],
  )

  /**
   * La proporción de la ventana, que aquí decide DOS cosas: cuánto se estrecha
   * la constelación —ver `spreadFor`— y de qué tamaño se dibuja cada nodo,
   * porque en vertical la cámara tiene que irse más lejos para que quepan.
   */
  const aspect = useViewportAspect()
  const portrait = aspect < 1.2

  const nodeRadius = brain * (portrait ? NODE_SCALE.compact : NODE_SCALE.regular)
  const hitRadius = brain * (portrait ? HIT_SCALE.compact : HIT_SCALE.regular)

  /**
   * El desvanecido se aplica aqui dentro, leyendo el progreso del scroll en
   * cada frame. Pasarlo como prop obligaria a re-renderizar todo el arbol en
   * cada pixel de scroll, que es exactamente lo que hacia que el recorrido
   * fuera a tirones.
   *
   * Con `visible = false` el grupo entero deja de dibujarse Y de recibir
   * raycast, asi que los nodos tampoco interceptan clics desde la portada.
   */
  useFrame(() => {
    const root = rootRef.current
    if (!root) return

    const fade = layerOpacity(layer, journey.progress)

    /**
     * ── Y LA CONSTELACIÓN SE ALEJA MIENTRAS SE VA ─────────────────────────
     *
     * El anillo se contrae hacia el cerebro durante el cruce del umbral, así
     * que lo que se ve no es un interruptor bajando: es el conjunto yéndose al
     * fondo. Ver `hubRecede`.
     *
     * Es el único sitio que escribe la escala de este grupo —nadie la declara
     * en el JSX— y es una función pura del scroll: parado no se mueve y al
     * subir se deshace.
     *
     * LA GUARDA VIGILA LAS DOS SEÑALES. Es el error que este manual tiene
     * documentado dos veces: durante el editorial `progress` está clavado en 1,
     * así que `fade` no se mueve y un `return` que solo lo mire deja fuera todo
     * lo que cuelgue del otro canal — que es exactamente lo que dejó las cinco
     * etiquetas encima del texto.
     */
    const recede = hubRecede(journey.threshold)
    const still =
      Math.abs(fade - fadeRef.current) < 0.002 && Math.abs(recede - recedeRef.current) < 0.002
    // Fuera del tramo de aparicion el valor no se mueve, y esos son casi todos
    // los frames. Recorrer el grafo entero en cada uno para no cambiar nada
    // era trabajo puro.
    if (still) return
    fadeRef.current = fade
    recedeRef.current = recede

    root.visible = fade > 0.02
    if (!root.visible) return

    root.scale.setScalar(recede)

    // El grafo se recorre una sola vez, guardando la opacidad original de cada
    // material. A partir de ahi solo se multiplican valores.
    if (!basesRef.current) {
      basesRef.current = []
      root.traverse((object) => {
        if (!object.material) return
        /*
          Todos nacen ya transparentes desde el JSX, asi que esto normalmente no
          cambia nada. Se deja con la guarda porque cambiar `transparent` sin
          `needsUpdate` deja el material diciendo una cosa y su programa
          haciendo otra — es lo que rompio la reversibilidad de la mascota.
        */
        if (!object.material.transparent) {
          object.material.transparent = true
          object.material.needsUpdate = true
        }
        // Las conexiones tienen su propio tiempo. Ver `LINKS`.
        if (object.userData.link) return
        basesRef.current.push([object.material, object.material.opacity])
      })
    }

    for (const [material, base] of basesRef.current) material.opacity = base * fade
  })

  /**
   * Las conexiones, con su propio tiempo. Va en un bucle aparte y no dentro del
   * de arriba porque aquel solo se ejecuta cuando cambia el desvanecido del
   * grupo, y este tiene que seguir moviéndose cuando aquel ya está quieto.
   */
  useFrame(() => {
    const woven = layerOpacity(layer, journey.progress) * ramp(journey.progress, LINKS.from, LINKS.to)

    /*
      ── LAS CONEXIONES DEL NODO SEÑALADO GANAN PRESENCIA ─────────────────

      Un nodo de una red no se explica solo: lo que dice de él la escena es con
      qué limita. Al apuntarlo —o al llegar con el tabulador— sus dos aristas
      del perímetro suben, y con eso el visitante ve de un vistazo que las cinco
      áreas están encadenadas y no sueltas.

      El nodo seleccionado hace lo mismo, y cede en cuanto el puntero está sobre
      otro: mirar no es haber cambiado de idea.
    */
    const near = nearRef.current ?? activeName

    /*
      La guarda vigila las DOS señales que se escriben aquí dentro. Con una
      sola, mover el puntero entre dos nodos con el scroll quieto no llegaba a
      ejecutar el bloque: parecía que el realce no funcionaba y era control de
      flujo. Es el mismo error de guarda que ya costo una vuelta en el cerebro.
    */
    const key = near ?? ''
    if (Math.abs(woven - wovenRef.current) < 0.002 && key === nearShownRef.current) return
    wovenRef.current = woven
    nearShownRef.current = key

    const lit = near ? (linesByNode.get(near) ?? []) : []

    for (let i = 0; i < linksRef.current.length; i += 1) {
      const line = linksRef.current[i]
      if (!line) continue
      const strong = lit.includes(i)
      line.material.opacity = LINK_OPACITY * woven * (strong ? LINK_NEAR : 1)
    }
  })
  const { nodes, curves, edgesByNode, linesByNode } = useMemo(() => {
    // El tamano del cerebro, asi que la cavidad se adapta a la pantalla
    // conservando la composicion.
    const basis = orbitBasis()
    const positions = nodePositions(brain, { ...basis, spread: spreadFor(aspect) })

    const nodes = sections
      .filter((section) => positions[section.nodeName])
      .map((section, index) => ({
        section,
        index,
        /**
         * De qué lado del cerebro ha quedado, en la pantalla final. Es lo que
         * decide hacia dónde se ancla su etiqueta: hacia dentro, o sea al
         * revés de su propio lado.
         */
        lean: positions[section.nodeName].dot(basis.right) >= 0 ? 1 : -1,
        position: positions[section.nodeName].clone(),
        phase: index * 1.7,
      }))

    const curves = []
    const edgesByNode = new Map()
    /* Que lineas toca cada nodo. Lo necesita el realce del hover: subir la
       opacidad de una linea pide su indice, no su curva. */
    const linesByNode = new Map()

    nodeConnections
      .filter(([from, to]) => positions[from] && positions[to])
      .forEach(([from, to]) => {
        const a = positions[from].clone()
        const b = positions[to].clone()
        // Punto medio desplazado: una recta entre dos nodos parece un cable;
        // una curva suave parece una conexion.
        const mid = a.clone().lerp(b, 0.5)
        /**
         * El arco se comba hacia FUERA del centro, no hacia +Z.
         *
         * Fuera daba igual: la constelación se veía siempre desde delante y
         * empujar el punto medio hacia el espectador bastaba para que la línea
         * no pareciera un cable. Dentro la cámara da la vuelta a la cavidad, y
         * un desvío fijo en Z hace que la mitad de los arcos se comben hacia la
         * pared y la otra mitad hacia la red. Combándolos hacia fuera del
         * centro, los cinco se separan de la nube por igual.
         */
        mid.addScaledVector(mid.clone().normalize(), brain * 0.18)

        const curve = new CatmullRomCurve3([a, mid, b])
        const lineIndex = curves.length
        curves.push(curve)

        for (const end of [from, to]) {
          if (!linesByNode.has(end)) linesByNode.set(end, [])
          linesByNode.get(end).push(lineIndex)
        }

        const register = (origin, target, reversed) => {
          if (!edgesByNode.has(origin)) edgesByNode.set(origin, [])
          edgesByNode.get(origin).push({ curve, target, reversed })
        }

        register(from, to, false)
        register(to, from, true)
      })

    return { nodes, curves, edgesByNode, linesByNode }
  }, [sections, brain, aspect])

  const ambient = useMemo(
    () => curves.map((curve, index) => ({ curve, offset: index / curves.length })),
    [curves],
  )

  const obsessive = useMemo(
    () =>
      Array.from({ length: OBSESSIVE_COUNT }, (_, index) => ({
        // Siempre las mismas aristas: la gracia es que el ojo acabe notando
        // que ahi hay algo que no avanza.
        curve: curves[index % curves.length],
        offset: index * 0.55,
      })),
    [curves],
  )

  /**
   * Senales vivas. Van en una ref y no en estado: se crean y mueren varias
   * veces por segundo, y pasar eso por el ciclo de render de React
   * provocaria cientos de renders por interaccion.
   */
  const signalsRef = useRef([])
  const meshRefs = useRef([])

  const emit = useCallback(
    (nodeName, generation, time) => {
      const edges = edgesByNode.get(nodeName)
      if (!edges) return

      edges.forEach((edge) => {
        if (signalsRef.current.length >= SIGNAL_POOL) return
        signalsRef.current.push({
          curve: edge.curve,
          reversed: edge.reversed,
          target: edge.target,
          generation,
          birth: time,
          propagated: false,
        })
      })
    },
    [edgesByNode],
  )

  /**
   * Quien esta señalado. Solo escribe la referencia: el ultimo en entrar manda,
   * y al salir solo se borra si el que sale es el que estaba puesto —sin esa
   * comprobacion, pasar rapido de un nodo a otro dejaria la marca a null porque
   * la salida del primero llega despues de la entrada del segundo—.
   */
  const handleNear = useCallback((nodeName, on) => {
    if (on) nearRef.current = nodeName
    else if (nearRef.current === nodeName) nearRef.current = null
  }, [])

  const awaken = useCallback(
    (nodeName) => {
      // `performance.now()` en vez del reloj de la escena: el disparo llega
      // desde un evento del DOM, fuera del bucle de render.
      emit(nodeName, 0, performance.now() / 1000)
    },
    [emit],
  )

  useFrame((state) => {
    const now = state.clock.elapsedTime
    const signals = signalsRef.current

    for (let i = signals.length - 1; i >= 0; i--) {
      const signal = signals[i]
      const t = (now - signal.birth) * SIGNAL_SPEED

      if (t >= 1) {
        // Al llegar, el nodo de destino dispara los suyos.
        if (!signal.propagated && signal.generation < SIGNAL_MAX_GENERATION) {
          signal.propagated = true
          emit(signal.target, signal.generation + 1, now)
        }
        signals.splice(i, 1)
      }
    }

    // El resto del banco se aparca fuera de cuadro en vez de desmontarse:
    // crear y destruir mallas por frame es lo que mata el framerate.
    meshRefs.current.forEach((mesh, index) => {
      if (!mesh) return
      const signal = signals[index]

      if (!signal) {
        mesh.visible = false
        return
      }

      const raw = (now - signal.birth) * SIGNAL_SPEED
      const t = signal.reversed ? 1 - raw : raw
      mesh.visible = true
      mesh.position.copy(signal.curve.getPointAt(Math.min(Math.max(t, 0), 1)))
      mesh.material.opacity = Math.sin(raw * Math.PI) * 0.95
      const scale = 1 + Math.sin(raw * Math.PI) * 0.8
      mesh.scale.setScalar(scale)
    })
  })

  return (
    <group ref={rootRef} visible={false}>
      {curves.map((curve, index) => (
        <Line
          key={`line-${index}`}
          ref={(node) => {
            linksRef.current[index] = node
          }}
          userData={{ link: true }}
          points={curve.getPoints(28)}
          color={new Color(LINE)}
          lineWidth={1.2}
          transparent
          opacity={0}
        />
      ))}

      {ambient.map((pulse, index) => (
        <AmbientPulse
          key={`ambient-${index}`}
          curve={pulse.curve}
          offset={pulse.offset}
          size={nodeRadius}
        />
      ))}

      {obsessive.map((pulse, index) => (
        <AmbientPulse
          key={`obsessive-${index}`}
          curve={pulse.curve}
          offset={pulse.offset}
          size={nodeRadius}
          obsessive
        />
      ))}

      {/* Banco de senales reutilizables. */}
      {Array.from({ length: SIGNAL_POOL }, (_, index) => (
        <mesh
          key={`signal-${index}`}
          ref={(node) => {
            meshRefs.current[index] = node
          }}
          visible={false}
        >
          <sphereGeometry args={[nodeRadius * 0.5, 10, 8]} />
          {/* El rosa de marca, no un blanco rosado, y pasando por la curva de
              tono: `#FFD2DA` con `toneMapped={false}` era uno de los destellos
              blancos sueltos que había que quitar del interior. */}
          <meshBasicMaterial color={GLOW} transparent depthWrite={false} fog={false} />
        </mesh>
      ))}

      {nodes.map((node) => (
        <Node
          key={node.section.id}
          section={node.section}
          index={node.index}
          lean={node.lean}
          position={node.position}
          phase={node.phase}
          active={activeSection === node.section.id}
          muted={!!activeSection && activeSection !== node.section.id}
          onSelect={onSelect}
          onAwaken={awaken}
          onNear={handleNear}
          nodeRadius={nodeRadius}
          hitRadius={hitRadius}
        />
      ))}
    </group>
  )
}
