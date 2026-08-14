/**
 * Posiciones PROVISIONALES de los nodos, en órbita alrededor de la mascota.
 *
 * La fuente de verdad definitiva son los Empties `node_01`…`node_05` del GLB.
 * Este archivo desaparece en cuanto ese GLB exista.
 *
 * Colocados a mano buscando una constelación irregular: distintas alturas,
 * distintas profundidades y ningún par simétrico. Un grafo regular parece un
 * diagrama de organigrama, no una red.
 */
/**
 * Los nodos orbitan el cerebro, que ocupa unas 2,1 unidades de diametro. Por
 * eso ninguno cae a menos de 2,2 del centro: mas cerca y se meterian dentro
 * del modelo.
 */
export const previewNodePositions = {
  node_01: [-2.55, 1.15, 0.5],
  node_02: [-2.85, -0.85, -0.7],
  node_03: [0.15, 2.35, -0.4],
  node_04: [2.75, 0.55, 0.8],
  node_05: [1.85, -1.75, -0.5],
}

/** Qué nodos se unen. No es un grafo completo: unir todo con todo da maraña. */
export const nodeConnections = [
  ['node_01', 'node_02'],
  ['node_01', 'node_03'],
  ['node_02', 'node_05'],
  ['node_03', 'node_04'],
  ['node_04', 'node_05'],
]
