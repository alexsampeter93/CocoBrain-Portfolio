import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  Object3D,
  Vector3,
} from 'three'
import { journey } from '../journey/clock'
import { insideness, layerOpacity, nodeFocusAt, reveal } from '../journey/stages'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { KIND_COLORS, knowledge } from '../data/knowledge'
import { knowledgeLinks, relatedTo } from '../data/network'
import { buildNetworkLayout } from './networkLayout'
import KnowledgeLabels, { labelPresence } from './KnowledgeLabels'

/**
 * La red de conocimiento que vive DENTRO del cerebro.
 *
 * Este componente **no sabe qué tecnologías hay**. Recibe un grafo y lo dibuja.
 * Nodos, etiquetas, familias y relaciones se cambian en `data/knowledge.js` y
 * `data/network.js` sin tocar una línea de aquí, que era justo el objetivo:
 * poder editar la red sin rehacer la lógica 3D.
 *
 * ## Cómo se ve a través del cristal
 *
 * Se dibuja DESPUÉS del cerebro, en aditivo y sin comprobar profundidad. No es
 * un truco para esquivar una limitación de la transmisión: un punto de luz
 * visto a través de vidrio se percibe como brillo sumado sobre el cristal, no
 * como un objeto tapado. Es la forma correcta de representarlo.
 *
 * ## Y cómo se ve desde dentro
 *
 * Desde que la cámara entra en el cerebro, esto deja de ser un adorno visto a
 * través de una ventana y pasa a ser el sitio donde estás. Eso cambia dos
 * cosas: los nodos suben de presencia, y aparecen las etiquetas —que fuera no
 * se leerían y solo ensuciarían—.
 */

/**
 * ## Por qué el nodo interior ya no es un modelo
 *
 * Era `node-core.glb`, y el modelo lleva un ANILLO alrededor de la esfera. A
 * dos metros de distancia y detrás del cristal no se notaba; desde dentro, con
 * veinte nodos a medio metro, la escena entera se leía como un sistema
 * planetario —esfera, anillo, esfera— en vez de como una red neuronal. Y el
 * anillo no se puede apagar: es geometría de la malla.
 *
 * Una esfera de veinte caras hace exactamente lo que tiene que hacer un nodo:
 * ser un punto con volumen. Cuesta ochenta triángulos por instancia en vez de
 * 2.360, y quita una descarga del arranque.
 *
 * El `.glb` sigue en `public/preview/`. No se borra —es un asset de Alex— pero
 * ahora mismo no lo usa nadie.
 */

/**
 * Detalle de la esfera.
 *
 * Estuvo en uno —un icosaedro subdividido una vez, ochenta caras— con este
 * argumento: "a este tamaño en pantalla, dos no se distingue de uno". Era
 * cierto cuando la cámara pasaba de largo a 0,36 del centro. Con la
 * aproximación de la deriva, los nodos de peso 3 llegan a medir más de setenta
 * píxeles y se les cuentan las caras: un punto de LUZ con silueta poligonal
 * deja de leerse como luz.
 *
 * Dos son 320 caras. Con dieciocho nodos son 5.760 triángulos contra los
 * 233.612 de la sala interior: por debajo del ruido del presupuesto, y a
 * cambio la silueta deja de contarse.
 */
const NODE_DETAIL = 2

