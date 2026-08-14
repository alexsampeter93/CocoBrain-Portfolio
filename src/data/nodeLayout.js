import { Vector3 } from 'three'

/**
 * Dónde se coloca cada nodo alrededor del cerebro.
 *
 * Antes eran coordenadas absolutas escritas a mano. El problema es que en
 * móvil el cerebro es más pequeño y los nodos se quedaban donde estaban, así
 * que unos se metían dentro del modelo y otros se salían de pantalla.
 *
 * Ahora es una DIRECCIÓN (hacia dónde) y un FACTOR (cuánto más lejos que el
 * radio base). El tamaño real lo pone `tokens.mind.radius`, así que la
 * constelación se adapta sola y conserva la forma.
 *
 * Las direcciones están elegidas a mano buscando irregularidad: ninguna altura
 * repetida, ningún par simétrico y ningún nodo justo detrás de otro. Una
 * constelación regular se lee como un organigrama, no como una mente.
 */
const RAW = {
  node_01: { dir: [-0.78, 0.42, 0.18], factor: 1.0 },
  node_02: { dir: [-0.62, -0.44, -0.35], factor: 1.18 },
  node_03: { dir: [0.08, 0.86, -0.22], factor: 0.94 },
  node_04: { dir: [0.82, 0.2, 0.3], factor: 1.1 },
  node_05: { dir: [0.54, -0.62, -0.18], factor: 1.26 },
}

/**
 * @param radius radio base del universo neuronal, de `tokens.mind.radius`.
 * @returns { node_01: Vector3, ... } en coordenadas locales del interior.
 */
export function nodePositions(radius) {
  const out = {}

  for (const [name, { dir, factor }] of Object.entries(RAW)) {
    out[name] = new Vector3(...dir).normalize().multiplyScalar(radius * factor)
  }

  return out
}

/**
 * Qué nodos se unen. No es un grafo completo a propósito: unir todo con todo
 * da una maraña que tapa el cerebro en lugar de rodearlo.
 */
export const nodeConnections = [
  ['node_01', 'node_02'],
  ['node_01', 'node_03'],
  ['node_02', 'node_05'],
  ['node_03', 'node_04'],
  ['node_04', 'node_05'],
]
