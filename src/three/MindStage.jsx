import { Suspense } from 'react'
import CortexLight from './CortexLight'
import FloatingBrain from '../components/three/FloatingBrain'
import NeuralNodes from '../components/three/NeuralNodes'
import MindBackdrop from './MindBackdrop'
import BrainCore from './BrainCore'
import NodePanel from './NodePanel'
import OuterSpace from './OuterSpace'
import { useViewportAspect } from '../layout/useViewportAspect'

/**
 * El universo neuronal: lo que hay al otro lado del cerebro de la mano.
 *
 * Tres capas y cada una hace un trabajo distinto:
 *
 * 1. **El telón.** Es lo que se ve MIENTRAS se llega: sin él, detrás del
 *    cerebro se veía el crema de la página y la escena parecía un recorte.
 *    Una vez dentro deja de verse, y está bien que así sea — lo que rodea a la
 *    cámara a partir de ahí es la pared de la corteza, no un degradado.
 * 2. **El cerebro**, que es de donde sale la luz y, desde la fase 5E, también
 *    la arquitectura: la misma malla dibujada por dentro es la pared de la
 *    cavidad. Aquí no hay estudio ni HDRI que valga: la fuente es él.
 * 3. **La red de conocimiento**, dentro.
 * 4. **La lámina del espacio exterior**, que es lo que hay al otro lado cuando
 *    el recorrido vuelve a salir. Va fuera del grupo, en coordenadas de mundo.
 * 5. **Las cinco áreas del portfolio**, FUERA del cerebro y alrededor de él.
 *
 * ## Dentro conocimiento, fuera portfolio
 *
 * Es la arquitectura definitiva y ordena este archivo entero: `BrainCore` vive
 * DENTRO del cerebro y solo sabe de lenguajes, tecnologías y herramientas;
 * `NeuralNodes` vive FUERA y son las cinco áreas editoriales. No se mezclan, y
 * ninguno de los dos lee una palabra de `portfolio.js`.
 *
 * ## Todo se mide en CEREBROS, no en radios de escena
 *
 * Las áreas se dimensionaban con `tokens.mind.radius`, que es el radio de la
 * escena. Ahora todo —su distancia, su tamaño y la distancia de la cámara que
 * las encuadra— sale de `brainSize`. Es lo que hace que en móvil, donde el
 * cerebro es más pequeño, la composición se conserve entera.
 */
export default function MindStage({
  tokens,
  sections,
  activeSection,
  onSelectSection,
  onOpenSection,
  onCloseSection,
  compact,
}) {
  const { center, radius, brain, core } = tokens.mind
  const brainSize = radius * brain
  const aspect = useViewportAspect()

  return (
    <>
      {/* Fuera del grupo: el telón se coloca solo, con su propio centro. */}
      <MindBackdrop center={center} radius={radius} />

      {/*
        El espacio exterior, DETRÁS del cerebro y en coordenadas de mundo — por
        eso va fuera del grupo, como el telón. Solo existe en el acto 7: hasta
        que la cámara sale del cerebro su opacidad es cero y la malla ni se
        dibuja.
      */}
      <Suspense fallback={null}>
        <OuterSpace tokens={tokens} aspect={aspect} />
      </Suspense>

      <group position={center}>
        {/* El cerebro ocupa poco más de un tercio del radio de la
            constelación: si fuese mayor, los nodos quedarían encima de él en
            lugar de orbitándolo. La fracción vive en los tokens porque la
            cámara la necesita también: es ella la que entra en él. */}
        <Suspense fallback={null}>
          <FloatingBrain size={brainSize} layer="mind" compact={compact}>
            {/* Va dentro para compartir el giro del cerebro. Si no, los nodos
                interiores se verían deslizarse por dentro. */}
            <BrainCore
              size={brainSize}
              sections={sections}
              activeSection={activeSection}
              compact={compact}
              spread={core}
            />
          </FloatingBrain>
        </Suspense>

        {/* Las cinco áreas del portfolio, alrededor del cerebro. Fuera del
            grupo que gira: son puntos de navegación anclados al espacio, no
            satélites que orbiten. El giro además está detenido desde 0,5 —ver
            `spinEase`— así que el cerebro tampoco las arrastraría. */}
        <NeuralNodes
          sections={sections}
          activeSection={activeSection}
          onSelect={onSelectSection}
          brain={brainSize}
          layer="nodes"
        />

        {/*
          La ficha del área elegida. Se abre al seleccionar un nodo y ofrece las
          dos únicas cosas que hacen falta ahí: entrar en el texto o volver a
          mirar la constelación.
        */}
        <NodePanel
          sections={sections}
          brain={brainSize}
          compact={compact}
          activeSection={activeSection}
          onOpen={onOpenSection}
          onClose={onCloseSection}
        />

        {/*
          ── EL RELLENO DEL INTERIOR: UN HEMISFÉRICO, NO UNA AMBIENTAL ──────

          Era una ambiental de 0,35, y una ambiental suma lo mismo en todas las
          direcciones: no modela nada. Servía para que las caras a contraluz no
          quedaran en negro, y ni eso conseguía — en la captura de 0,50 había
          zonas de negro absoluto en la mitad alta del cuadro, donde la luz
          rasante no llega.

          Un hemisférico cuesta igual y SÍ tiene dirección: entrega el color de
          arriba a las caras que miran arriba y el de abajo a las que miran
          abajo. Sobre una superficie de giros y surcos eso es exactamente lo
          que hace falta, porque cada pliegue tiene las dos orientaciones y el
          gradiente entre ellas es el que dibuja el volumen.

          Los dos colores son de la paleta: el marfil cálido arriba —la luz que
          entra por donde se ha atravesado— y el coco de la propia materia
          abajo, que es el rebote.
        */}
        <hemisphereLight args={['#EFCDAF', '#6B4530', 1.9]} />

        {/* La luz que hace visible la corteza al llegar. Ver su cabecera: sin
            ella el casco estaba delante de la cámara y no se veía. */}
        <CortexLight />
      </group>
    </>
  )
}