/**
 * ── EL CREMA SALÍA BLANCO, Y NO ERA UN PROBLEMA DE COLOR SINO DE LUMINANCIA ─
 *
 * Los nodos de la red se dibujan en ADITIVO: su color se SUMA a lo que hay
 * detrás, en vez de sustituirlo. Y sumar es una operación que no respeta el
 * tono — lo que decide si un punto sale con su color o sale blanco es cuánta
 * luz aporta, no de qué color es esa luz.
 *
 * Medido sobre `KIND_COLORS`, la luminancia de cada familia:
 *
 *     language · format    #F2E2D0    0,895   ← el crema
 *     framework            #F2A2B0    0,706
 *     tooling              #8FA8D0    0,649
 *     graphics             #E98FA0    0,641
 *     animation · runtime  #D69A6E    0,641
 *
 * El crema aporta un 40% más de luz que el resto. Sobre la pared iluminada del
 * interior eso basta para cruzar el umbral de floración del bloom, y a partir
 * de ahí el nodo es blanco: en la captura de la aproximación, glTF, Git y
 * JavaScript salían como tres discos sin familia, y el de JavaScript llegaba a
 * tapar la etiqueta de React Three Fiber.
 *
 * ## Por qué no se cambia el color
 *
 * Porque el color es identidad: el crema es "la base sobre la que se construye
 * todo" y distingue un lenguaje de una herramienta. Oscurecerlo en
 * `knowledge.js` cambiaría también las etiquetas y la lista del editorial, que
 * no tienen ningún problema — ahí el color se pinta, no se suma.
 *
 * Lo que se corrige es la CONTRIBUCIÓN, y solo en la escena. Cada familia se
 * escala para aportar la misma luz que la referencia, así que el crema sigue
 * siendo crema —conserva su tono exacto— y deja de ser el más brillante. Es
 * exactamente lo que hace un colorista: igualar el valor sin tocar el matiz.
 *
 * ## Y el valor está MEDIDO, no elegido
 *
 * La primera versión usó la mediana de las familias —0,66— con el argumento de
 * que era el nivel al que ya estaban calibrados los colores que nunca queman.
 * El argumento era razonable y la medición lo corrigió: contando los píxeles
 * casi-blancos del cuadro (los tres canales por encima de 200 y menos de 40 de
 * separación entre el mayor y el menor), la aproximación daba
 *
 *     sin corregir   0,541%
 *     0,66           0,541%   ← no cambia nada
 *     0,55           0,156%   ← el codo
 *     0,46           0,146%
 *
 * A 0,66 la corrección no llegaba al umbral de floración del bloom, así que el
 * nodo seguía blanco con un difuso más oscuro. A 0,55 los tres cremas vuelven
 * a tener color y por debajo solo se pierde brillo sin ganar nada: la curva ya
 * está plana.
 */
const REFERENCE = 0.55

/** Luminancia percibida de un color, en el espacio en el que se pinta. */
function luminance(color) {
  return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b
}

/**
 * El color de una familia, igualado en luz. El tono no se toca.
 *
 * Se limita por arriba a 1 para que ninguna familia se AMPLIFIQUE: la
 * corrección existe para que nada queme, no para subir lo que ya funciona.
 */
function balanced(hex) {
  const color = new Color(hex)
  const value = luminance(color)
  if (value <= 0) return color

  return color.multiplyScalar(Math.min(1, REFERENCE / value))
}

const LINE = '#B85C76'
const LINE_ACTIVE = '#F08FA5'

/**
 * En cuántos trozos se parte cada conexión.
 *
 * No es teselado por gusto: es lo que permite darle un degradado. Una conexión
 * de dos vértices solo puede ser una línea de brillo constante, y eso se lee
 * como un cable. Partiéndola, el color puede subir en los extremos y bajar en
 * el medio, que es como se ve una sinapsis: la energía está en los nodos y el
 * trayecto es lo que los une, no lo que hay que mirar.
 *
 * Se calcula una vez al construir la red. Por frame no cuesta nada.
 */
const LINK_SEGMENTS = 6
/** Cuánto se apaga el centro de la conexión respecto a sus extremos. */
const LINK_DIP = 0.45

/**
 * Tamaño del nodo como fracción del cerebro, por peso.
 *
 * Un porcentaje del modelo no dice nada por sí solo: lo que decide si algo se
 * ve es cuántos píxeles ocupa, y eso depende de dónde para la cámara.
 *
 * Estaban al doble, calibrados para la ÚNICA distancia que existía entonces:
 * mirando el cerebro desde fuera, donde eran puntos de luz de sesenta píxeles.
 * Desde que la cámara entra hay una segunda distancia, veinte veces más corta.
 *
 * Y ahora vuelven a bajar, esta vez a la mitad, porque el modelo con anillo
 * normalizaba su tamaño INCLUYENDO el anillo: la bola de dentro medía la mitad
 * de este número. Al pasar a una esfera pelada, mantener el valor habría doblado
 * el tamaño aparente de la red de golpe.
 */
