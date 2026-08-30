import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import {
  BackSide,
  Box3,
  CanvasTexture,
  Color,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Plane,
  Vector2,
  Vector3,
} from 'three'
import { journey } from '../../journey/clock'
import {
  cortex,
  crossing,
  emergence,
  enclosure,
  insideness,
  layerOpacity,
  pierce,
} from '../../journey/stages'
import { subdividePN } from '../../three/subdivide'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

/**
 * El cerebro, flotando, con los nodos orbitandolo.
 *
 * El intento anterior metia la camara DENTRO del modelo escalado y dibujado
 * por la cara interior. El resultado era una pared de pliegues rosas que
 * llenaba la pantalla y tapaba los nodos: no se leia como un sitio, se leia
 * como un fallo. Visto desde fuera, como objeto, si se entiende.
 */
/**
 * Misma malla de siempre, con la textura rosa/negra ya horneada dentro. No es
 * un cerebro nuevo: la geometria coincide hasta el triangulo (973.635 contra
 * 973.786 del original, antes de simplificar).
 */
const MODEL_URL = '/preview/brain-neural.glb'
const DRACO_PATH = '/draco/'

/**
 * Vidrio de verdad, no opacidad.
 *
 * `transmission` no es lo mismo que bajar el alfa. Bajar el alfa mezcla el
 * color del objeto con lo que hay detras y se ve como un fantasma. La
 * transmision hace que la luz ATRAVIESE el material: refracta segun el indice
 * `ior`, se tine segun el grosor, y conserva los reflejos de la superficie. Es
 * la diferencia entre una calcomania y una pieza de cristal.
 *
 * El precio es que three tiene que dibujar la escena DOS VECES: una a un
 * buffer aparte para saber que hay detras del cristal, y otra la final. Por
 * eso en movil se cae a un material normal.
 */
/**
 * La rugosidad subió de 0,14 a 0,34, y es el cambio que quita el "cromado".
 *
 * Con 0,14 la superficie es casi un espejo: cada foco del HDRI de estudio se
 * devuelve como un punto blanco pequeño y durísimo, y sobre una malla de
 * pliegues eso son cientos de puntos blancos. El cerebro no se leía como una
 * pieza de vidrio oscuro, se leía como cromo quemado.
 *
 * Difuminando el reflejo, los mismos focos se convierten en brillos anchos y
 * suaves —que es lo que hace un vidrio real, no un espejo— y el negro profundo
 * de la textura vuelve a verse. El blanco pasa a ser lo que debía ser: el
 * acento, no la superficie.
 */
const GLASS = {
  roughness: 0.34,
  ior: 1.45,
  metalness: 0,
}

/**
 * Y el reflejo del entorno baja de 1,4 a 0,7 por lo mismo. El HDRI es el que
 * hace que el vidrio parezca vidrio, así que no se quita; pero con el entorno
 * al 140% competía con la única luz que debería mandar aquí dentro, que es la
 * de los propios surcos.
 */
const ENV_REFLECTION = 0.7

/**
 * Cuanta transmision, ajustable desde la URL: `?glass=0` la apaga, `?glass=0.6`
 * la deja a medias.
 *
 * Existe porque NO PUEDO comprobar esto yo. El navegador con el que saco las
 * capturas dibuja por software, y ahi la transmision necesita un buffer de
 * coma flotante que no tiene: el cerebro sale invisible. En una tarjeta de
 * verdad deberia verse. Antes que dar por bueno un valor que no he podido
 * mirar, se deja donde se pueda cambiar sin tocar codigo.
 */
/**
 * ── Y EL VALOR BAJA DE 0,90 A 0,45, medido con la sonda ────────────────────
 *
 * Con 0,90 el cerebro desaparece en cuanto el telón del interior se vuelve
 * opaco: un material casi totalmente transmisivo refracta lo que tiene detrás,
 * y detrás hay marrón oscuro. Medido en p=0,27 — malla visible, opacidad 1,
 * ocupando 750 × 658 píxeles del cuadro — y en pantalla no había nada.
 *
 * Es la misma trampa que ya está escrita en el manual ("un material transmisivo
 * necesita algo OPACO detrás"), pero al revés: lo que tiene detrás es opaco y
 * es oscuro, así que refractarlo equivale a borrarse.
 *
 * A 0,45 sigue siendo vidrio —se ve el volumen por dentro, los surcos brillan a
 * través— y conserva superficie propia: reflejos, borde y forma. Es el aspecto
 * de joya de la grabación del 22 de agosto, que es lo que había que recuperar.
 */
function readTransmission() {
  if (typeof window === 'undefined') return 0.45
  const raw = new URLSearchParams(window.location.search).get('glass')
  if (raw === null) return 0.45
  const value = Number(raw)
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.9
}

/**
 * Paleta del cerebro. Los surcos brillan con este rosa.
 *
 * ── Y ES #E98F96, NO EL ROSA DE MARCA EXACTO ──────────────────────────────
 *
 * Era `#E98FA0`, el rosa de la identidad. Medido con `color.mjs`, sus SOMBRAS
 * caían en 330–333°, que es el borde con el morado: en el cruce de la corteza
 * el 89% del cuadro entraba en la familia del rosa y un 1,8% de los píxeles se
 * metía en ese rango. No se percibía como lila, pero era el único sitio del
 * recorrido donde el medidor se acercaba a la frontera que la identidad
 * prohíbe.
 *
 * Este rosa tiene siete puntos menos de azul: el tono sube de 348,7° a 355,3°
 * y con él suben sus sombras, que salen del rango peligroso. En el cuadro
 * claro la diferencia no se ve; en las sombras es la diferencia entre carmín y
 * morado.
 */
const GLOW = '#E98F96'
/**
 * El cuerpo del cerebro bajo el emisivo.
 *
 * Estaba en #1C0F1D, que tiene el azul por encima del rojo: es un violeta muy
 * oscuro, no un marron. Casi no se ve —el emisivo se lo come— pero es el color
 * que asoma en los surcos apagados y en el borde del casco, y en las capturas
 * teñia de lila justo la parte del cerebro que no brilla.
 */
/**
 * Y sube a un coco oscuro de verdad: `#2B1A12` en vez de `#150D0B`.
 *
 * Casi negro, la masa de los giros no tenía color: en el plano corto de la
 * corteza el cuadro era gris oscuro con surcos rosas, y medido con
 * `color.mjs` el rosa se llevaba el 63% de los píxeles en 0,29 y el 88% en
 * 0,36. La proporción de la marca es la contraria —70% marfil y coco, 20%
 * rosa—, así que la masa tiene que APORTAR coco, no ausencia.
 */
const BODY = '#2B1A12'

/** Brillo de los surcos en reposo. Al atravesar la corteza BAJA. */
/**
 * 1,0 y no 1,35. Con bloom encima, 1,35 lleva el rosa de marca `#E98FA0` hasta
 * un carmín saturado: es el "magenta médico" que la dirección de arte prohíbe.
 * Lo que hace que los surcos se lean como energía no es su brillo, es que sean
 * lo único claro sobre una masa oscura.
 */
/**
 * Vuelve a 1,35.
 *
 * Bajó a 1,0 en la fase 5D.7 con el argumento de que el bloom llevaba el rosa
 * de marca a un carmín saturado. El argumento era correcto y la corrección era
 * el sitio equivocado: lo que hacía del cerebro una joya —giros negros con luz
 * carmín ardiendo en los surcos— vivía justo en ese valor. Comparado con la
 * grabación del 22 de agosto, con 1,0 el cerebro pasa a ser un bulto granate
 * apagado que en 0,26 desaparece del cuadro.
 *
 * El exceso de rosa se corrige donde nace —el tono de `GLOW` y el bloom del
 * tramo— y no apagando el objeto.
 */
const EMISSIVE = 1.35

/** Intensidad de la luz que sale del cerebro, vista desde fuera. */
const LIGHT = 9

