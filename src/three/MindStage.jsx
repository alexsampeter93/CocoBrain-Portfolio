import { Suspense } from 'react'
import FloatingBrain from '../components/three/FloatingBrain'
import NeuralNodes from '../components/three/NeuralNodes'
import MindBackdrop from './MindBackdrop'
import NodePanel from './NodePanel'
import { sectionContent } from '../data/sections'

/**
 * El universo neuronal: lo que hay al otro lado del cerebro de la mano.
 *
 * Tres capas y cada una hace un trabajo distinto:
 *
 * 1. **El telón.** Sin él, detrás de los nodos se veía el crema de la página y
 *    la red parecía puntos pegados sobre una web. Un objeto sin entorno
 *    siempre se lee como un recorte.
 * 2. **El cerebro**, que es de donde sale la luz. Aquí no hay estudio ni HDRI
 *    que valga: la fuente es él.
 * 3. **Los nodos**, que son lo único con lo que se interactúa.
 *
 * Todo se dimensiona a partir de `tokens.mind.radius`, así que en móvil la
 * constelación se encoge conservando la forma en vez de salirse de pantalla.
 */
export default function MindStage({ tokens, sections, activeSection, onSelectSection, compact }) {
  const { center, radius } = tokens.mind

  return (
    <>
      {/* Fuera del grupo: el telón se coloca solo, con su propio centro. */}
      <MindBackdrop center={center} radius={radius} />

      <group position={center}>
        {/* El cerebro ocupa poco más de un tercio del radio de la
            constelación: si fuese mayor, los nodos quedarían encima de él en
            lugar de orbitándolo. */}
        <Suspense fallback={null}>
          <FloatingBrain size={radius * 0.62} layer="mind" compact={compact} />
        </Suspense>

        <NeuralNodes
          sections={sections}
          activeSection={activeSection}
          onSelect={onSelectSection}
          radius={radius}
          layer="nodes"
        />

        {/* El contenido, anclado al nodo que toque según el scroll. */}
        <NodePanel
          sections={sections}
          content={sectionContent}
          radius={radius}
          compact={compact}
        />

        {/* Relleno tenue para que las caras del cerebro no queden en negro
            puro por el lado contrario a su propia luz. */}
        <ambientLight intensity={0.35} color="#FFC9B0" />
      </group>
    </>
  )
}