/*
  ── Y SUBEN UN 40%, PORQUE AHORA COMPITEN CON MATERIA ───────────────────

  Estos valores se calibraron cuando la sala era un elipsoide liso: sobre un
  campo uniforme, un punto de luz de pocos pixeles se lee perfectamente. Con la
  pared llena de pliegues, volumen y gradiente, el mismo punto se pierde — la
  red pasaba a ser un detalle sobre la textura en vez de lo que hay dentro del
  cerebro.

  Con 0,017 / 0,024 / 0,032 el nodo mas pequeno vuelve a tener cuerpo sin
  convertirse en un objeto: a la distancia de la deriva sigue midiendo menos de
  dos grados. La jerarquia entre pesos se conserva entera.
*/
const SIZE_BY_WEIGHT = { 1: 0.015, 2: 0.021, 3: 0.028 }

/**
 * Zona sensible del nodo, en veces su tamaño. Los nodos interiores son puntos
 * de luz de pocos píxeles: sin una esfera invisible mucho mayor alrededor no
 * hay forma humana de señalarlos.
 */
const HIT_FACTOR = 2.6

/** Por debajo de esto no se atiende al puntero: se está mirando desde fuera. */
const HOVER_GATE = 0.35

const DUMMY = new Object3D()
const INVERSE = new Matrix4()
const LOCAL_CAMERA = new Vector3()

/**
 * Un nodo que la cámara se está tragando se apaga en vez de llenar la pantalla.
 *
 * Atravesar la nube significa pasar a centímetros de algunos nodos, y un punto
 * emisivo aditivo a esa distancia es un fogonazo blanco que tapa la escena
 * entera. Apagándolo, atravesar la red se lee como profundidad; sin apagarlo,
 * se lee como un fallo.
 *
 * ## Y la referencia es la NUBE, no el nodo
 *
 * Estaba en múltiplos del tamaño del propio nodo —`scale · 0,8` a `scale · 2,6`—
 * y eso lo dejaba desactivado en la práctica: un nodo mide unas dos centésimas
 * de unidad, así que solo se apagaba a partir de estar a cuatro centésimas de
 * la cámara. Con el recorrido viejo daba igual porque la cámara nunca se
 * acercaba tanto; con el recorrido por dentro de la cavidad, la cámara pasa a
 * una y dos décimas de algunos nodos y esos salían como discos enormes al
 * borde del cuadro.
 *
 * El umbral tiene que estar en la escala de la NUBE: un nodo se apaga cuando
 * está más cerca que media nube, que es cuando ha dejado de ser parte de la
 * figura y ha pasado a ser un obstáculo delante del objetivo.
 */
function nearFade(distance, reach) {
  const t = (distance - reach * 0.5) / (reach * 0.6)
  if (t <= 0) return 0
  if (t >= 1) return 1
  return t * t * (3 - 2 * t)
}

export default function BrainCore({
  size,
  sections = [],
  activeSection = null,
  compact = false,
  spread = 1,
}) {
  /**
   * Qué área está enfocada AHORA, siguiendo al scroll.
   *
   * No basta con el nodo pulsado: durante el recorrido la cámara va llegando a
   * cada área sin que nadie haga clic, y la red de dentro tiene que responder
   * igual. Se lee del mismo reloj que el resto, y solo se avisa a React cuando
   * cambia de área —cinco veces en todo el recorrido, no sesenta por segundo—.
   */
  const [touring, setTouring] = useState(null)
  const touringRef = useRef(null)

  useFrame(() => {
    const focus = nodeFocusAt(journey.progress, sections.length)
    const id = focus && focus.focus > 0.25 ? sections[focus.index]?.id ?? null : null

    if (id !== touringRef.current) {
      touringRef.current = id
      setTouring(id)
    }
  })

  const focused = activeSection ?? touring

  return <Network size={size} focused={focused} compact={compact} spread={spread} />
}

