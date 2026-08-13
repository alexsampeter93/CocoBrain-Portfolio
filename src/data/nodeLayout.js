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
  node_01: [-1.75, 1.05, 0.6],
  node_02: [-2.15, -0.55, -0.35],
  node_03: [1.55, 1.4, -0.75],
  node_04: [2.05, -0.15, 0.55],
  node_05: [0.35, -1.6, -0.5],
}

/** Qué nodos se unen. No es un grafo completo: unir todo con todo da maraña. */
export const nodeConnections = [
  ['node_01', 'node_02'],
  ['node_01', 'node_03'],
  ['node_02', 'node_05'],
  ['node_03', 'node_04'],
  ['node_04', 'node_05'],
]