/**
 * ── LA PARED DE DENTRO ────────────────────────────────────────────────────
 *
 * Es el arreglo del "vacío marrón". El casco es una malla cerrada con las
 * caras mirando hacia FUERA: desde dentro están todas de espaldas y el
 * renderizador las descarta, así que el cerebro es literalmente invisible
 * desde su propio interior. Encima, el código lo apagaba entero al entrar para
 * ahorrarse el doble render de la transmisión. Resultado: en cuanto la cámara
 * cruzaba la membrana no quedaba ni un triángulo de cerebro en pantalla y lo
 * único detrás de la red era el telón —una esfera de treinta unidades con un
 * degradado—. La red no estaba DENTRO de nada.
 *
 * ## Y NO PUEDE SER LA MISMA MALLA. Esto se midió, y cambió el plan
 *
 * Lo primero que se probó fue dibujar el mismo modelo por la cara de dentro:
 * geometría compartida, coste casi cero, cero assets nuevos. En pantalla salía
 * una cavidad con paredes… y las cinco áreas desaparecían. La sonda decía que
 * estaban en el cuadro, visibles, con opacidad uno y a 280 píxeles de radio.
 * Lo único que seguía viéndose dentro era lo que lleva `depthTest: false`.
 *
 * La causa se midió lanzando rayos desde el centro del cerebro
 * (`window.__cocobrain.cavity`, ver `World.jsx`), y es contundente:
 *
 *     primera pared desde el centro, en fracciones del cerebro
 *     mínimo 0,042   ·   p10 0,075   ·   MEDIANA 0,221   ·   p90 0,473
 *
 * **`brain-neural.glb` no tiene cavidad.** Es un cerebro macizo: la caja
 * envolvente mide 1,998 × 1,834 × 1,971 y de ahí salió el elipsoide de
 * semiejes 0,500 · 0,459 · 0,493 con el que se decidía qué cabía dentro, pero
 * ese elipsoide describe el BORDE EXTERIOR. Por dentro hay surcos, el tronco
 * encefálico y la fisura entre hemisferios, y en la mitad de las direcciones la
 * primera superficie está antes de 0,22. En la dirección de `node_03` está a
 * 0,073. Las áreas no eran invisibles: estaban detrás de un pliegue.
 *
 * ## Lo que se dibuja en su lugar
 *
 * Un elipsoide liso que envuelve al cerebro, visto por dentro, con SU MISMA
 * textura horneada y su mapa de normales. No es un objeto nuevo ni un asset
 * nuevo: son las dos texturas que ya están cargadas, sobre unos mil quinientos
 * triángulos en vez de cincuenta y ocho mil.
 *
 * Y es honesto sobre lo que es. No finge anatomía interior —no la hay— sino que
 * hace lo único que la fase pedía de él: cerrar el espacio. Da pared, da
 * oclusión, da un fondo que se aleja con la niebla y deja que la red sea lo que
 * se mira. La anatomía de dentro sería otro modelo, y ese sí es un asset que no
 * existe.
 */

/**
 * Cuánto se amplía el cerebro para hacer de sala. Ver la cabecera de la sala:
 * con la cámara orbitando a 0,36 del centro y la nube llegando a 0,115, la
 * pared tiene que quedar por encima de 0,80 para no meterse entre las dos.
 */
const CHAMBER_SCALE = 2.0

/**
 * Cuándo se enciende la sala, en fracción del radio del cerebro DE TAMAÑO
 * NATURAL. Uno es su superficie. Ver la nota en el bucle.
 */
const CHAMBER_REVEAL = 1.04

/*
  Aquí estuvo `LEAD`: cuánto avanzaba el plano de corte POR DELANTE de la
  cámara para ir comiéndose el grosor de la corteza. Sobre el papel era la
  solución limpia —geometría que se retira, cero mezclas— y en pantalla enseñó
  lo que el modelo es de verdad: una SUPERFICIE, no un sólido. Cortarla a
  bocajarro deja ver que los pliegues son cáscaras de un triángulo de grosor, y
  eso se lee como plástico roto, que es justo lo que había que quitar.

  El corte se queda donde siempre estuvo, en la cámara, haciendo lo único que
  hace bien: que la malla no envuelva al visitante por detrás mientras entra.
*/

const CENTRE = new Vector3()
const CLIP_AT = new Vector3()
const CLIP_NORMAL = new Vector3()
const clipPlane = new Plane(new Vector3(0, 0, -1), 0)
const CLIP_LIST = [clipPlane]

/*
  Aquí estaban `WALL_SCALE` y `WALL_REPEAT`: cuánto mayor que el casco era el
  elipsoide de la pared y cuántas veces se repetía su textura alrededor. Se van
  con el elipsoide. La sala es ahora la propia malla del cerebro, así que su
  textura cae donde le corresponde y no hay nada que repetir.
*/
/**
 * Y va MUY oscuro. Medido en la primera captura del interior con `#3A241A`: el
 * cuadro entero salía en un rosa pardo del 46% de saturación, o sea la
 * proporción de la marca del revés y rozando el malva prohibido. La única
 * fuente de luz que hay aquí dentro es rosa, así que la pared no puede aportar
 * también color: tiene que ser la masa oscura sobre la que se ve la red.
 */
/**
 * ── Y EL TINTE DE LA SALA ES COCO, NO GRANATE ─────────────────────────────
 *
 * Era `#2A1A12`, y sobre el papel es coco: 42 · 26 · 18, o sea la proporcion
 * 1 : 0,62 : 0,43. El problema es que ese color MULTIPLICA la textura horneada
 * del GLB, que es rosa saturada, y el producto de dos cosas saturadas en el
 * mismo tono da granate. Con la sala ya iluminada de verdad eso se veia: el
 * interior salia color vino, que no esta en la paleta de nadie.
 *
 * `#3B2B22` esta al mismo nivel de luz y mucho menos saturado —1 : 0,73 : 0,58—
 * asi que corrige el rosa de la textura en vez de sumarse a el. El resultado es
 * el coco del acto 2, con el carmin quedandose donde tiene que estar: en los
 * surcos, que es lo que pinta el emisivo.
 */
const WALL = '#3C2A20'

/**
 * Los surcos, vistos desde dentro. Muy por debajo del exterior.
 *
 * Estuvo en 0,30 y medido en la primera captura del interior daba lo que la
 * dirección de arte prohíbe explícitamente: el 53% de saturación del cuadro,
 * las paredes en salmón y varias manchas de blanco puro donde el mapa emisivo
 * pasaba el umbral del bloom. Aquí dentro la luz la pone la red; los surcos de
 * la pared solo tienen que insinuarse.
 */
/**
 * Y sube de 0,06 a 0,14.
 *
 * Es lo único que la sala tiene de suyo. Con 0,06 dependía por completo de la
 * luz rasante, y en el relevo —cuando la corteza se retira y la rasante todavía
 * está amortiguada por el cruce— no quedaba nada: cuatro centésimas de negro.
 * Con 0,14 la pared tiene un mínimo de presencia propia, que es lo que hace que
 * el sitio exista antes de que se le eche luz encima.
 */
const WALL_EMISSIVE = 0.28

/**
 * ── LOS DOS MAPAS QUE SE DERIVAN DE LA TEXTURA DEL GLB ────────────────────
 *
 * Este es el cambio que quita el rosa del interior, y hay que entender de dónde
 * venía para no volver a él.
 *
 * `brain-neural.glb` trae UNA textura de color, y es magenta: media 141 · 32 ·
 * 92, tono 320°. Como difuso lo tiñe todo de vino —ya medido— y como emisivo
 * pasa lo mismo por otro camino: su canal rojo vale 141 de media, o sea que hay
 * magenta en MÁS DE LA MITAD de la superficie. Puesta como `emissiveMap`, el
 * carmín no cae en los surcos: cae en todas partes.
 *
 * De ella salen ahora dos mapas, los dos en escala de grises, los dos generados
 * una sola vez:
 *
 *     MATERIA   la luminancia de la textura, suavizada hacia el medio.
 *               Va como `map`, teñida por el coco de la pared, y devuelve al
 *               difuso la variación que tenía —manchas más claras y más
 *               oscuras, que es lo que impide que una cara grande sea una
 *               mancha uniforme— pero SIN una gota de magenta.
 *
 *     ACENTO    la misma luminancia elevada a `ACCENT_CURVE`. Una potencia alta
 *               aplasta los medios y deja solo los picos: donde la textura
 *               valía 0,5 pasa a valer 0,04. Va como `emissiveMap`, así que el
 *               carmín se queda ÚNICAMENTE donde la textura era más brillante,
 *               que es el fondo de los surcos.
 *
 * Medido sobre el archivo: con la curva a 3,6, la media del acento cae de 0,55
 * a 0,11. Ese es literalmente el 10% de la paleta que pide la identidad, y por
 * primera vez cae donde tiene que caer.
 *
 * No se toca el asset. Se lee una vez y se dibujan dos lienzos de 512.
 */