function Network({ size, focused, compact, spread }) {
  const reducedMotion = usePrefersReducedMotion()

  const meshRef = useRef(null)
  const hitRef = useRef(null)
  const rootRef = useRef(null)
  const linesRef = useRef(null)
  const activeLinesRef = useRef(null)
  const fadeRef = useRef(-1)
  const linksRef = useRef(-1)
  const insideRef = useRef(0)

  const { nodes, lines } = useMemo(() => {
    const { positions } = buildNetworkLayout(size, spread)

    const nodes = knowledge
      .filter((node) => positions.has(node.id))
      .map((node, index) => ({
        ...node,
        position: positions.get(node.id),
        color: balanced(KIND_COLORS[node.kind] ?? KIND_COLORS.framework),
        phase: index * 1.7,
        /**
         * El nodo se escala con `spread`, igual que su posición.
         *
         * Sin esto, encoger la nube para hacerle sitio a la cámara solo
         * acercaba los nodos entre sí y los dejaba del mismo tamaño: en
         * vertical, donde el factor es más agresivo, la red pasaba a ser seis
         * bolas superpuestas. Escalando las dos cosas, la red es la misma en
         * cualquier pantalla, solo que más pequeña.
         */
        scale: (SIZE_BY_WEIGHT[node.weight] ?? SIZE_BY_WEIGHT[1]) * size * spread,
      }))

    const lines = knowledgeLinks
      .filter(([a, b]) => positions.has(a) && positions.has(b))
      .map(([a, b]) => ({ a, b, from: positions.get(a), to: positions.get(b) }))

    return { nodes, lines }
  }, [size, spread])

  /**
   * El radio de la nube en unidades de mundo. Sale del mismo sitio que las
   * posiciones —el semieje mayor de `RADII` en `networkLayout`— para que
   * cambiar `core` en los tokens mueva las dos cosas a la vez.
   */
  const reach = size * 0.36 * spread

  /**
   * Cuánta etiqueta le toca a cada nodo, de 0 a 1.
   *
   * Es un búfer plano compartido con el componente de etiquetas, y no un
   * estado ni una prop, porque se recalcula entero en cada frame. Se escribe
   * aquí porque aquí ya se recorren los nodos: hacerlo dos veces sería recorrer
   * la lista dos veces para saber lo mismo.
   */
  const presence = useMemo(() => new Float32Array(nodes.length), [nodes.length])

  /**
   * Qué nodo señala el puntero.
   *
   * En una ref y NO en estado de React. El puntero puede cambiar de nodo
   * decenas de veces por segundo, y lo único que depende de ello —el brillo del
   * nodo y su etiqueta— ya se recalcula en el bucle de render. Pasarlo por
   * React sería provocar un árbol de renders para escribir un número que el
   * frame siguiente iba a leer de todas formas.
   */
  const hoveredRef = useRef(-1)

  const hover = useCallback((index) => {
    hoveredRef.current = index
  }, [])

  /**
   * El puente entre las dos capas de la red.
   *
   * Al activar un área del portfolio, se consulta a los datos qué
   * conocimientos la componen y se encienden esos. La escena no sabe qué
   * significa "Proyectos": solo pregunta.
   */
  const highlighted = useMemo(() => new Set(relatedTo(focused)), [focused])

  /** Las dos geometrías de líneas: las apagadas y las de la sección activa. */
  const { dim, hot } = useMemo(() => {
    /**
     * Cada conexión se parte en trozos y se le da un degradado de brillo:
     * encendida junto a los nodos, atenuada en el medio.
     *
     * El color va por vértice y el material es aditivo, así que oscurecer el
     * centro equivale a desvanecerlo sin necesidad de alfa por vértice —que
     * `lineBasicMaterial` no tiene—. Es la diferencia entre una red de cables
     * de brillo plano y una en la que la energía vive en los nodos.
     */
    const build = (list) => {
      const values = []
      const tints = []

      list.forEach(({ from, to }) => {
        for (let s = 0; s < LINK_SEGMENTS; s += 1) {
          for (const step of [s, s + 1]) {
            const t = step / LINK_SEGMENTS
            values.push(
              from.x + (to.x - from.x) * t,
              from.y + (to.y - from.y) * t,
              from.z + (to.z - from.z) * t,
            )
            // Uno en los extremos, `LINK_DIP` en mitad del trayecto.
            const level = 1 - (1 - LINK_DIP) * Math.sin(t * Math.PI)
            tints.push(level, level, level)
          }
        }
      })

      const result = new BufferGeometry()
      result.setAttribute('position', new Float32BufferAttribute(values, 3))
      result.setAttribute('color', new Float32BufferAttribute(tints, 3))
      return result
    }

    // Solo se enciende una arista si SUS DOS extremos pertenecen al área.
    // Encender una con un solo extremo sugiere una relación que no existe.
    const isHot = ({ a, b }) => highlighted.has(a) && highlighted.has(b)

    return { dim: build(lines.filter((l) => !isHot(l))), hot: build(lines.filter(isHot)) }
  }, [lines, highlighted])

  /**
   * Las zonas sensibles se colocan UNA vez: los nodos no se mueven, solo
   * laten. Reescribirlas cada frame sería pagar una matriz por nodo para
   * dejarla igual que estaba.
   */
  useEffect(() => {
    const mesh = hitRef.current
    if (!mesh) return

    nodes.forEach((node, index) => {
      DUMMY.position.copy(node.position)
      DUMMY.scale.setScalar(node.scale * HIT_FACTOR)
      DUMMY.updateMatrix()
      mesh.setMatrixAt(index, DUMMY.matrix)
    })

    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [nodes])

  /**
   * El puntero solo cuenta desde dentro.
   *
   * Sin esta puerta, los nodos interiores interceptarían clics desde la
   * portada: están detrás del cristal, pero un rayo no sabe de cristales. Y de
   * paso se ahorra recorrer veinte esferas en cada movimiento del ratón durante
   * todo el primer acto.
   */
  const gateRaycast = useCallback(function gated(raycaster, intersects) {
    if (insideRef.current < HOVER_GATE) return
    InstancedMesh.prototype.raycast.call(this, raycaster, intersects)
  }, [])

  useFrame((state) => {
    const root = rootRef.current
    if (!root) return

    const fade = layerOpacity('mind', journey.progress)
    const inside = insideness(journey.progress)
    /**
     * ── LA RED SE DESCUBRE POR CAPAS ──────────────────────────────────────
     *
     * Primero la ESTRUCTURA —los enlaces—, después los nodos y al final los
     * nombres. Ver `reveal` en la tabla: es un solo progreso con tres ventanas
     * solapadas, no tres relojes.
     *
     * Antes los tres aparecían con el mismo desvanecido de la capa `mind`, que
     * está a uno desde 0,29: la red ya estaba encendida entera mucho antes de
     * cruzar la corteza y lo único que la ocultaba era que se veía pequeña. Al
     * entrar no aparecía nada, porque ya estaba todo.
     */
    const show = reveal(journey.progress)
    const discovered = show.labels
    insideRef.current = inside

    if (
      Math.abs(fade - fadeRef.current) > 0.002 ||
      Math.abs(show.links - linksRef.current) > 0.002
    ) {
      fadeRef.current = fade
      linksRef.current = show.links
      root.visible = fade > 0.02 && (show.links > 0.004 || show.nodes > 0.004)
      if (linesRef.current) linesRef.current.material.opacity = 0.44 * fade * show.links
      if (activeLinesRef.current) {
        activeLinesRef.current.material.opacity = 0.9 * fade * show.links
      }
    }

    if (!root.visible) return

    const mesh = meshRef.current
    if (!mesh) return

    // El COMPÁS, no el tiempo. Ver `beat` en `journey/clock.js`: un nodo
    // emisivo que crecía un 26% por su cuenta cruzaba el umbral del bloom y
    // parpadeaba con el usuario quieto.
    const t = reducedMotion ? 0 : journey.beat

    // La cámara, traída al espacio de la red. Se invierte una matriz por frame
    // en vez de llevar veinte posiciones al mundo.
    INVERSE.copy(root.matrixWorld).invert()
    LOCAL_CAMERA.copy(state.camera.position).applyMatrix4(INVERSE)

    nodes.forEach((node, index) => {
      const lit = highlighted.has(node.id)
      const isHovered = index === hoveredRef.current

      // El latido va desfasado por nodo: a la vez se lee como un parpadeo de
      // la escena entera, desfasado se lee como actividad.
      const pulse = 1 + Math.sin(t * (lit ? 2.3 : 1.6) + node.phase) * (lit ? 0.26 : 0.13)
      // Dentro del cerebro la red entera sube un punto: es el sitio donde
      // estás, no un detalle al fondo.
      const emphasis = (lit ? 1.6 : 1) * (isHovered ? 1.45 : 1) * (1 + inside * 0.3)
      const near = nearFade(LOCAL_CAMERA.distanceTo(node.position), reach)

      DUMMY.position.copy(node.position)
      // `show.nodes` va en la ESCALA y no en la opacidad: un punto de luz que
      // aparece creciendo se lee como que se enciende; uno que aparece con la
      // opacidad se lee como un desvanecido de interfaz.
      DUMMY.scale.setScalar(node.scale * pulse * emphasis * fadeRef.current * near * show.nodes)
      DUMMY.updateMatrix()
      mesh.setMatrixAt(index, DUMMY.matrix)

      // El color también sale de los datos: la familia decide el tono, y estar
      // relacionado con el área activa lo aclara.
      mesh.setColorAt(index, lit || isHovered ? WHITEN.copy(node.color).lerp(WHITE, 0.45) : node.color)

      presence[index] =
        labelPresence({
          inside,
          discovered,
          lit,
          hovered: isHovered,
          weight: node.weight,
          compact,
        }) * near
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  if (nodes.length === 0) return null

  return (
    <group ref={rootRef} visible={false} renderOrder={10}>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, nodes.length]}
        renderOrder={12}
        raycast={() => null}
      >
        {/* Radio 0,5 para que el diámetro sea 1: así `node.scale` significa lo
            que dice y no hay factor de conversión escondido. */}
        <icosahedronGeometry args={[0.5, NODE_DETAIL]} />

        {/*
          Básico y no estándar, y el cambio es lo que quita la sobreexposición.

          El material estándar tenía el emisivo en blanco fijo, y `instanceColor`
          en three multiplica el color DIFUSO, no el emisivo. Vistos desde
          fuera, pequeños y a través del cristal, daba igual: eran puntos de luz.
          Desde dentro, a medio metro, el resultado eran discos blancos puros
          con un halo enorme —el color de familia de cada conocimiento no se veía
          por ninguna parte, que es justo lo que la red tenía que contar—.

          Con el material básico manda el color de la instancia. Y de paso
          desaparece un cálculo de iluminación por píxel que no servía de nada:
          en aditivo y sin comprobar profundidad no había sombreado que valiera.
        */}
        {/*
          `fog={false}` en los tres materiales de la red, y es obligatorio desde
          que la cavidad tiene niebla. La niebla mezcla el color del fragmento
          hacia el del aire ANTES de mezclarlo con el fondo: sobre un material
          aditivo eso no atenúa nada, SUMA el color de la niebla por toda la
          superficie del punto. En pantalla, la red entera se volvía un borrón
          pardo. Lo que se apaga con la distancia aquí dentro es la materia
          —la pared, las áreas—, no la luz.
        */}
        {/*
          Y la opacidad baja a 0,55. En aditivo sobre una pared iluminada, 0,7
          satura y el nodo pierde su color de familia: se convierte en un disco
          blanco con halo, que es el destello suelto que hay que quitar de aquí
          dentro. Fuera daba igual porque detrás no había nada que sumar.
        */}
        {/*
          ── Y AHORA SÍ COMPRUEBA LA PROFUNDIDAD ──────────────────────────

          Estaba en `depthTest: false`, o sea que los nodos se dibujaban
          ENCIMA de todo pasara lo que pasara. Era la garantía de verlos cuando
          la cavidad era un elipsoide que se los tragaba, y tenía dos precios:
          la red se veía a través de la corteza desde fuera —así que al entrar
          no aparecía nada, ya estaba— y dentro no había forma de que un nodo
          quedara detrás de un pliegue, que es lo que da profundidad a un
          espacio.

          Con la sala por fuera de la nube ya no hay nada que se los coma, así
          que la excepción sobra. `depthWrite` sigue en falso porque son luz
          aditiva: escriben color, no ocupan sitio.
        */}
        <meshBasicMaterial
          transparent
          opacity={0.72}
          depthTest
          depthWrite={false}
          blending={AdditiveBlending}
          /*
            ── Y SI PASAN POR LA CURVA DE TONOS ─────────────────────────────

            Iban con , o sea saltandose ACES mientras todo
            lo demas de la escena pasa por ella. Eso es lo que los hacia parecer
            calcomanias: un objeto que no comparte la curva de tonos de su
            entorno no comparte su espacio, por muy bien colocado que este.
            Ademas, saltarse la curva significa recortar a uno, asi que sus
            centros salian planos.

            Es el mismo error que ya costo una vuelta con los pulsos del
            exterior, escrito en el manual: un destello con             es un destello suelto.
          */
          fog={false}
        />
      </instancedMesh>

      {/*
        Las zonas sensibles, invisibles y aparte del nodo que se ve. Es el mismo
        reparto que en los nodos exteriores: lo que se dibuja tiene el tamaño
        que pide la composición, y lo que se señala tiene el tamaño que pide un
        dedo. Mezclarlos obliga a engordar la bolita.
      */}
      <instancedMesh
        ref={hitRef}
        args={[undefined, undefined, nodes.length]}
        visible={false}
        raycast={gateRaycast}
        onPointerMove={(event) => {
          event.stopPropagation()
          hover(event.instanceId ?? -1)
        }}
        onPointerOut={() => hover(-1)}
      >
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </instancedMesh>

      <lineSegments ref={linesRef} geometry={dim} renderOrder={11} raycast={() => null}>
        <lineBasicMaterial
          color={LINE}
          vertexColors
          transparent
          opacity={0.44}
          depthTest
          depthWrite={false}
          blending={AdditiveBlending}
          /*
            ── Y SI PASAN POR LA CURVA DE TONOS ─────────────────────────────

            Iban con , o sea saltandose ACES mientras todo
            lo demas de la escena pasa por ella. Eso es lo que los hacia parecer
            calcomanias: un objeto que no comparte la curva de tonos de su
            entorno no comparte su espacio, por muy bien colocado que este.
            Ademas, saltarse la curva significa recortar a uno, asi que sus
            centros salian planos.

            Es el mismo error que ya costo una vuelta con los pulsos del
            exterior, escrito en el manual: un destello con             es un destello suelto.
          */
          fog={false}
        />
      </lineSegments>

      <lineSegments ref={activeLinesRef} geometry={hot} renderOrder={12} raycast={() => null}>
        <lineBasicMaterial
          color={LINE_ACTIVE}
          vertexColors
          transparent
          opacity={0.9}
          depthTest
          depthWrite={false}
          blending={AdditiveBlending}
          /*
            ── Y SI PASAN POR LA CURVA DE TONOS ─────────────────────────────

            Iban con , o sea saltandose ACES mientras todo
            lo demas de la escena pasa por ella. Eso es lo que los hacia parecer
            calcomanias: un objeto que no comparte la curva de tonos de su
            entorno no comparte su espacio, por muy bien colocado que este.
            Ademas, saltarse la curva significa recortar a uno, asi que sus
            centros salian planos.

            Es el mismo error que ya costo una vuelta con los pulsos del
            exterior, escrito en el manual: un destello con             es un destello suelto.
          */
          fog={false}
        />
      </lineSegments>

      {/*
        Con su propio Suspense: la tipografía es un fichero aparte, y si tardara
        en llegar no tiene por qué llevarse por delante la red entera.
      */}
      <Suspense fallback={null}>
        {/*
          LA ESCALA DE LAS ETIQUETAS VA CON LA NUBE, NO CON EL CEREBRO.

          Estaba pasando `size` a secas, o sea el tamaño del cerebro, mientras
          que los nodos se escalan con `size · spread`. Mientras `spread` valió
          0,7 la diferencia no se notaba; al recogerse la nube para hacer sitio
          a las áreas y a la cámara, las etiquetas se quedaron donde estaban y
          pasaron a medir el doble que la red que nombran —en la captura se
          leían como rótulos de interfaz encima de la escena, no como parte de
          ella—. Con `spread` incluido, la red entera es la misma figura a
          cualquier escala.
        */}
        <KnowledgeLabels nodes={nodes} presence={presence} size={size * spread} compact={compact} />
      </Suspense>
    </group>
  )
}

// Colores reutilizados: crearlos por frame generaría basura.
const WHITE = new Color('#FFFFFF')
const WHITEN = new Color()
