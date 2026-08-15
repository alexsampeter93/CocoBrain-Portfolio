import { MathUtils } from 'three'

/**
 * Encuadre calculado, no elegido a ojo.
 *
 * Hasta ahora la distancia de la cámara era un número escrito a mano y
 * ajustado probando: 6,4… no, 7,0. Eso funciona en la pantalla en la que lo
 * pruebas y falla en todas las demás, que es exactamente lo que pasaba —en
 * móvil el cerebro llenaba la pantalla y los nodos quedaban fuera de cuadro.
 *
 * La geometría es de instituto y quita el problema de raíz.
 *
 * Una cámara en perspectiva ve, a una distancia `d`, una ventana de
 * `2 · d · tan(fov / 2)` de alto. Despejando la distancia a partir del alto
 * que quieres abarcar:
 *
 *     d = mitadDelAlto / tan(fov / 2)
 *
 * El ancho visible es ese alto multiplicado por la proporción de la pantalla,
 * así que la cuenta horizontal lleva un `aspect` de más. Y como hay que
 * cumplir las dos, se toma la mayor de las dos distancias: la que más lejos
 * obliga a ponerse.
 *
 * En una pantalla apaisada manda casi siempre la altura; en un móvil en
 * vertical, el ancho. Por eso el mismo número no puede valer para las dos.
 */

/**
 * @param halfWidth  medio ancho de lo que hay que abarcar, en unidades de mundo
 * @param halfHeight medio alto
 * @param fov        campo de visión vertical de la cámara, en grados
 * @param aspect     ancho / alto de la ventana
 * @param fill       fracción del encuadre que puede ocupar. 0,8 deja un 20% de
 *                   aire, que es lo que separa una composición de un plano
 *                   apretado
 */
export function fitDistance({ halfWidth, halfHeight, fov, aspect, fill = 0.8 }) {
  const tanHalfFov = Math.tan(MathUtils.degToRad(fov) / 2)

  const forHeight = halfHeight / (fill * tanHalfFov)
  const forWidth = halfWidth / (fill * tanHalfFov * aspect)

  return Math.max(forHeight, forWidth)
}

/**
 * Medidas de la mascota una vez cargada y escalada. Hasta que el modelo
 * llegue se trabaja con una estimación, y en cuanto llega manda la de verdad.
 *
 * La proporción por defecto sale de la propia malla: es casi tan ancha como
 * alta, porque es un coco.
 */
export const ESTIMATED_MASCOT_RATIO = 0.95
