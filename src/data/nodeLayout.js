/**
 * Posiciones PROVISIONALES de los nodos de navegación.
 *
 * La fuente de verdad definitiva son los Empties `node_01`…`node_05` del GLB
 * de la mascota. Este archivo existe solo para poder montar y afinar la
 * constelación antes de tener ese GLB, y desaparece en cuanto llegue.
 *
 * Colocados a mano buscando una constelación irregular: nada de simetrías ni
 * de alturas repetidas, que es lo que hace que un grafo parezca un diagrama
 * en vez de una red neuronal.
 */
export const previewNodePositions = {
  node_01: [-2.6, 1.15, -0.4],
  node_02: [-1.15, -0.75, 0.5],
  node_03: [0.85, 1.55, -0.9],
  node_04: [2.35, 0.15, 0.25],
  node_05: [1.05, -1.35, -0.5],
}

/**
 * Qué nodos se unen con una conexión. No es un grafo completo a propósito:
 * unir todo con todo produce una maraña, no una red.
 */
export const nodeConnections = [
  ['node_01', 'node_02'],
  ['node_01', 'node_03'],
  ['node_02', 'node_05'],
  ['node_03', 'node_04'],
  ['node_04', 'node_05'],
  ['node_02', 'node_04'],
]
