import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Vector3 } from 'three'
import { journey } from '../journey/clock'
import { nodeFocusAt } from '../journey/stages'
import { nodePositions } from '../data/nodeLayout'

/**
 * El contenido de cada nodo, flotando en el espacio junto a él.
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

/** Por debajo de esto no hay nada que enseñar y el panel ni se monta. */
const VISIBLE_THRESHOLD = 0.02

// Ejes de la cámara, reutilizados. Crearlos por frame generaría basura.
const RIGHT = new Vector3()
const UP = new Vector3()
const FORWARD = new Vector3()

export default function NodePanel({ sections, content, radius, compact }) {
  const groupRef = useRef(null)
  const innerRef = useRef(null)
  const activeRef = useRef(-1)
  const anchorRef = useRef(new Vector3())

  // El ÚNICO estado de React aquí: qué nodo está enfocado. Cambia cinco veces
  // en todo el recorrido, no sesenta veces por segundo.
  const [index, setIndex] = useState(-1)

  useFrame(({ camera }) => {
    const state = nodeFocusAt(journey.progress, sections.length)
    const next = state && state.focus > VISIBLE_THRESHOLD ? state.index : -1

    if (next !== activeRef.current) {
      activeRef.current = next
      setIndex(next)
    }

    // La opacidad sí se escribe cada frame, directamente en el estilo, para
    // que la aparición siga al scroll sin pasar por React.
    if (innerRef.current) {
      const value = state ? state.focus : 0
      innerRef.current.style.opacity = value
      innerRef.current.style.transform = `translateY(${(1 - value) * 14}px)`
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

    group.position.copy(anchorRef.current)
    if (compact) {
      group.position.addScaledVector(UP, -radius * 0.5)
    } else {
      group.position.addScaledVector(RIGHT, -radius * 0.42)
    }
    // Un paso hacia la cámara para que nunca lo tape el propio cerebro.
    group.position.addScaledVector(FORWARD, radius * 0.35)

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
  const paragraphs = content[section.id] ?? []
  const node = nodePositions(radius)[section.nodeName]
  if (!node) return null

  /**
   * Se ancla al punto que la cámara mantiene CENTRADO, no al nodo suelto.
   *
   * El recorrido apunta a `nodo · 0,78`, así que el nodo aparece desplazado
   * del centro de la pantalla. Colgando el panel del nodo, para los que están
   * arriba acababa en la esquina superior y se salía del encuadre. Colgándolo
   * del punto centrado, el desplazamiento lateral parte siempre del mismo
   * sitio en pantalla.
   */
  anchorRef.current.copy(node).multiplyScalar(0.78)

  return (
    <group ref={groupRef}>
      <Html
        transform
        // Cuanto mayor, más pequeño se dibuja el HTML respecto al mundo. Es lo
        // que fija el tamaño aparente del texto sin tocar la tipografía.
        distanceFactor={compact ? 3.4 : 4.2}
        center={compact}
        // Sin esto el panel atrapa los clics de toda la escena.
        pointerEvents="none"
        zIndexRange={[20, 0]}
      >
        <div
          ref={innerRef}
          style={{ opacity: 0 }}
          className="w-[300px] border-l border-brain-glow bg-coco-dark/85 p-5 backdrop-blur-sm"
        >
          <span className="font-mono text-[10px] text-coco-light">
            {section.nodeName.replace('node_', 'nodo ')}
          </span>

          <h2 className="mt-1 text-[22px] font-semibold leading-[1.1] tracking-[-0.02em] text-cream">
            {section.label}
          </h2>

          {paragraphs.length > 0 ? (
            paragraphs.map((text) => (
              <p
                key={text.slice(0, 24)}
                className="mt-3 text-[12px] leading-[1.5] text-cream/80"
              >
                {text}
              </p>
            ))
          ) : (
            <p className="mt-3 text-[12px] leading-[1.5] text-cream/55">Contenido pendiente.</p>
          )}
        </div>
      </Html>
    </group>
  )
}
