import { useRef, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Vector3 } from 'three'
import { journey } from '../journey/clock'
import { hubFocus, layerOpacity, orbitBasis, overlayRetreat, ramp } from '../journey/stages'
import { nodePositions } from '../data/nodeLayout'
import { knowledgeById, relatedTo } from '../data/network'

/**
 * Cuántos conocimientos se nombran como mucho. Pasado ese número deja de ser
 * una pista de por dónde va el área y se convierte en un listado.
 */
const MAX_TAGS = 6

/**
 * La ficha de cada nodo, flotando en el espacio junto a él.
 *
 * ## Qué contesta el 3D y qué contesta el HTML
 *
 * **Esta es una decisión de arquitectura de contenido, no de estilo, y ordena
 * todo lo que venga después.** La escena y la página cuentan la misma historia
 * en dos niveles, y no se duplican en ninguno.
 *
 * | La escena contesta | La página de abajo contesta |
 * |---|---|
 * | ¿qué es esto? | ¿qué hizo? |
 * | ¿con qué está relacionado? | ¿cómo lo hizo? |
 * | ¿dónde estoy? | ¿qué experiencia tiene? |
 * | ¿qué puedo explorar? | ¿quién es? |
 *
 * Por eso este panel llevaba párrafos y ya no. Un área del portfolio se
 * presenta con su nombre, con de qué está hecha —preguntándoselo a la red, no
 * repitiéndolo a mano— y con la indicación de que la respuesta larga está más
 * abajo. Todo lo editorial —proyectos, capturas, qué problema resolvió cada
 * uno— vive en el DOM de la página, que es donde se puede leer despacio,
 * seleccionar, indexar y ampliar sin que la cámara estorbe.
 *
 * Meter el texto completo aquí era duplicarlo: los mismos párrafos estaban ya
 * en `App.jsx`, y encima en una columna de 250 píxeles flotando en el espacio.
 *
 * ## Por qué es DOM y no texto dibujado en 3D
 *
 * Se puede escribir texto directamente en WebGL, y queda más integrado. Pero
 * ese texto no se puede seleccionar, no lo lee un lector de pantalla, no se
 * ajusta solo al ancho y no hereda ni una línea de la hoja de estilos.
 *
 * `Html` con `transform` mete un bloque de HTML de verdad en la escena y lo
 * coloca con la misma matriz que cualquier objeto 3D: se mueve con la cámara,
 * se acerca y se aleja. Sigue siendo texto real, con su tipografía y su
 * interlineado. Para párrafos es la única opción que se lee de verdad, y el
 * requisito era que funcionase en condiciones.
 *
 * ## Uno solo, siempre
 *
 * Solo se monta el panel del nodo enfocado. Cinco bloques de HTML con matriz
 * 3D actualizándose cada frame es caro y además se solapan entre ellos. Como
 * el recorrido garantiza que solo hay uno enfocado a la vez, con uno basta.
 */

// Ejes de la cámara, reutilizados. Crearlos por frame generaría basura.
const RIGHT = new Vector3()
const UP = new Vector3()
const FORWARD = new Vector3()

/**
 * ── LA FICHA SE MIDE EN CEREBROS ──────────────────────────────────────────
 *
 * Los desplazamientos eran fracciones de `tokens.mind.radius`: 0,42 a un lado
 * y 0,35 hacia la cámara, o sea 1,43 y 1,19 unidades de mundo. Tenía sentido
 * con las áreas flotando fuera, en un espacio abierto de siete unidades de
 * ancho. Dentro de una cavidad que mide dos, ese mismo desplazamiento saca la
 * ficha por la pared: el panel se quedaba detrás de la corteza y no se veía.
 *
 * Ahora salen del tamaño del cerebro y son bastante menores. La ficha se
 * queda en el hueco, delante del área y de cara a la cámara.
 */