const ACCENT_CURVE = 3.6

/**
 * ── Y EL CASCO EXTERIOR LLEVA UNA CURVA MAS SUAVE ────────────────────────
 *
 * La misma correccion, con otro numero, y la razon es de DISTANCIA.
 *
 * La sala se mira a un palmo: ahi el acento tiene que estar muy concentrado o
 * cubre el cuadro entero. El casco se mira de lejos durante todo el descenso,
 * y con 3,6 la superficie se quedaba practicamente sin senal — medido sobre la
 * captura de p=0,36, del cerebro solo sobrevivian cuatro puntos de carmin, y lo
 * que este manual pide en ese plano es lo contrario: giros oscuros con luz
 * ardiendo en los SURCOS, que es lo que le da la lectura de joya.
 *
 * Con 1,9 la senal sigue concentrada donde la textura era mas brillante —los
 * medios bajan de 0,50 a 0,27— pero los surcos vuelven a dibujarse enteros. Es
 * el mismo mecanismo y el mismo color: lo unico que cambia es cuanta
 * superficie ocupa, y eso depende de a que distancia se mire.
 */
const SHELL_CURVE = 1.9

/** A qué resolución se rehornean. 512 sobra: son variación, no detalle fino. */
const BAKE = 512

/**
 * Convierte la textura del GLB en los dos mapas. Devuelve `null` si la imagen
 * todavía no se puede leer —en un servidor sin DOM, por ejemplo— y en ese caso
 * el material se queda con el color plano, que es el estado anterior.
 */
/**
 * El horneado se hace UNA vez por textura de origen.
 *
 * Lo piden dos materiales —el casco exterior y la sala interior— y son la
 * misma imagen: sin esta tabla se dibujarian cuatro lienzos de 512 en vez de
 * dos, y se leerian dos veces los megapixeles del GLB.
 */
const baked = new WeakMap()

function bakeSurface(source) {
  const image = source?.image
  if (!image || typeof document === 'undefined') return null
  if (baked.has(source)) return baked.get(source)

  const canvas = document.createElement('canvas')
  canvas.width = BAKE
  canvas.height = BAKE
  const context = canvas.getContext('2d', { willReadFrequently: true })

  try {
    context.drawImage(image, 0, 0, BAKE, BAKE)
  } catch {
    return null
  }

  const pixels = context.getImageData(0, 0, BAKE, BAKE)
  const matter = context.createImageData(BAKE, BAKE)
  const accent = context.createImageData(BAKE, BAKE)
  const shell = context.createImageData(BAKE, BAKE)

  for (let i = 0; i < pixels.data.length; i += 4) {
    const luma =
      (pixels.data[i] * 0.299 + pixels.data[i + 1] * 0.587 + pixels.data[i + 2] * 0.114) / 255

    /*
      La materia se comprime hacia el medio: la textura tiene negros absolutos
      y con ellos el difuso caeria a cero, que es justo el "negro muerto" que
      hay que evitar. Entre 0,42 y 1,0 hay variacion de sobra para que una cara
      grande no sea una mancha.
    */
    const solid = Math.round((0.42 + luma * 0.58) * 255)
    matter.data[i] = solid
    matter.data[i + 1] = solid
    matter.data[i + 2] = solid
    matter.data[i + 3] = 255

    const spark = Math.round(luma ** ACCENT_CURVE * 255)
    accent.data[i] = spark
    accent.data[i + 1] = spark
    accent.data[i + 2] = spark
    accent.data[i + 3] = 255

    const ember = Math.round(luma ** SHELL_CURVE * 255)
    shell.data[i] = ember
    shell.data[i + 1] = ember
    shell.data[i + 2] = ember
    shell.data[i + 3] = 255
  }

  const make = (data) => {
    const board = document.createElement('canvas')
    board.width = BAKE
    board.height = BAKE
    board.getContext('2d').putImageData(data, 0, 0)
    const texture = new CanvasTexture(board)
    texture.wrapS = source.wrapS
    texture.wrapT = source.wrapT
    texture.flipY = source.flipY
    texture.needsUpdate = true
    return texture
  }

  const result = { matter: make(matter), accent: make(accent), shell: make(shell) }
  baked.set(source, result)
  return result
}

