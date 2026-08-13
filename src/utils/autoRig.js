import { Box3, Quaternion, Vector3 } from 'three'

/**
 * Deduce el montaje de una extremidad a partir de su propia geometría.
 *
 * La idea: una extremidad es una pieza alargada. Su eje largo es el hueso, y
 * la articulación está en uno de los dos extremos — el más **fino**, porque
 * el otro lleva la mano o la zapatilla. Con eso ya se sabe dónde va el
 * pivote y hacia dónde apunta la pieza, que es todo lo que hace falta.
 *
 * Sustituye al trabajo de colocar orígenes a mano en Blender.
 */

/** Recorre los vértices de todas las mallas del objeto. */
function forEachVertex(object, callback) {
  const vertex = new Vector3()

  object.traverse((child) => {
    const position = child.isMesh && child.geometry?.attributes?.position
    if (!position) return

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i)
      child.updateWorldMatrix(true, false)
      vertex.applyMatrix4(child.matrixWorld)
      callback(vertex)
    }
  })
}

/**
 * @returns {{ pivot: Vector3, direction: Vector3, length: number }}
 *   `pivot` en coordenadas locales de la pieza, `direction` el vector
 *   unitario que va de la articulación a la punta, y `length` el largo.
 */
export function analysePart(object) {
  const box = new Box3().setFromObject(object)
  const size = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())

  // Eje largo = el hueso.
  const axis = size.x >= size.y && size.x >= size.z ? 0 : size.y >= size.z ? 1 : 2
  const length = size.getComponent(axis)
  const min = box.min.getComponent(axis)
  const max = box.max.getComponent(axis)
  const mid = (min + max) / 2

  // Grosor de cada mitad: se mide la distancia máxima al eje en los otros dos
  // ejes. La mitad más fina es la que se enchufa al cuerpo.
  const others = [0, 1, 2].filter((index) => index !== axis)
  let thicknessLow = 0
  let thicknessHigh = 0

  forEachVertex(object, (vertex) => {
    const along = vertex.getComponent(axis)
    // Solo cuentan los tercios extremos: la parte central es igual en ambos
    // lados y solo aportaría ruido a la comparación.
    const t = (along - min) / (length || 1)
    if (t > 0.33 && t < 0.67) return

    const offset = Math.hypot(
      vertex.getComponent(others[0]) - center.getComponent(others[0]),
      vertex.getComponent(others[1]) - center.getComponent(others[1]),
    )

    if (along < mid) thicknessLow = Math.max(thicknessLow, offset)
    else thicknessHigh = Math.max(thicknessHigh, offset)
  })

  const jointAtLow = thicknessLow <= thicknessHigh

  const pivot = center.clone()
  pivot.setComponent(axis, jointAtLow ? min : max)

  const direction = new Vector3()
  direction.setComponent(axis, jointAtLow ? 1 : -1)

  return { pivot, direction, length }
}

/**
 * Cuaternión que lleva la pieza desde su orientación original a la deseada.
 * `aim` no hace falta normalizarlo: se normaliza aquí.
 */
export function orientationFor(direction, aim) {
  return new Quaternion().setFromUnitVectors(
    direction.clone().normalize(),
    new Vector3(...aim).normalize(),
  )
}
