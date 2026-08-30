import { useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { Color, DoubleSide, Quaternion, ShapeGeometry, Vector3 } from 'three'
import { ramp } from '../journey/stages'

/**
 * Las etiquetas de los conocimientos que viven dentro del cerebro.
 *
 * ## Por qué NO son HTML, al contrario que los paneles de sección
 *
 * `NodePanel` usa DOM de verdad, y con razón: es contenido que hay que poder
 * seleccionar y que tiene que leer un lector de pantalla. Aquí el caso es el
 * contrario. Son diecisiete letras como mucho, hay veinte a la vez, y lo que
 * importa es que pertenezcan al espacio: que se escorcen con la perspectiva y
 * que se apaguen al alejarse. Un bloque de HTML colocado con `Html transform`
 * siempre acaba leyéndose como una pegatina encima de la escena, y con veinte
 * de ellos actualizando su matriz cada frame además sale caro.
 *
 * Así que son geometría: los contornos de la tipografía convertidos en mallas
 * planas. Viven en el mundo igual que los nodos.
 *
 * El contenido accesible de la red no se pierde por esto —está en el DOM de la
 * página, fuera de la escena—, que es la misma regla de siempre: el 3D no es
 * el sitio donde vive el texto, es el sitio donde se representa.
 *
 * ## La tipografía
 *
 * `public/fonts/cocobrain.typeface.json` — Outfit SemiBold, ya convertida y
 * servida desde aquí, nunca desde un CDN. Es la única tipografía del proyecto,
 * reservada hasta ahora al logotipo; usarla en rótulos de dos palabras es un
 * uso de marca, no de cuerpo, pero **es una decisión que hay que confirmar**
 * cuando se elija la tipografía de texto.
 */

const FONT_URL = '/fonts/cocobrain.typeface.json'

/**
 * Alto de la caja tipográfica, en fracción del cerebro.
 *
 * Junto al `distanceFactor` de `NodePanel`, es el otro número del proyecto que
 * se calibra mirando, y por el mismo motivo: no hay fórmula que relacione el
 * cuerpo de una letra con "se lee bien". La referencia con la que está puesto:
 * desde la parada interior, la altura de una mayúscula sale en torno al 1,7%
 * del alto de la ventana, unos dieciséis píxeles en una pantalla de 900.
 */
/**
 * ── Y EN VERTICAL ES MAS GRANDE, PORQUE LA PANTALLA ES MAS PEQUENA ───────
 *
 * El tamano en el mundo escala con el cerebro y la distancia de camara tambien,
 * asi que la fraccion de pantalla que ocupa una etiqueta es la MISMA en las dos
 * ventanas. El problema es que esa fraccion se convierte en pixeles distintos:
 * 844 de alto contra 1080 son un 22% menos, y sobre un movil eso deja el nombre
 * de un conocimiento en el limite de lo legible.
 *
 * No se arregla subiendo el numero para todos —en escritorio ya esta bien y
 * crecerlo convertiria la red en un listado— sino dandole a la ventana estrecha
 * el suyo. Con 1,7 veces, la altura de una mayuscula pasa de unos once pixeles
 * a diecinueve en 390.
 */
const LABEL_EM = 0.0076
const LABEL_EM_COMPACT = 0.0118

/**
 * Cuánto se aproximan las curvas de cada letra. Tres es suficiente a este
 * tamaño y deja la red entera en unos pocos miles de triángulos; el valor por
 * defecto de three es doce y multiplicaría eso por cuatro para nada.
 */
const CURVE_SEGMENTS = 3

/** Opacidad de una etiqueta a plena presencia. */
const MAX_OPACITY = 0.95

/**
 * ── LA SOMBRA QUE DESPEGA EL TEXTO DE LA MATERIA ──────────────────────────
 *
 * El nombre de un conocimiento es geometria plana flotando delante de una pared
 * de pliegues con gradiente: sobre un giro iluminado, un texto claro se pierde;
 * sobre un surco, se lee. Depende de por donde caiga, que es exactamente lo que
 * no puede pasar con lo unico que hay que LEER de la escena.
 *
 * La solucion no es una caja detras —eso convierte la red en una lista de
 * fichas— sino una sombra: la misma geometria, en coco casi negro, desplazada
 * una fraccion del cuerpo y un pelin por detras. Es hija del texto, asi que
 * hereda su orientacion de cartel y su escala sin ningun calculo extra.
 *
 * Cuesta duplicar veinte mallas planas de unos cientos de triangulos. Es la
 * mitad de barato que cualquier alternativa y la unica que funciona sobre
 * cualquier fondo.
 */
const SHADOW = { color: '#140F0C', offset: 0.1, opacity: 0.9 }

/**
 * ## Cuándo se ve cada etiqueta
 *
 * La regla completa vive aquí, en una función pura, y no repartida por el
 * componente. Es lo que permite cambiar el criterio sin tocar nada de 3D.
 *
 * En reposo no hay ninguna, y al entrar tampoco: la red se ve PRIMERO como red
 * —puntos y conexiones— y los nombres llegan después. Esa espera es lo que
 * convierte la lectura en un descubrimiento en vez de en un listado de
 * tecnologías flotando.
 *
 * A partir de ahí, tres cosas encienden una etiqueta, y se toma la mayor de las
 * tres en lugar de sumarlas —sumar haría que un nodo importante Y relacionado
 * brillara el doble que el máximo—.
 *
 * 1. **El peso, escalonado.** Los tres pilares salen pronto y a plena
 *    intensidad; los secundarios entran bastante después y más tenues. Los de
 *    peso 1 no salen nunca por sí solos: son veinte nodos en un espacio pequeño
 *    y encender los veinte es exactamente el ruido que hay que evitar.
 * 2. **El área activa.** Si hay una sección del portfolio abierta, lo que la
 *    compone se etiqueta entero, sin importar el peso. Es la relación entre las
 *    dos capas de la red, hecha visible.
 * 3. **El puntero.** Sea lo que sea, si lo señalas te dice lo que es.
 *
 * Las dos primeras van multiplicadas por `inside` a propósito. Desde fuera del
 * cerebro los conocimientos se ven a través del cristal como puntos de dos
 * píxeles: una etiqueta ahí no se leería, solo ensuciaría. Fuera, la respuesta
 * al área activa sigue siendo la que ya había —color, tamaño y las aristas
 * encendidas—, que es la que se entiende a esa distancia.
 */
/*
  ── Y LOS DE PESO 1 TAMBIEN SE ETIQUETAN ────────────────────────────────

  Aqui estaba la razon de fondo de "no consigo identificar las tecnologias".
  Los de peso 1 tenian `null`, o sea que NUNCA decian su nombre por si solos, y
  en vertical tampoco lo decian los de peso 2. Recorriendo el interior, la
  mayoria de la red era anonima: no era que el texto fuese pequeno, es que no
  estaba.

  El argumento original —"son veinte nodos en un espacio pequeno y encender los
  veinte es ruido"— sigue siendo cierto, y por eso NO se resuelve encendiendolo
  todo a la vez: lo resuelve el reparto de sitio en pantalla, que ya existe y
  ya decide cuales caben. Lo que hacia falta era dejar que compitieran.

  Ahora los tres pesos aparecen escalonados —primero los pilares, luego los
  secundarios, al final el resto— y todos son identificables. La jerarquia se
  mantiene en la INTENSIDAD, no en la ausencia.
*/
const TIERS = {
  3: { from: 0.04, to: 0.3, level: 1.0 },
  2: { from: 0.26, to: 0.56, level: 0.88 },
  1: { from: 0.5, to: 0.86, level: 0.72 },
}
/** En vertical hay menos sitio, asi que el ultimo escalon entra mas tarde. */
const TIERS_COMPACT = {
  3: { from: 0.06, to: 0.32, level: 1.0 },
  2: { from: 0.34, to: 0.64, level: 0.9 },
  1: { from: 0.6, to: 0.92, level: 0.76 },
}

export function labelPresence({ inside, discovered, lit, hovered, weight, compact = false }) {
  if (hovered) return 1

  const tier = (compact ? TIERS_COMPACT : TIERS)[weight]
  const byWeight = tier ? ramp(discovered, tier.from, tier.to) * tier.level : 0
  const byArea = lit ? 1 : 0

  return Math.max(byWeight, byArea) * inside
}

/**
 * ## Y cuándo NO se ve, aunque le tocara
 *
 * Dos etiquetas que caen en el mismo sitio de la pantalla son ilegibles las
 * dos. Como la red es tridimensional y la cámara gira, no hay colocación fija
 * que lo evite: dos nodos separados en el espacio se solapan en cuanto se
 * alinean con la vista.
 *
 * Así que se resuelve donde ocurre el problema, en pantalla. Cada frame se
 * proyectan las candidatas, se ordenan por presencia y se recorren de mayor a
 * menor: la primera que llega a un sitio se lo queda, y las que caen encima se
 * atenúan en vez de desaparecer. Atenuar y no ocultar es lo que evita el
 * parpadeo cuando dos nodos se cruzan, y además dice algo cierto —hay algo ahí,
 * pero no es lo que estás mirando—.
 *
 * Una atenuada no reserva sitio, así que en un racimo queda una legible y el
 * resto de fondo, que es justo la jerarquía que se busca.
 *
 * El área de exclusión es una elipse ancha y baja, con la forma de la propia
 * etiqueta: en horizontal ocupa mucho y en vertical casi nada.
 */
/*
  ── Y SUBEN CON LOS NODOS ─────────────────────────────────────────────────

  Estas dos separaciones —en coordenadas de pantalla— deciden cuando dos
  etiquetas se estorban y una se calla. Estaban calibradas para nodos que
  median pocos pixeles; al darles cuerpo, las mismas distancias dejaban textos
  encima de la bola del vecino. Subiendolas, el sistema de reparto descarta
  antes y el que queda se lee limpio.
*/
const GAP_X = 0.225
const GAP_Y = 0.072
/** Lo que le queda a una etiqueta desplazada por otra de más peso. */
/*
  Y la que pierde el sitio se apaga MAS: 0,06 en vez de 0,16.

  Ese valor existe para que una etiqueta desplazada no desaparezca de golpe
  —se queda insinuada y vuelve cuando hay hueco— y estaba calibrado con un
  texto mas pequeno y mas apagado. Con la tipografia crecida y el contraste
  subido, el 16% ya se LEE, asi que dos nombres apinados se pisaban en vez de
  turnarse. Al 6% sigue habiendo rastro y solo se lee el que gana.
*/
const CROWDED = 0.06

/** Constante de tiempo del suavizado, en segundos. */
const TAU = 0.14

const WHITE = new Color('#FFFFFF')

// Reutilizados en el bucle: crear objetos por frame generaría basura.
const PARENT = new Quaternion()
const FACING = new Quaternion()
const SCREEN = new Vector3()

/**
 * @param nodes    la lista ya resuelta de conocimientos (posición, color, peso)
 * @param presence `Float32Array` que `BrainCore` reescribe cada frame. Se pasa
 *                 el búfer y no un estado de React porque cambia sesenta veces
 *                 por segundo y React es el sitio equivocado para eso.
 * @param size     el tamaño del cerebro, del que sale el cuerpo de la letra
 */
export default function KnowledgeLabels({ nodes, presence, size, compact = false }) {
  const font = useLoader(FontLoader, FONT_URL)
  const groupRef = useRef(null)
  const meshesRef = useRef([])

  /**
   * Una geometría por etiqueta, generada UNA vez. Convertir contornos a
   * triángulos no es barato; hacerlo por frame sería absurdo.
   */
  const labels = useMemo(() => {
    const em = size * (compact ? LABEL_EM_COMPACT : LABEL_EM)

    return nodes.map((node) => {
      const geometry = new ShapeGeometry(font.generateShapes(node.label, em), CURVE_SEGMENTS)
      geometry.computeBoundingBox()
      const box = geometry.boundingBox

      /**
       * El desplazamiento va HORNEADO en la geometría, no en la posición de la
       * malla. Como la malla mira siempre a la cámara, su eje X local es la
       * derecha de la pantalla: así "a la derecha del nodo" significa lo mismo
       * se mire desde donde se mire. Desplazando la malla en el mundo, la
       * etiqueta se colocaría a un lado distinto según el ángulo.
       */
      /*
  El aire entre el punto y la palabra, ahora medido contra un nodo que tiene
  cuerpo: 1,9 veces su radio en vez de 1,4, o el texto arranca dentro del halo.
*/
      const gap = node.scale * 1.9 + em * 0.6
      geometry.translate(-box.min.x + gap, -(box.min.y + box.max.y) / 2, 0)

            /*
        El texto se aclara mas —0,78 en vez de 0,62 hacia el marfil— desde que
        el fondo es materia coco con volumen en vez de un campo liso. Sigue
        conservando el tinte de su familia, que es lo que distingue un lenguaje
        de una herramienta, pero ya no compite en luminancia con la pared.
      */
      return {
        geometry,
        color: node.color.clone().lerp(WHITE, 0.78),
        position: node.position,
        drop: em * SHADOW.offset,
      }
    })
  }, [font, nodes, size, compact])

  /** Lo que se está mostrando y lo que debería mostrarse. */
  const shown = useMemo(() => new Float32Array(nodes.length), [nodes.length])
  const wanted = useMemo(() => new Float32Array(nodes.length), [nodes.length])
  const order = useMemo(() => new Int32Array(nodes.length), [nodes.length])
  const takenX = useMemo(() => new Float32Array(nodes.length), [nodes.length])
  const takenY = useMemo(() => new Float32Array(nodes.length), [nodes.length])

  useFrame(({ camera }, delta) => {
    const group = groupRef.current
    if (!group) return

    /**
     * Billboard, compensando al padre.
     *
     * Estas etiquetas cuelgan del grupo que gira con el cerebro, así que
     * copiar la rotación de la cámara sin más las dejaría giradas por el
     * propio giro del cerebro. Se copia la orientación que hace falta EN EL
     * MUNDO y se convierte a local invirtiendo la del padre. Una sola vez por
     * frame, no una por etiqueta.
     */
    PARENT.setFromRotationMatrix(group.matrixWorld)
    FACING.copy(PARENT).invert().multiply(camera.quaternion)

    // 1. Las candidatas, ordenadas de más a menos presencia. Ordenación por
    //    inserción: son veinte y llegan casi ordenadas de un frame al otro.
    wanted.fill(0)
    let count = 0
    for (let i = 0; i < labels.length; i += 1) {
      if ((presence[i] ?? 0) > 0.02) order[count++] = i
    }
    for (let i = 1; i < count; i += 1) {
      const value = order[i]
      let j = i - 1
      while (j >= 0 && presence[order[j]] < presence[value]) {
        order[j + 1] = order[j]
        j -= 1
      }
      order[j + 1] = value
    }

    // 2. El reparto del sitio en pantalla.
    let taken = 0
    for (let k = 0; k < count; k += 1) {
      const i = order[k]
      SCREEN.copy(labels[i].position).applyMatrix4(group.matrixWorld).project(camera)

      // Detrás de la cámara: `project` la devuelve dada la vuelta, así que sin
      // esta comprobación aparecería una etiqueta fantasma en el lado opuesto.
      if (SCREEN.z > 1) continue

      let value = presence[i]
      let free = true

      for (let m = 0; m < taken; m += 1) {
        const dx = (SCREEN.x - takenX[m]) / GAP_X
        const dy = (SCREEN.y - takenY[m]) / GAP_Y
        if (dx * dx + dy * dy < 1) {
          free = false
          break
        }
      }

      if (free) {
        takenX[taken] = SCREEN.x
        takenY[taken] = SCREEN.y
        taken += 1
      } else {
        value *= CROWDED
      }

      wanted[i] = value
    }

    // 3. Y se persigue el objetivo en vez de saltar a él. Sin esto, cruzarse
    //    dos nodos hace que sus etiquetas parpadeen.
    const k = 1 - Math.exp(-Math.min(delta, 0.1) / TAU)

    for (let i = 0; i < meshesRef.current.length; i += 1) {
      const mesh = meshesRef.current[i]
      if (!mesh) continue

      shown[i] += (wanted[i] - shown[i]) * k
      const value = shown[i]

      if (value < 0.01) {
        mesh.visible = false
        continue
      }

      mesh.visible = true
      mesh.material.opacity = value * MAX_OPACITY
      /* La sombra es su unico hijo y va al mismo compas. */
      const shadow = mesh.children[0]
      if (shadow) shadow.material.opacity = value * MAX_OPACITY * SHADOW.opacity
      mesh.quaternion.copy(FACING)
      // Entra creciendo un poco. Aparecer a tamaño final se lee como un
      // interruptor; así se lee como algo que se acerca a decir su nombre.
      mesh.scale.setScalar(0.9 + value * 0.1)
    }
  })

  return (
    <group ref={groupRef}>
      {labels.map((label, index) => (
        <mesh
          key={index}
          ref={(node) => {
            meshesRef.current[index] = node
          }}
          geometry={label.geometry}
          position={label.position}
          visible={false}
          // Por encima de los nodos y de las líneas: una etiqueta tapada a
          // medias por un punto de luz no se lee.
          renderOrder={14}
          raycast={() => null}
        >
          {/*
            Sin comprobar profundidad, igual que los nodos y por el mismo
            motivo: se ven A TRAVÉS del cristal del cerebro, no tapadas por él.
            Y sin `toneMapped: false`, al contrario que los nodos: el texto es
            lo único de la escena que hay que LEER, y si se sale del rango del
            tono el bloom lo convierte en una mancha rosa.
          */}
          {/* Sin niebla: una etiqueta a media distancia teñida del color del
              aire deja de leerse, y su presencia ya la gradúa `labelPresence`
              con criterio narrativo en vez de con distancia. */}
          <meshBasicMaterial
            color={label.color}
            transparent
            opacity={0}
            depthTest={false}
            depthWrite={false}
            side={DoubleSide}
            fog={false}
          />

          {/*
            La sombra. Hija del texto para heredar su giro de cartel y su
            escala, desplazada abajo y a la derecha y un pelin por detras. Su
            `renderOrder` es uno menos que el del texto, asi que se dibuja
            justo antes y nunca por encima.
          */}
          <mesh
            geometry={label.geometry}
            position={[label.drop, -label.drop, -0.0004]}
            renderOrder={13}
            raycast={() => null}
          >
            <meshBasicMaterial
              color={SHADOW.color}
              transparent
              opacity={0}
              depthTest={false}
              depthWrite={false}
              side={DoubleSide}
              fog={false}
            />
          </mesh>
        </mesh>
      ))}
    </group>
  )
}