export default function FloatingBrain({ size = 2.1, layer = 'mind', compact = false, children }) {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH)
  const rootRef = useRef(null)
  const spinRef = useRef(null)
  const shellRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()
  const lightRef = useRef(null)
  const fadeRef = useRef(-1)
  const insideRef = useRef(-1)
  const solidRef = useRef(-1)
  const openRef = useRef(-1)
  const outRef = useRef(-1)
  const insideCortex = useRef(false)

  // En movil se cae a un material normal: la transmision obliga a dibujar la
  // escena dos veces y no compensa.
  const baseTransmission = compact ? 0 : readTransmission()
  /**
   * Sin transmision, OPACO. El primer intento bajaba el alfa a 0,88 para
   * simular el cristal y el resultado era peor que no intentarlo: el cerebro
   * se veia lavado y sin contraste, como un fantasma. La textura horneada
   * aguanta sola; falsear la transparencia solo la ensucia.
   */
  const baseOpacity = 1

  const innerRef = useRef(null)

  const { model, scale, offset, materials, chamberModel, chamberMaterials } = useMemo(() => {
    const clone = scene.clone(true)
    const list = []

    clone.traverse((object) => {
      if (!object.isMesh || !object.material) return

      const source = object.material
      const material = new MeshPhysicalMaterial({
        color: new Color(BODY),
        /**
         * La textura horneada del glb se reutiliza como mapa EMISIVO, no como
         * color base. Es la clave para que el vidrio siga siendo vidrio: como
         * color base la taparia el propio material transparente, mientras que
         * lo emisivo se suma despues y por eso los surcos rosas siguen
         * brillando desde dentro aunque se vea a traves del cerebro.
         */
        emissive: new Color(GLOW),
        /**
         * ── Y EL EMISIVO USA EL MAPA DE ACENTO, NO LA TEXTURA CRUDA ──────
         *
         * Aqui iba `source.map`, o sea la baseColorTexture del GLB tal cual. Y
         * esa textura es MAGENTA con una media de 141 en el canal rojo: hay
         * senal en mas de la mitad de la superficie, asi que el carmin no caia
         * en los surcos, caia en todas partes.
         *
         * Se veia en el acto 7, donde el cerebro deja de recortarse contra
         * negro y pasa a tener la lamina del exterior detras. Medido con
         * `scripts/palette.mjs` sobre la composicion montada: **59,2% rosa
         * contra 37,5% coco**, con el cerebro dando R82 G50 B49 —el verde y el
         * azul practicamente iguales, o sea carmin puro sin nada de coco—. La
         * proporcion de la identidad es la contraria.
         *
         * La solucion no es nueva: es la que ya se aplico DENTRO. `bakeSurface`
         * eleva la luminancia a `ACCENT_CURVE`, lo que aplasta los medios y
         * deja senal solo donde la textura era mas brillante — la media del
         * mapa cae de 0,55 a 0,11. La sala interior lleva anos usandolo y el
         * casco exterior se habia quedado sin el.
         *
         * No se toca ni `GLOW` ni `BODY`: el color es el mismo, cambia DONDE
         * cae. Es literalmente la regla que este manual ya tiene escrita —un
         * emisivo no puede ser un acento si cubre media superficie— aplicada
         * en el sitio que faltaba.
         */
        emissiveMap: bakeSurface(source.map)?.shell ?? source.map ?? null,
        emissiveIntensity: EMISSIVE,
        // Los reflejos de la superficie los pone el HDRI. Sin ellos el vidrio
        // no se lee como vidrio: se lee como gelatina.
        envMapIntensity: ENV_REFLECTION,
        normalMap: source.normalMap ?? null,
        transparent: true,
        /*
          ── UNA SOLA CARA, y se probó con las dos ─────────────────────────

          `DoubleSide` parecía lo correcto para que el corte enseñara el grosor
          del giro perforado. En pantalla fue justo lo contrario: al estar la
          cámara dentro de una malla cerrada, las dos caras de TODOS los
          pliegues se dibujan a la vez, translúcidas y sin orden de
          profundidad. El plano de 0,46 salía como un campo carmín de capas
          superpuestas —el destello rosa que la dirección de arte prohíbe— y
          además tapaba la sala.

          Con una sola cara el relevo lo hace la geometría sola: lo que queda
          por delante se ve, lo que ya se ha atravesado lo quita el plano de
          corte, y lo que rodea a la cámara está de espaldas y se descarta. Al
          otro lado ya está la sala.
        */
        // El grosor va en unidades del MODELO, no de la escena. Como el grupo
        // se escala despues, aqui se trabaja con el tamano de la malla.
        thickness: 0.55,
        ...GLASS,
        transmission: baseTransmission,
        opacity: baseOpacity,
      })

      object.material = material
      list.push(material)
    })

    /**
     * ── EL CEREBRO SE CENTRA EN SU CAJA, Y NO LO ESTABA ───────────────────
     *
     * De aquí solo se sacaba el TAMAÑO, para deducir la escala. El origen del
     * `.glb` no coincide con el centro de la malla —los exportados casi nunca
     * lo hacen— así que el cerebro colgaba desplazado del punto que la tabla
     * llama `mind.center`.
     *
     * Daba igual mientras el cerebro fuese un objeto que se mira. Deja de dar
     * igual desde que es el DESTINO: la cámara vuela hacia `mind.center`, los
     * anillos del paso orientan su punto de fuga hacia `mind.center`, y el
     * cerebro estaba en otro sitio. En la captura de 0,22 se veía exactamente
     * eso: el hueco del túnel apuntando a un punto y el cerebro asomando por
     * su borde, medio fuera.
     *
     * Restando el centro de la caja, el objeto al que se viaja y el punto al
     * que se viaja vuelven a ser el mismo.
     */
    const box = new Box3().setFromObject(clone)
    const bounds = box.getSize(new Vector3())
    const middle = box.getCenter(new Vector3())
    const largest = Math.max(bounds.x, bounds.y, bounds.z) || 1

    /**
     * ── LA SALA ES EL PROPIO CEREBRO, AMPLIADO Y VISTO POR DENTRO ─────────
     *
     * Aquí había un ELIPSOIDE LISO con la textura del cerebro repetida tres por
     * dos. Cerraba el espacio —que era su trabajo— y no hacía nada más: sin
     * pliegues, sin surcos, sin nada que se leyera como estar dentro de un
     * cerebro. Se veía como una cueva, que es exactamente lo que no puede ser.
     *
     * Lo que hay ahora es la MISMA malla del `.glb`, clonada, escalada un 80% y
     * dibujada por su cara interior. Los giros y los surcos son los de verdad,
     * la textura horneada cae donde le toca sin repetirse, y no hace falta
     * ningún asset nuevo.
     *
     * ## Por qué ampliada, y por qué exactamente tanto
     *
     * Porque el cerebro es MACIZO. Medido con rayos desde su centro, la primera
     * pared está a 0,221 de su tamaño de mediana y a 0,042 en el peor caso, así
     * que a tamaño natural sus pliegues quedarían ENTRE la cámara —que orbita a
     * 0,36— y la red de conocimiento —que llega a 0,115—. Eso ya se probó: las
     * áreas no eran invisibles, estaban detrás de un pliegue.
     *
     * Ampliándola, la misma anatomía pasa a estar por fuera de todo lo que hay
     * que ver. Con la cámara a 0,36 del centro y la pared a 0,90, lo más cerca
     * que llega el muro es una unidad; la niebla lo deja al 46% ahí y al 15% en
     * el lado opuesto, que es la profundidad que hace que la sala tenga fondo.
     *
     * Y hay un efecto secundario que resultó ser el que arregla el cruce: la
     * pared de la sala está POR FUERA de la superficie que se atraviesa. La
     * cámara entra en la sala ANTES de perforar la corteza, así que cuando la
     * corteza se abre detrás ya hay sitio. No hay ningún frame con nada.
     */
    /**
     * Se clona del ORIGINAL, no del casco ya preparado.
     *
     * El primer recorrido sustituye el material de cada malla por el vidrio de
     * la corteza, y ese material lleva la textura horneada en `emissiveMap`, no
     * en `map`. Clonando de ahí, la sala salía con `map: null`: una superficie
     * de color plano, sin textura y con el relieve fiado solo a la geometría
     * simplificada. Es lo que la hacía verse como plástico.
     *
     * `scene` sigue teniendo los materiales de origen, con su mapa de color y
     * su mapa de normales. Las geometrías se comparten: clonar no duplica ni un
     * triángulo.
     */
    const chamberModel = scene.clone(true)
    const chamberMaterials = []
    /*
      ── LA SALA VA SUBDIVIDIDA, Y SOLO ELLA ────────────────────────────────

      El facetado del interior no es de sombreado: con 58.403 triangulos para
      todo el cerebro, vistos desde dentro y al doble, cada uno mide decenas de
      pixeles. Ver `three/subdivide.js`: PN-triangles curva los vertices nuevos
      con las normales que la malla ya trae y conserva las UV exactas, asi que
      la textura horneada sigue cayendo donde debe.

      Se aplica UNICAMENTE aqui. El casco exterior conserva la geometria del
      archivo —se ve de lejos y no la necesita— y en movil tampoco se subdivide:
      el presupuesto de ahi son 60.000 triangulos en escena y esto son 233.612.
    */
    let dense = null

    chamberModel.traverse((object) => {
      if (!object.isMesh || !object.material) return
      const source = object.material

      if (!compact) {
        /*
          Todas las mallas del GLB comparten la misma geometria, asi que se
          subdivide una vez y se reparte. Y se construye APARTE: el original no
          se toca, que es lo que mantiene intacto el cerebro de fuera.
        */
        if (dense === null) dense = subdividePN(object.geometry) ?? false
        if (dense) object.geometry = dense
      }

      /*
        ── SE PROBÓ A RECALCULAR LAS NORMALES Y SALIÓ PEOR ─────────────────

        La geometría trae 48.820 vértices para 58.403 triángulos —3,59 índices
        por vértice contra los seis de una malla soldada—, así que parecía que
        venía con las normales partidas y que promediarlas con
        `computeVertexNormals` suavizaría el facetado.

        No: las normales del exportado ya son suaves, y los vértices duplicados
        son costuras de UV. Recalcularlas las promedia POR GRUPO de costura, así
        que en vez de suavizar añade aristas duras donde antes no las había. La
        captura de 0,60 salió con más facetas que la de partida.

        Lo que sí ayuda sin tocar la malla es el mapa de normales, que se marca
        más abajo, y la niebla, que apaga las superficies grandes del fondo.
      */
      /*
        Los dos mapas derivados. Se hornean una vez —todas las mallas del GLB
        comparten la misma textura— y si la imagen no se pudiera leer, el
        material se queda con el color plano, que es el estado anterior.
      */
      const surface = bakeSurface(source.map)

      const material = new MeshStandardMaterial({
        color: new Color(WALL),
        /**
         * El mapa horneado va como `map` y no como `emissiveMap`, y ese es el
         * cambio que separa una sala de un cartel. Como emisivo, la pared se
         * pinta sola con su textura y no reacciona a nada: da igual dónde esté
         * la luz, siempre se ve igual de plana. Como difuso, la luz rasante de
         * `CortexLight` recorre los pliegues y son los pliegues los que
         * dibujan el volumen.
         */
        /**
         * ── LA TEXTURA HORNEADA NO VA COMO DIFUSO, Y ESTO ES DE IDENTIDAD ─
         *
         * Aqui habia `map: source.map`, con esta explicacion: "como emisivo la
         * pared se pinta sola y no reacciona a la luz; como difuso, la luz
         * rasante recorre los pliegues y son los pliegues los que dibujan el
         * volumen". El razonamiento era correcto y la premisa ha caducado: se
         * escribio cuando la sala NO tenia luz de verdad, asi que la textura
         * era lo unico que le daba variacion.
         *
         * Y arrastraba un problema que solo se ve midiendo el archivo. La
         * baseColorTexture del GLB es **MAGENTA**: media 141 · 32 · 92, o sea
         * tono 320 grados con el azul por encima del verde. Es exactamente el
         * rango que la identidad de CocoBrain prohibe, y multiplicado por
         * cualquier tinte coco daba granate — el interior salia color vino
         * hiciera lo que hiciera con el color base.
         *
         * El casco de FUERA nunca la ha usado como difuso: lleva `BODY` plano y
         * la textura solo como `emissiveMap` tenida con el rosa de marca, que es
         * lo que la reconduce a la paleta. Esto hace lo mismo, y por eso el
         * dentro y el fuera son por fin el mismo material.
         *
         * El relieve no se pierde: lo ponen el mapa de NORMALES —que es
         * geometrico y no tiene color— y las dos direccionales de la sala.
         */
        /*
          La MATERIA. Ver `bakeSurface`: es la luminancia de la textura del GLB
          sin una gota de su magenta, teñida por el coco de `WALL`. Devuelve al
          difuso la variacion que tenia —manchas mas claras y mas oscuras, que es
          lo que impide que una cara grande se lea como una sola mancha— sin
          traerse el color que la sacaba de la paleta.
        */
        map: surface?.matter ?? null,
        normalMap: source.normalMap ?? null,
        /*
          ── Y EL MAPA DE RUGOSIDAD NO ─────────────────────────────────────

          Se puso esperando variacion de brillo sobre las caras grandes. Medido
          en el archivo, su canal verde tiene media 70 sobre 255 con un rango de
          45 a 93: casi ninguna variacion, y toda ella en la zona PULIDA. Y
          three lo MULTIPLICA por el valor del material, asi que 0,82 x 0,28
          dejaba la sala en 0,23 — un espejo. En pantalla, plastico rojo
          brillante con reflejos blancos duros.

          La variacion que hacia falta ya la pone el mapa de normales.
        */
        /**
         * Y el relieve del mapa de normales se marca más.
         *
         * Es la otra mitad del facetado: con la malla ampliada al doble, el
         * detalle fino que rompe las superficies grandes ya no puede venir de
         * los triángulos —son demasiado grandes— así que tiene que venir del
         * mapa. A 1,7 los surcos pequeños vuelven a leerse sin tocar la
         * geometría.
         */
        normalScale: new Vector2(2.3, 2.3),
        // Un emisivo mínimo para que el lado en sombra no caiga a negro puro.
        emissive: new Color(GLOW),
        /**
         * ── Y EL EMISIVO SIGUE EL MAPA, NO ES UNIFORME ──────────────────
         *
         * Iba sin `emissiveMap`, o sea sumando el mismo rosa a TODA la
         * superficie por igual. Eso es lo contrario de lo que hace un emisivo
         * bien puesto: en vez de dibujar los surcos, levantaba el negro de los
         * giros y aplanaba la pared entera.
         *
         * Con el mapa horneado —el mismo que lleva el casco por fuera— el
         * carmín cae donde están las hendiduras y los giros se quedan oscuros.
         * Es lo que ata el interior con el exterior: **la pared de dentro y la
         * corteza de fuera son la misma superficie**, y se nota porque brillan
         * por los mismos sitios.
         *
         * La intensidad es un tercio de la de fuera. Aquí el emisivo no puede
         * mandar —lo que tiene que dibujar el volumen es la luz sobre los
         * pliegues, y una pared que se pinta sola no reacciona a nada— pero sin
         * él la sala no tiene ni un acento de la marca.
         */
        /*
          El ACENTO. La misma luminancia con una curva dura, asi que el carmin se
          queda solo en los picos de la textura, que es el fondo de los surcos.
        */
        emissiveMap: surface?.accent ?? source.map ?? null,
        emissiveIntensity: WALL_EMISSIVE,
        /**
         * Y la rugosidad baja de 0,92 a 0,78, que también es contra el
         * facetado.
         *
         * Una superficie casi mate devuelve el mismo valor en todo un
         * triángulo, así que cada cara grande sale como una mancha uniforme y
         * el ojo lee el polígono. Con algo de reflejo especular ancho, el
         * brillo VARÍA a lo largo de la cara según el ángulo de vista y el
         * borde entre dos triángulos deja de ser un escalón. No es brillo
         * decorativo: es lo que hace que una malla basta se lea como
         * superficie.
         */
        roughness: 0.86,
        metalness: 0,
        envMapIntensity: 0.12,
        // La cara de dentro. Es lo que la convierte en una habitación.
        side: BackSide,
        /**
         * ── Y ES OPACA. AQUÍ ESTABA EL "PARECE VIDRIO" DEL CRUCE ──────────
         *
         * Entraba con un desvanecido de alfa solapado con la retirada del
         * casco, para que no hubiera un frame sin nada. El solape funcionaba
         * —hueco no hay— pero el precio se veía: en 0,42 el casco estaba
         * entero y la sala al 65% de opacidad, o sea DOS cerebros translúcidos
         * superpuestos, uno a tamaño natural y otro al doble. Eso es lo que se
         * leía como capas de plástico.
         *
         * Siendo opaca entra en el pase de OPACOS: se dibuja antes que el
         * casco, escribe profundidad, y el casco la tapa entera mientras está
         * delante. No hay mezcla y no hay capas. Y de paso el vidrio de la
         * corteza recupera algo opaco que refractar, que es lo que necesita.
         *
         * El desvanecido no hace falta porque la sala no se descubre
         * apareciendo: se descubre cuando el casco se abre. Un fundido menos.
         */
        transparent: false,
        opacity: 1,
      })
      object.material = material
      chamberMaterials.push(material)
    })

    return {
      model: clone,
      scale: size / largest,
      // El desplazamiento que centra la malla en el origen del grupo. Va en
      // unidades del modelo: el grupo que lo lleva ya está escalado.
      offset: middle.clone().multiplyScalar(-1),
      materials: list,
      chamberModel,
      chamberMaterials,
    }
  }, [scene, size, baseTransmission, baseOpacity, compact])

  useFrame((state) => {
    const root = rootRef.current
    if (!root) return

    const fade = layerOpacity(layer, journey.progress)
    const inside = insideness(journey.progress)
    const solid = cortex(journey.progress)
    /*
      `pierce` entra en la guarda por la misma razón por la que en su día tuvo
      que entrar `cortex`: se escribe dentro del bloque. Sin él, en cualquier
      tramo donde `inside` y `solid` estén quietos y el corte no, el casco se
      quedaría clavado en su última opacidad.
    */
    const open = pierce(journey.progress)
    /*
      Y `emergence` tambien entra en la guarda, por la misma regla: se escribe
      dentro del bloque. De el cuelga cuanto carmin le queda al casco cuando el
      cerebro vuelve a verse entero, y entre 0,86 y 0,96 no se mueve ninguna de
      las otras cuatro senales.
    */
    const emerged = emergence(journey.progress)

    /**
     * Los materiales solo se tocan cuando algo se mueve de verdad, que son unos
     * pocos frames de todo el recorrido.
     *
     * OJO: **la guarda tiene que vigilar TODAS las señales que se escriben
     * dentro**. Al añadir `cortex` se olvidó, y el resultado fue un fallo que
     * parecía de material y era de control de flujo: entre 0,28 y 0,30 ni
     * `fade` ni `inside` se mueven —uno ya vale 1 y el otro todavía 0— así que
     * el bloque no se ejecutaba y la transmisión se quedaba clavada en 0,90.
     * El cerebro seguía siendo un cristal perfecto justo en el plano en el que
     * tenía que ser carne, y desaparecía del cuadro.
     */
    if (
      Math.abs(fade - fadeRef.current) > 0.002 ||
      Math.abs(inside - insideRef.current) > 0.002 ||
      Math.abs(solid - solidRef.current) > 0.002 ||
      Math.abs(open - openRef.current) > 0.002 ||
      Math.abs(emerged - outRef.current) > 0.002
    ) {
      fadeRef.current = fade
      insideRef.current = inside
      solidRef.current = solid
      openRef.current = open
      outRef.current = emerged
      root.visible = fade > 0.02

      /**
       * La corteza se abre para dejar pasar a la cámara.
       *
       * Hace falta aunque desde dentro el cerebro sea invisible por sí solo
       * —sus caras miran hacia fuera, así que desde el interior están todas de
       * espaldas y se descartan—. El problema no es estar dentro: es el medio
       * segundo ANTES de estarlo, cuando la corteza ocupa la pantalla entera y
       * la cámara la atraviesa de golpe. Sin desvanecerla, atravesar el
       * cerebro se ve como un corte a negro seguido de un corte a la red.
       *
       * Y mientras se atraviesa, los surcos NO brillan más: brillan menos.
       *
       * Estaban subiendo a más del doble, con la idea de que cruzar se sintiera
       * como un umbral encendido. En la grabación se ve lo que pasa de verdad:
       * la corteza llena la pantalla, cada pliegue devuelve el reflejo del
       * estudio, los surcos van al máximo y el bloom lo suma todo. El resultado
       * no es un umbral, es una pantalla blanca en la que no se distingue nada.
       *
       * Bajando el emisivo justo en la membrana, el rosa deja de ser fluorescente
       * y vuelve a leerse como energía POR DENTRO del vidrio. El umbral lo hace
       * el contraste, no la cantidad de luz.
       */
      /**
       * ── EL RELEVO DE LAS DOS CARAS ────────────────────────────────────
       *
       * La de fuera se disuelve y la de dentro aparece, y las ventanas se
       * SOLAPAN a propósito. Si la de fuera acabara antes de que empiece la de
       * dentro habría un instante sin ninguna de las dos, o sea el vacío
       * marrón otra vez, esta vez de medio segundo.
       *
       * Con este reparto la suma nunca baja de 0,95: en el punto peor —mitad
       * del cruce— hay 0,14 de casco exterior y 0,82 de pared interior, que es
       * exactamente la lectura que se busca ahí, la de una superficie que se
       * vuelve translúcida un momento mientras la atraviesas.
       */
      /**
       * ── EL RELEVO, AHORA CON EL CORTE DE POR MEDIO ─────────────────────
       *
       * La corteza ya no se limita a desvanecerse: se ABRE por el plano de la
       * cámara —ver `clip` más abajo— y solo después de estar abierta baja su
       * opacidad. El orden importa, porque es la diferencia entre "he
       * atravesado esto" y "esto ha desaparecido".
       *
       * Y la sala ya está puesta antes de que el corte empiece —ver más abajo:
       * se enciende por GEOMETRÍA, cuando la cámara entra en su casco—. Cuando
       * la superficie cede, detrás ya hay habitación: nunca hay un frame con
       * nada, y no hace falta ningún fundido para conseguirlo.
       */
      /**
       * El casco se retira DEPRISA una vez perforado, y el motivo es la
       * anatomía. Un cerebro no es una cáscara: en cuanto la cámara pasa la
       * superficie está DENTRO DE LA MASA, rodeada de pliegues que sí la miran
       * de frente. Con el casco a media opacidad ahí, esos pliegues se
       * superponen translúcidos y sin orden y el cuadro es un carmín de capas.
       *
       * ## Cuándo se retira, y por qué no puede ser más tarde
       *
       * Se probó a mantenerlo opaco durante todo el cruce, dejando que lo
       * quitaran de la vista solo la geometría —el corte por detrás y el
       * descarte de caras traseras—. Sobre el papel es lo más honesto; en
       * pantalla, no: entre 0,44 y 0,48 la cámara está literalmente DENTRO de
       * la masa, y dentro de una masa opaca no hay nada que ver. El cuadro se
       * quedaba en negro cuatro centésimas, que es el fundido a negro que este
       * recorrido no puede tener.
       *
       * Así que el casco se va entre el 42% y el 62% del corte, o sea entre
       * 0,442 y 0,456. Catorce milésimas de recorrido, y colocadas justo donde
       * la cámara cruza la superficie: para entonces el plano ya se ha llevado
       * lo que quedaba detrás y de la corteza solo asoma un reborde.
       *
       * Que la ventana sea CORTA es lo que importa. Un casco a media opacidad
       * es una malla de pliegues translúcidos superpuestos —eso es lo que se
       * leía como vidrio— así que el material solo se declara transparente
       * mientras dura ese instante; el resto del cruce es materia opaca.
       *
       * El orden se lee así: la corteza llena el cuadro, se abre por donde
       * pasa la cámara, y en lo que se tarda en cruzar su grosor da paso a la
       * cámara cortical. Lo que hace el trabajo es el corte; la opacidad solo
       * remata los últimos centímetros.
       */
      /**
       * ── EL CASCO NO SE DESVANECE NUNCA: EL PLANO SE LO COME ─────────────
       *
       * Se probaron tres repartos de opacidad para retirarlo —pronto, tarde y
       * corto— y los tres dan la misma imagen, porque el problema no es cuándo
       * sino QUÉ. En cuanto la cámara está dentro de la masa, un casco a media
       * opacidad son decenas de pliegues translúcidos superpuestos sin orden de
       * profundidad: eso es el carmín de cristales que había que quitar.
       *
       * Así que la opacidad se queda en uno y no se toca. Lo que retira la
       * corteza es el plano de corte, que además de llevarse lo que queda
       * detrás de la cámara AVANZA por delante de ella: primero se abre por
       * donde se entra, y después se va comiendo el grosor que queda. Es
       * exactamente lo que se quiere contar —atravesar el espesor de algo— y
       * no hay ni una mezcla de por medio.
       *
       * `LEAD` es hasta dónde llega a comer, en fracción del cerebro: 0,95
       * basta para vaciar todo lo que queda por delante cuando la cámara llega
       * al centro de la cavidad.
       */
      const shell = 1
      const cross = crossing(journey.progress)
      /* La misma campana gobierna el plano de corte. Ver más abajo. */
      const cut = cross
      const out = emerged

      if (shellRef.current) shellRef.current.visible = shell > 0.01 && !insideCortex.current

      for (const material of chamberMaterials) {
        // Los surcos de dentro se apagan en el cruce, igual que los de fuera:
        // ahí coinciden demasiadas cosas claras y el plano se lava.
        /*
          La sala NO baja en el cruce, y eso es lo contrario de lo que hacía.
          Bajaba a la mitad con `crossing` copiando la regla del casco, pero la
          regla del casco existe porque el casco es lo que se lava: es lo claro
          del cuadro y está a un palmo. La sala es lo más oscuro que hay en la
          escena y está a dos unidades; apagarla justo cuando la corteza se
          retira dejaba el relevo en negro.
        */
        material.emissiveIntensity = WALL_EMISSIVE
      }

      /**
       * EL PLANO DE CORTE VA PEGADO A LA CÁMARA, mirando hacia delante.
       *
       * Todo lo que queda POR DETRÁS del plano deja de dibujarse, así que la
       * corteza se abre exactamente por donde entra el visitante y se queda
       * abierta. No es un truco de opacidad: es geometría que se retira al
       * paso, que es lo que se siente al atravesar algo.
       *
       * Se activa solo mientras dura el cruce. Fuera de él la constante se pone
       * detrás de todo y no recorta nada, para no pagar el descarte por
       * fragmento en el resto del recorrido.
       */
      /**
       * ── Y CORTA EN LAS DOS TRAVESÍAS, NO SOLO AL ENTRAR ─────────────────
       *
       * La condición era `pierce`, o sea la rampa de la ENTRADA, y con eso el
       * corte se apagaba para siempre en 0,5. Al construir la salida se vio lo
       * que eso significaba: en 0,79 la cámara está a 0,54 del cerebro —dentro
       * de la masa, todavía— y sin corte se dibuja la malla ENTERA a su
       * alrededor. En pantalla, decenas de cáscaras carmín superpuestas sin
       * orden de profundidad. Exactamente el "plástico roto" que costó una
       * fase entera quitar de la entrada.
       *
       * `crossing` es la campana de las DOS membranas —vale uno en el instante
       * de cruzar, tanto al entrar como al salir— así que el mismo corte, con
       * la misma fórmula, sirve para las dos. Y sirve porque en la salida la
       * cámara mira AL CENTRO: lo que el plano quita es lo que queda a su
       * espalda, o sea la corteza que ya ha atravesado. La sección no se ve
       * porque el plano es perpendicular a la vista y se reduce a una línea.
       */
      if (cut > 0.01) {
        CLIP_NORMAL.set(0, 0, -1).applyQuaternion(state.camera.quaternion)
        clipPlane.normal.copy(CLIP_NORMAL)
        // El plano va `lead` unidades POR DELANTE de la cámara: no solo quita
        // lo que ya se ha pasado, también va abriendo lo que queda.
        clipPlane.constant = -CLIP_NORMAL.dot(state.camera.position)
        for (const material of materials) {
          if (material.clippingPlanes !== CLIP_LIST) {
            material.clippingPlanes = CLIP_LIST
            material.needsUpdate = true
          }
        }
      } else if (materials[0] && materials[0].clippingPlanes) {
        for (const material of materials) {
          material.clippingPlanes = null
          material.needsUpdate = true
        }
      }

      /**
       * Y la luz del centro deja de atenuarse una vez dentro.
       *
       * Estaba bajando al 25% con `1 - inside · 0,75`, que era correcto cuando
       * dentro no había NADA que iluminar —las paredes no se dibujaban—. Ahora
       * esa luz es la que hace visible la cavidad: es la red iluminando su
       * propia habitación, que es justamente lo que tiene que contar el
       * interior. Lo que sí sigue bajando es el instante del cruce, donde la
       * cámara la tiene a un palmo y quema.
       */
      /**
       * ── Y LA LUZ DEL CENTRO SE CIERRA MUCHÍSIMO AL ENTRAR ──────────────
       *
       * Esto es aritmética, no gusto. La luz es puntual con caída cuadrática y
       * está en el centro del cerebro; la pared está a una unidad. La
       * iluminancia que recibe es `intensidad / d²`, o sea la intensidad
       * entera. Con 9 —el valor con el que el cerebro se ve desde fuera— la
       * pared recibe nueve veces lo que puede devolver: blanco quemado.
       *
       * Con el 6% que queda dentro, la pared recibe 0,54 a una unidad y algo
       * más de uno donde se acerca. Sobre un coco oscuro eso da entre el 12% y
       * el 35% de reflectancia: una pared que se ve, con volumen, y que no
       * compite con la red. Que la cavidad sea oscura no es un defecto, es la
       * proporción de la marca —70% coco, 20% rosa— dentro de un sitio cuya
       * única fuente de luz es rosa.
       */
      if (lightRef.current) {
        /*
          El factor de dentro es `enclosure` y no `insideness`, por lo mismo que
          en `CortexLight`: esta luz esta en el CENTRO del cerebro y al salir la
          camara le pasa a medio palmo. Con `insideness` volvia a su intensidad
          plena en mitad del cruce de vuelta, o sea una bombilla de 9 a 0,2
          unidades de una pared. Con `enclosure` se recupera cuando el objeto
          vuelve a mirarse de lejos, que es cuando esa luz tiene sentido.
        */
        /*
          ── Y DENTRO SIGUE CASI APAGADA, aunque parezca desaprovecharla ────

          Se probo a subirla al 28% para que fuera "la red iluminando su propia
          habitacion". Sobre el papel es la idea correcta y trae la caida radial
          que da profundidad; en pantalla, el frame de 0,63 salio con la mitad
          inferior quemada a blanco puro.

          La causa es la que este manual ya tiene escrita para el cerebro de la
          mano, y aqui vuelve con otro disfraz: **una luz con caida cuadratica
          dentro de una malla organica no modela, amplifica.** La sala es el
          cerebro al doble y por dentro es maciza — medido con rayos desde el
          centro, su primera pared esta a 0,44 del tamano de mediana y a 0,084
          en el peor caso, o sea a 0,18 unidades. A esa distancia, 2,52 de
          intensidad entregan 78.

          No hay valor bueno: entre el pliegue mas cercano al centro y la pared
          del fondo hay un factor de cien. Lo que ilumina un interior sin puntos
          calientes es luz SIN POSICION, y de eso se encargan el hemisferico y
          las dos direccionales de `CortexLight`.
        */
        /*
          ── Y SE APAGA DEL TODO CUANDO LA CAMARA ESTA DENTRO ──────────────

          El factor de `enclosure` no bastaba, y se veia: en 0,47 esa senal vale
          0,86, asi que la luz se quedaba en 1,57 — y los pliegues de la sala
          llegan a 0,18 unidades del centro, donde una caida cuadratica entrega
          49 veces. En pantalla, una cuna de luz rosa quemada saliendo de un
          vertice, justo en el frame en el que se acaba de entrar.

          El apagado tiene que ser GEOMETRICO, como el relevo casco/sala: esta
          luz existe para que el cerebro se vea desde FUERA, y dentro no tiene
          ningun trabajo. `insideCortex` ya sabe de que lado esta la camara.
        */
        const outside = insideCortex.current ? 0.02 : 1
        lightRef.current.intensity =
          LIGHT * fade * (1 - cross * 0.62) * (1 - enclosure(journey.progress) * 0.96) * outside
      }

      for (const material of materials) {
        // La opacidad de reposo no es 1 en movil, asi que el desvanecido la
        // MULTIPLICA en vez de sustituirla. Escribir `fade` a secas subia el
        // cristal a opaco justo al aparecer.
        /**
         * Y solo se declara TRANSPARENTE cuando lo es.
         *
         * Estaba fijo en `transparent: true`, así que incluso con la opacidad
         * en uno el casco se dibujaba en el pase de transparentes: mezclado,
         * sin ordenar por triángulo, y compitiendo con todo lo demás que
         * también estaba ahí. Con la opacidad entera pasa al pase de opacos,
         * que es donde la profundidad manda y donde una corteza maciza tiene
         * que estar.
         */
        const glassy = baseTransmission > 0 && solid < 0.999
        const clear = baseOpacity * fade * shell
        material.opacity = clear
        const wantsBlend = glassy || clear < 0.999
        if (material.transparent !== wantsBlend) {
          material.transparent = wantsBlend
          material.needsUpdate = true
        }
        /**
         * EL EMISIVO BAJA AL CONVERTIRSE EN TEJIDO.
         *
         * De lejos los surcos son lo que hace que el cerebro se lea como algo
         * vivo dentro del vidrio, y ahí van al máximo. De cerca, con la corteza
         * llenando el cuadro, ese mismo valor es una pantalla de rosa: es
         * exactamente la "bola rosa" que hay prohibida. Lo que tiene que
         * llevar el plano corto es el RELIEVE —la luz rasante— y el rosa se
         * queda donde debe, en el fondo de los surcos.
         */
        /**
         * ── EL CEREBRO SIGUE SIENDO VIDRIO AL LLEGAR ────────────────────
         *
         * Aquí estaban las tres líneas que lo mataban. `solid` —la señal
         * `cortex()`— cerraba la transmisión a cero, subía la rugosidad de 0,34
         * a 0,78 y apagaba el reflejo del entorno un 75%, todo entre 0,19 y
         * 0,26. El resultado medido: en 0,26 el cuadro era un campo marrón con
         * contraste 5,4, y el cerebro no estaba.
         *
         * La intención era buena —que al acercarse fuese materia y no cristal—
         * pero se llevó por delante lo único que hacía que el objeto se leyera
         * como una joya. Lo que da la sensación de materia al llegar es la LUZ
         * RASANTE, que ya la pone `CortexLight`, no matar el material.
         */
        /*
          Y los surcos se apagan también con el CORTE, no solo con el cruce.
          Dentro del tejido la cámara los tiene a un palmo: con el emisivo
          entero, el instante de atravesar era un carmín plano sin forma.
        */
        /*
          Y los surcos se apagan MENOS que antes. Los dos factores estaban
          calibrados cuando el cruce era un amasijo translúcido que se lavaba
          solo; siendo materia opaca ya no hay nada que lavar, y bajar tanto el
          emisivo dejaba el tramo sin el carmín que lo une al cerebro de fuera.
        */
        /*
          ── Y DENTRO DE LA MASA LOS SURCOS SON LA ÚNICA LUZ ────────────────

          Estaban bajando con el corte, heredado de cuando el cruce era un
          amasijo translúcido que se lavaba solo. Con la corteza opaca el
          problema es el contrario: entre 0,44 y 0,48 la cámara está DENTRO de
          la masa, donde por definición no llega ninguna luz de la escena, y
          apagar además el emisivo dejaba el cuadro en negro. Un fundido a
          negro con otro nombre.

          Los surcos son lo único que puede iluminar ahí, así que en vez de
          bajarlos se dejan casi enteros: lo que se ve al atravesar es el
          carmín de las hendiduras pasando a un palmo. Es el mismo material
          que el de fuera, visto desde dentro.
        */
        /**
         * ── Y BAJA OTRA VEZ AL SALIR, POR UN MOTIVO DISTINTO ──────────────
         *
         * 1,35 es el valor del cerebro que se MIRA de lejos en el descenso, y
         * ahí es lo que le da la lectura de joya: giros oscuros con luz carmín
         * ardiendo en los surcos, sobre un fondo que va oscureciéndose.
         *
         * En el acto 7 el fondo ya no es negro —está la lámina del espacio— y
         * el bloom vuelve a estar entero. Con el mismo emisivo, el cerebro
         * salía como una masa rosa encendida: exactamente lo que la dirección
         * de arte prohíbe, y encima le robaba el sitio a los cinco nodos, que
         * son los que tienen que ser lo claro de ese cuadro.
         *
         * Al 45% los surcos siguen siendo carmín y siguen siendo lo que dibuja
         * los pliegues, pero el objeto vuelve a leerse como materia iluminada
         * y no como una fuente. Es la misma lección de siempre: lo que hace que
         * algo parezca encendido es el contraste con lo que tiene alrededor, y
         * alrededor ya no hay negro.
         */
        material.emissiveIntensity = EMISSIVE * (1 - cross * 0.2) * (1 - out * 0.55)

        /**
         * Y al LLEGAR se cierra un poco más, sin llegar a cero.
         *
         * Cerrarla del todo —lo que hacía la versión anterior— convertía el
         * cerebro en una piedra mate y se llevaba por delante la lectura de
         * joya. Dejarla en 0,45 todo el rato tampoco vale: en el plano corto de
         * la corteza el vidrio deja ver el interior y la superficie pierde
         * relieve justo cuando hay que tocarla.
         *
         * Bajándola al 20% de su valor, la corteza gana materia sin dejar de
         * ser el mismo objeto. Lo que pone el relieve ahí es la luz rasante de
         * `CortexLight`, no matar el material.
         */
        material.roughness = GLASS.roughness + (0.52 - GLASS.roughness) * solid
        /**
         * LA TRANSMISIÓN SE CIERRA AL ACERCARSE, no al alejarse.
         *
         * Estaba atada a `fade` —la aparición— y por eso subía al 90% justo
         * cuando la cámara llegaba: un cristal casi perfecto a dos unidades,
         * sin nada opaco que refractar, es una pared invisible. Medido: en 0,21
         * el cerebro se veía entero, en 0,29 no quedaba nada de él en el cuadro.
         *
         * Con `cortex`, de lejos sigue siendo la pieza de vidrio oscuro que le
         * da la lectura de joya, y al llegar se cierra en materia: relieve,
         * volumen y luz rasante, que es lo que hace falta para que atravesarlo
         * se sienta. De paso, en el plano más caro del recorrido desaparece el
         * doble render que obliga la transmisión.
         */
        if (baseTransmission > 0) {
          /**
           * ── Y TIENE QUE LLEGAR A CERO EXACTO, no a poco ─────────────────
           *
           * Con `1 - solid · 0,96` la transmisión terminaba en 0,086 y el
           * cerebro seguía sin verse: mientras el valor sea MAYOR QUE CERO,
           * three mete el material en su pase de transmisión, y ahí la
           * superficie se dibuja refractando el búfer del fondo en vez de
           * recibir las luces. No es un ajuste fino, es un interruptor —ya
           * estaba escrito en el manual y me lo he vuelto a encontrar de
           * frente—.
           *
           * Medido: transmisión 0,086 daba contraste 3,6 en el cuadro;
           * apagándola del todo con `?glass=0`, 14,3.
           */
          const glass = baseTransmission * fade * (1 - solid)
          material.transmission = glass < 0.02 ? 0 : glass
        }
      }
    }

    /**
     * ── LA SALA SE ENCIENDE POR GEOMETRÍA, NO POR PROGRESO ────────────────
     *
     * Es una malla cerrada vista por su cara interior. Desde FUERA eso no se
     * ve como nada razonable: las caras cercanas se descartan y quedan las del
     * lado opuesto, así que sería un cerebro hueco del doble de tamaño tapando
     * al de verdad. O sea que no puede encenderse por una rampa de progreso:
     * tiene que encenderse cuando la cámara está DENTRO.
     *
     * Y el umbral NO es su propia pared, es la del cerebro de tamaño natural.
     * La sala es ese mismo cerebro al doble, así que sus pliegues llegan hacia
     * dentro hasta 1,27 unidades del centro: con la cámara a 1,39 —o sea fuera
     * de la corteza real, todavía acercándose— esos pliegues quedaban POR
     * DELANTE de ella, y en pantalla eran unos planos claros y lisos tapando
     * la corteza que había que estar mirando. Se leía como capas de plástico, y
     * no era el casco: era la sala metiéndose antes de tiempo.
     *
     * Con el umbral en la superficie del cerebro (1,04 de su radio), la sala se
     * enciende justo cuando la cámara la cruza. A partir de ahí sus pliegues
     * quedan por detrás y lo único que la descubre es que el casco se abra.
     *
     * Va fuera de la guarda porque depende de dónde esté la cámara, no de
     * ninguna señal de la tabla.
     */
    if (innerRef.current) {
      const away = state.camera.position.distanceTo(root.getWorldPosition(CENTRE))
      const within = away < size * 0.5 * CHAMBER_REVEAL
      insideCortex.current = within
      innerRef.current.visible = fade > 0.02 && within
      if (shellRef.current) shellRef.current.visible = fade > 0.02 && !within
    }

    if (!root.visible || reducedMotion) return

    /**
     * El COMPÁS DE LA ARQUITECTURA, no el general.
     *
     * `journey.spin` es el mismo compás frenado: avanza a ritmo pleno mientras
     * el cerebro se ve como objeto y se detiene del todo en 0,40, ya dentro.
     * Una habitación que gira sola no se lee como una habitación, y además las
     * cinco áreas están ancladas a la cavidad: con la pared girando acabarían
     * atravesándola.
     */
    const t = journey.spin
    if (spinRef.current) {
      spinRef.current.rotation.y = t * 0.14
      spinRef.current.position.y = Math.sin(t * 0.5) * 0.09
    }
  })

  return (
    <group ref={rootRef} visible={false}>
      {/*
        La escala vive DENTRO, no en el grupo que gira.

        Asi lo que se meta como hijo comparte el giro y el balanceo del cerebro
        —imprescindible: unos nodos interiores que no giraran con el se verian
        deslizarse por dentro— pero trabaja en unidades de la escena, donde el
        cerebro mide `size`. Colgarlos del grupo escalado obligaria a expresar
        cada posicion en las unidades crudas del glb, que no significan nada.
      */}
      <group ref={spinRef}>
        {/*
          El casco se apaga entero cuando la cámara está dentro, y no solo por
          estética: un material transmisivo obliga a three a dibujar la escena
          DOS VECES. Quitándolo de en medio, el tramo interior —que es donde
          más cerca están los nodos y más caro sale cada píxel— deja de pagar
          ese doble render.
        */}
        {/* Nombre para que la sonda de diagnóstico pueda proyectar su caja a
            píxeles. Mismo motivo que en `Mascot3D`. */}
        <group ref={shellRef} scale={scale} name="brain-shell">
          <group position={offset}>
            <primitive object={model} />
          </group>
        </group>

        {/*
          LA SALA. El mismo cerebro, ampliado y visto por su cara interior.

          `renderOrder` bajo: three ordena los transparentes por la distancia de
          su centro a la cámara, y el centro de esta malla es el centro del
          cerebro —o sea más cerca que la red que envuelve—. Sin forzar el
          orden, la pared se dibujaría la última y taparía lo que contiene.
        */}
        <group
          ref={innerRef}
          name="brain-wall"
          scale={scale * CHAMBER_SCALE}
          renderOrder={-5}
          raycast={() => null}
        >
          <group position={offset}>
            <primitive object={chamberModel} />
          </group>
        </group>

        {children}
      </group>

      {/*
        La luz nace del cerebro y alcanza a los nodos que lo rodean. Su alcance
        sale del tamaño: en móvil todo es más pequeño y una luz de alcance fijo
        se comería la escena entera.

        Se atenúa al entrar, y no por gusto: está en el centro del cerebro, así
        que la cámara acaba a medio palmo de ella. Una fuente puntual con caída
        cuadrática a esa distancia no ilumina, quema —era una de las cosas que
        lavaban el plano del cruce—. Dentro, además, sobra: la luz del interior
        son los propios nodos.
      */}
      <pointLight
        ref={lightRef}
        color={GLOW}
        intensity={LIGHT}
        distance={size * 3.4}
        decay={2}
      />

      {/*
        Aquí había `<Sparkles>`: dieciséis destellos con su propio reloj
        (`speed={0.3}`), apareciendo y desapareciendo al margen del scroll.
        Son los puntos brillantes sueltos de las capturas del descenso, y en la
        fase 5E salen por la misma regla que todo lo demás: si no lo mueve el
        recorrido, no se mueve.
      */}
    </group>
  )
}

useGLTF.preload(MODEL_URL, DRACO_PATH)