export default function NodePanel({ sections, brain, compact, activeSection, onOpen, onClose }) {
  const groupRef = useRef(null)
  const innerRef = useRef(null)
  const activeRef = useRef(-1)
  const anchorRef = useRef(new Vector3())

  /**
   * El ÚNICO estado de React aquí: qué área está enfocada.
   *
   * ## Y NO VUELVE A −1 ENTRE ÁREAS
   *
   * Esto valía −1 en los huecos entre una parada y la siguiente, así que el
   * bloque de HTML se DESMONTABA y se volvía a montar en cada transición: cinco
   * desmontajes y cinco montajes de un subárbol de `Html transform`, cada uno
   * con su medición de maquetación y su capa de compositor nueva.
   *
   * Medido en el build con `node scripts/journey.mjs`: frames de 133 ms en
   * p=0,711 y de 250 ms en p=0,83, o sea justo en los cambios de área, y ambos
   * muy por encima de los 33 ms donde ya se ve un salto.
   *
   * Ahora el índice solo cambia cuando hay OTRA área que enseñar. En los huecos
   * se queda la anterior con la opacidad a cero, que no cuesta nada —una capa
   * transparente que el compositor ya tiene— y no obliga a reconstruir nada.
   */
  const [index, setIndex] = useState(-1)

  useFrame(({ camera }) => {
    /**
     * ── LA FICHA YA NO LA ABRE EL SCROLL: LA ABRE EL VISITANTE ────────────
     *
     * Colgaba de `nodeFocusAt`, o sea de una gira en la que la camara paraba
     * delante de cada area. Esa gira no existe: el recorrido termina con la
     * composicion montada y a partir de ahi manda el visitante.
     *
     * Ahora cuelga de `activeSection` —el mismo estado que enciende el nodo en
     * la escena y que marca la navegacion del HUD— asi que hay UNA sola fuente
     * de verdad para "que area esta abierta". Y del desvanecido de la capa
     * `nodes`: si la constelacion no esta en pantalla, su ficha tampoco.
     */
    const hub = layerOpacity('nodes', journey.progress)
    const chosen = activeSection ? sections.findIndex((s) => s.id === activeSection) : -1
    const open = chosen >= 0 && hub > 0.5

    /* El indice solo cambia cuando hay OTRA area que ensenar: en los huecos se
       queda la anterior con la opacidad a cero, que no cuesta nada y no obliga
       a reconstruir el subarbol. */
    if (chosen >= 0 && chosen !== activeRef.current) {
      activeRef.current = chosen
      setIndex(chosen)
    }

    /*
      ── Y LA FICHA ES LA PREVIEW DE LA FASE DE ENFOQUE ──────────────────

      No aparece de golpe al seleccionar: aparece MIENTRAS la camara se
      acerca. Seleccionar lleva el scroll a la fase B del hub, asi que
      `hubFocus` sube solo y la ficha entra con el, encadenada al mismo
      movimiento que la trae.

      Y al reves: subiendo con la rueda, el enfoque se deshace y la ficha se
      va. Es lo que hace que la seleccion no sea un estado pegado encima de
      la escena sino un punto del recorrido — el mismo criterio que gobierna
      todo lo demas.
    */
    if (innerRef.current) {
      const value = open
        ? ramp(hubFocus(journey.progress), 0.1, 0.75) * overlayRetreat(journey.threshold)
        : 0
      innerRef.current.style.opacity = value
      innerRef.current.style.transform = `translateY(${(1 - value) * 12}px)`
      innerRef.current.style.pointerEvents = value > 0.4 ? 'auto' : 'none'
    }

    const group = groupRef.current
    if (!group) return

    /**
     * Se coloca respecto a la CÁMARA, no respecto al cerebro.
     *
     * El primer intento lo desplazaba hacia fuera de la constelación, y para
     * los nodos altos eso lo mandaba fuera de pantalla: el panel salía cortado
     * por el borde. Usando los ejes de la cámara —su derecha y su arriba— el
     * desplazamiento es siempre "a la izquierda de lo que estás viendo", que
     * es lo que se quería decir desde el principio.
     */
    camera.matrixWorld.extractBasis(RIGHT, UP, FORWARD)

    /**
     * ── Y SE APARTA HACIA EL LADO QUE TIENE SITIO ─────────────────────────
     *
     * El desplazamiento era fijo —siempre a la izquierda, o siempre abajo— y
     * eso funcionaba cuando la camara paraba delante de cada area, una a una.
     * En el hub los cinco nodos estan repartidos alrededor del cerebro: para el
     * de arriba, un panel que sube se sale del cuadro; para el de abajo, uno
     * que baja hace lo mismo.
     *
     * Se resuelve preguntandole a la propia posicion de que lado esta. Un nodo
     * en la mitad alta cuelga su ficha hacia abajo y uno de la mitad baja la
     * levanta, asi que la ficha siempre cae hacia el centro del cuadro, que es
     * donde esta el cerebro y donde hay aire.
     */
    const above = anchorRef.current.dot(UP) >= 0
    group.position.copy(anchorRef.current)
    group.position.addScaledVector(UP, (above ? -1 : 1) * brain * (compact ? 0.5 : 0.34))

    /*
      Y en vertical se centra tambien en horizontal. Con 390 pixeles de ancho no
      hay sitio para una ficha colgando al lado de un nodo lateral: se salia por
      el borde derecho. Anulando su componente lateral, la ficha cae siempre
      sobre el eje del cerebro —que es el unico sitio del cuadro donde cabe— y
      lo unico que dice de que nodo es, es de cual sale.
    */
    if (compact) {
      group.position.addScaledVector(RIGHT, -anchorRef.current.dot(RIGHT))
    }
    /**
     * Un paso hacia la cámara, y AHORA ES UN PASO PEQUEÑO.
     *
     * Era `brain · 0,16`, o sea 0,34 unidades de mundo. Con la cámara a 0,40
     * del área, eso dejaba la ficha a seis centímetros del objetivo: el HTML se
     * escala con la inversa de la distancia, así que medía 8.500 píxeles de
     * ancho y su esquina superior izquierda caía en x = −10.572. Medido con la
     * sonda, no deducido: la ficha estaba montada, con su opacidad correcta, y
     * a diez mil píxeles fuera de la pantalla.
     */
    group.position.addScaledVector(FORWARD, brain * 0.03)

    /**
     * De frente a la cámara, siempre.
     *
     * Sin esto el bloque hereda la orientación del mundo y se ve en escorzo
     * —el texto salía inclinado y costaba leerlo—. Copiando la rotación de la
     * cámara sigue viviendo en el espacio 3D, con su paralaje y su
     * profundidad, pero se lee tan plano como una página.
     */
    group.quaternion.copy(camera.quaternion)
  })

  if (index < 0) return null

  const section = sections[index]
  /**
   * Qué conocimientos componen esta área, preguntándoselo a la red.
   *
   * Es una lista corta y se recalcula solo cuando cambia el nodo enfocado
   * —cinco veces en todo el recorrido—, así que no hace falta memorizarla.
   */
  const related = relatedTo(section.id)
    .map((id) => knowledgeById.get(id)?.label)
    .filter(Boolean)
    .slice(0, MAX_TAGS)


  const node = nodePositions(brain, orbitBasis())[section.nodeName]
  if (!node) return null

  /**
   * Se ancla al punto que la cámara mantiene CENTRADO, no al nodo suelto.
   *
   * El recorrido apunta a `área · 0,86` —ver `AIM` en `stages.js`—, así que
   * el área aparece desplazada del centro de la pantalla. Colgando el panel
   * del área, para las que están arriba acababa en la esquina superior y se
   * salía del encuadre. Colgándolo del punto centrado, el desplazamiento
   * lateral parte siempre del mismo sitio en pantalla.
   */
  /*
    Se ancla AL NODO, no a un punto intermedio. Aquel 0,86 existia porque la
    camara paraba apuntando entre el area y el centro y habia que compensar el
    desvio; en el hub la camara mira al cerebro y el nodo esta donde esta, asi
    que la ficha cuelga de el y se lee como suya.
  */
  anchorRef.current.copy(node)

  return (
    <group ref={groupRef}>
      <Html
        transform
        // Cuanto mayor, más pequeño se dibuja el HTML respecto al mundo. Es lo
        // que fija el tamaño aparente del texto sin tocar la tipografía.
        /**
         * Cuánto ocupa el bloque en pantalla.
         *
         * Estaba en 4,2 y el panel se comía media pantalla: se leía como un
         * cartel encima de la escena, no como una etiqueta dentro de ella.
         * Este es el único número del proyecto que sigue calibrándose a ojo,
         * y es porque no hay fórmula: el tamaño depende de la tipografía, del
         * ancho del bloque y de la distancia a la que para la cámara. Se ajusta
         * mirando las capturas de `scripts/shoot.mjs`.
         */
        /**
         * Y baja a la escala de dentro, pero MENOS de lo que parecía.
         *
         * En drei el tamaño en pantalla es `distanceFactor / distancia`, así
         * que al acercarse la cámara hay que BAJAR el número, no subirlo —y
         * bajarlo en la misma proporción en que se acortó la distancia—. La
         * cámara paraba a unas tres unidades del nodo y ahora para a 0,4. Medido
         * con la sonda hasta que el bloque volvió a medir sus 300 píxeles: con
         * 0,34 seguía saliendo de 974 y cortado por el borde izquierdo.
         */
        /*
          Y vuelve a subir, porque la camara ha vuelto a alejarse. En drei el
          tamano en pantalla es `distanceFactor / distancia`: en el hub la
          camara para a unas nueve unidades del centro, contra las 0,4 de la
          gira interior que ya no existe.
        */
        distanceFactor={compact ? 1.15 : 2.3}
        /* Siempre centrada: es ella la que se aparta, no su punto de anclaje. */
        center
        zIndexRange={[20, 0]}
      >
        <div
          ref={innerRef}
          style={{ opacity: 0 }}
          // Columna estrecha y fondo casi opaco. Translúcido sobre la
          // constelación, las líneas se veían por debajo del texto y costaba
          // leer: el fondo de un bloque de lectura no es sitio para efectos.
          className={`border-l border-brain-glow bg-[#140E0B]/95 px-6 py-5 ${
            compact ? 'w-[236px]' : 'w-[272px]'
          }`}
        >
          <span className="font-mono text-[9px] tracking-[0.14em] text-coco-light">
            {section.nodeName.replace('node_', 'NODO ')}
          </span>

          <h2 className="mt-2 text-[17px] font-semibold leading-[1.15] tracking-[-0.01em] text-cream">
            {section.label}
          </h2>

          {/*
            De qué está hecha esta área, según la red. No es una lista escrita a
            mano: sale de `sections` en `knowledge.js`, la misma declaración que
            enciende los nodos de dentro del cerebro. Añadir una tecnología al
            área la añade aquí sola.
          */}
          {related.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-x-2 gap-y-1">
              {related.map((label) => (
                <li key={label} className="font-mono text-[9.5px] leading-none text-cream/55">
                  {label}
                </li>
              ))}
            </ul>
          )}

          {/*
            ── LAS DOS ACCIONES ────────────────────────────────────────────

            Aqui habia un "sigue abajo", que era correcto cuando la ficha
            aparecia sola al pasar la camara: informaba de que el texto estaba
            mas abajo y no habia nada que pulsar.

            En el hub la ficha se abre porque alguien ha elegido un area, asi
            que tiene que ofrecer lo que ese alguien queria: entrar. El boton
            llama a `onOpen`, que es `goToNode` —el MISMO que usa el HUD— asi
            que no hay una segunda navegacion: hay un solo camino con dos
            puertas.

            Y se puede cerrar sin salir del hub, que es lo que permite mirar
            las cinco antes de decidir.
          */}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={() => onOpen?.(section.id)}
              className="group flex shrink-0 items-center gap-2 whitespace-nowrap font-mono text-[11px] leading-none text-cream transition-colors hover:text-brain-glow focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-brain-glow"
            >
              <span
                aria-hidden="true"
                className="h-px w-5 bg-brain-glow transition-all duration-300 group-hover:w-8"
              />
              Explorar {section.label.toLowerCase()}
            </button>

            <button
              type="button"
              onClick={() => onClose?.()}
              aria-label="Volver a la vista de la red"
              className="flex shrink-0 items-center gap-2 whitespace-nowrap font-mono text-[11px] leading-none text-cream/45 transition-colors hover:text-cream focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-brain-glow"
            >
              {/*
                El icono es el ÚNICO préstamo que esta pieza toma de la capa
                editorial, y se puede: `Icon` no sabe nada del portfolio —es un
                trazo y `currentColor`— así que la regla de §6 sigue en pie. Lo
                que Three.js no puede conocer son textos, proyectos y
                contenido, no la forma de una flecha.

                Y aquí el trazo hace más trabajo que en el editorial: esta
                ficha flota en el espacio, sin filete ni margen que la ordene,
                y dos botones de once píxeles seguidos se leían como una sola
                línea de texto. El trazo dice cuál de los dos vuelve.
              */}
              <Icon name="back" size="1.15em" className="link-arrow-back" />
              volver a la red
            </button>
          </div>
        </div>
      </Html>
    </group>
  )
}
