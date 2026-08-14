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
export const previewNodePositions = {
  node_01: [-1.9, 0.95, 0.7],
  node_02: [-2.3, -0.75, -0.5],
  node_03: [1.5, 1.5, -0.8],
  node_04: [2.25, -0.25, 0.6],
  node_05: [0.15, -1.75, -0.35],
}

/** Qué nodos se unen. No es un grafo completo: unir todo con todo da maraña. */
export const nodeConnections = [
  ['node_01', 'node_02'],
  ['node_01', 'node_03'],
  ['node_02', 'node_05'],
  ['node_03', 'node_04'],
  ['node_04', 'node_05'],
]
