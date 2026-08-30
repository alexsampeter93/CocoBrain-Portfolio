import { BufferAttribute, BufferGeometry, Vector3 } from 'three'

/**
 * SUBDIVISIÓN PN-TRIANGLES. Cuatro triángulos por cada uno, y los nuevos
 * vértices CURVADOS con las normales que la malla ya trae.
 *
 * ## Por qué esta técnica y no otra
 *
 * El interior del cerebro es la misma malla del `.glb` ampliada al doble y vista
 * desde dentro. Con 58.403 triángulos repartidos por todo el cerebro y la cámara
 * a una unidad de la pared, cada triángulo mide decenas de píxeles: se cuentan
 * uno a uno en las siluetas y en los cantos de las caras grandes. Ni el mapa de
 * normales ni la rugosidad ni la niebla lo arreglan —ya está medido— porque no
 * es un problema de sombreado sino de cuántos triángulos hay.
 *
 * Se descartaron dos caminos antes de este:
 *
 * - **subdividir por punto medio.** Multiplica por cuatro y no cambia NADA de
 *   la silueta: los vértices nuevos caen exactamente sobre las aristas rectas
 *   que había. Más coste, mismo perfil poligonal;
 * - **remallar (remesh).** Redistribuye los vértices, y con ellos las UV. La
 *   textura del cerebro está horneada sobre esas UV, así que se perdería.
 *
 * PN-triangles hace lo que hace falta: coloca cada vértice nuevo sobre una
 * superficie de Bézier construida a partir de las POSICIONES y las NORMALES de
 * los tres vértices del triángulo original. Como las normales del exportado son
 * suaves, esa superficie es la que el sombreado ya estaba fingiendo — o sea que
 * la geometría pasa a tener la forma que las normales prometían.
 *
 * Y **las UV se conservan exactas**, porque dentro de un triángulo la
 * parametrización es lineal: el punto medio de una arista tiene la UV media de
 * sus extremos, sin aproximación. Lo mismo la tangente. No hay nada que
 * rehornear.
 *
 * ## Lo que cuesta
 *
 * Cuatro veces los triángulos, una sola vez, y el original no se toca: la
 * geometría se construye aparte, así que el casco exterior sigue usando la del
 * archivo. Solo la sala interior recibe la densa, y solo en escritorio.
 *
 * Los índices pasan de 16 a 32 bits: con 4x hay más de 65.536 vértices y un
 * `Uint16Array` daría la vuelta en silencio.
 */

/**
 * El punto medio CURVADO de una arista, sobre la Bézier cúbica que definen sus
 * dos extremos y sus dos normales.
 *
 * Los dos puntos de control interiores salen de proyectar cada extremo sobre el
 * plano tangente del otro; el punto en la mitad de la curva es la media
 * ponderada de los cuatro. Es la formula estandar de Vlachos: si las dos
 * normales son iguales —una cara plana— los controles caen en la recta y el
 * resultado es el punto medio de siempre, asi que las zonas planas no se
 * deforman.
 */
const AB = new Vector3()
const C1 = new Vector3()
const C2 = new Vector3()

function curvedMidpoint(pa, na, pb, nb, out) {
  AB.subVectors(pb, pa)

  const wab = AB.dot(na)
  C1.copy(pa).multiplyScalar(2).add(pb).addScaledVector(na, -wab).divideScalar(3)

  const wba = -AB.dot(nb)
  C2.copy(pb).multiplyScalar(2).add(pa).addScaledVector(nb, -wba).divideScalar(3)

  /* Bezier cubica en t = 0,5: (p0 + 3·c1 + 3·c2 + p3) / 8. */
  out
    .copy(pa)
    .addScaledVector(C1, 3)
    .addScaledVector(C2, 3)
    .add(pb)
    .divideScalar(8)
}

const NA = new Vector3()
const NB = new Vector3()

/** La normal en la mitad de la arista, con el termino cuadratico de PN. */
function curvedNormal(pa, na, pb, nb, out) {
  AB.subVectors(pb, pa)
  NA.copy(na).add(nb)

  const denom = AB.dot(AB)
  const v = denom > 1e-12 ? (2 * AB.dot(NA)) / denom : 0

  NB.copy(NA).addScaledVector(AB, -v).normalize()

  /* N(0,5) de la cuadratica: (n0 + 2·n110 + n1) / 4. */
  out.copy(na).addScaledVector(NB, 2).add(nb).normalize()
}

/**
 * @param geometry la geometria de partida. NO se modifica.
 * @returns una geometria nueva con cuatro veces sus triangulos.
 */
export function subdividePN(geometry) {
  const position = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  if (!position || !normal) return null

  const index = geometry.getIndex()
  const triangles = index ? index.count / 3 : position.count / 3
  if (!Number.isInteger(triangles)) return null

  const uv = geometry.getAttribute('uv')
  const tangent = geometry.getAttribute('tangent')

  /* Se parte de los vertices originales y se anaden los de las aristas. */
  const positions = []
  const normals = []
  const uvs = []
  const tangents = []

  for (let i = 0; i < position.count; i += 1) {
    positions.push(position.getX(i), position.getY(i), position.getZ(i))
    normals.push(normal.getX(i), normal.getY(i), normal.getZ(i))
    if (uv) uvs.push(uv.getX(i), uv.getY(i))
    if (tangent) tangents.push(tangent.getX(i), tangent.getY(i), tangent.getZ(i), tangent.getW(i))
  }

  /*
    Cada arista se parte UNA vez y las dos caras que la comparten reutilizan el
    vertice. Sin esta tabla la malla se abriria por todas las costuras.
  */
  const middles = new Map()

  const pa = new Vector3()
  const paN = new Vector3()
  const pb = new Vector3()
  const pbN = new Vector3()
  const mid = new Vector3()
  const midN = new Vector3()

  const edgeVertex = (a, b) => {
    const key = a < b ? a * position.count + b : b * position.count + a
    const found = middles.get(key)
    if (found !== undefined) return found

    pa.fromBufferAttribute(position, a)
    paN.fromBufferAttribute(normal, a)
    pb.fromBufferAttribute(position, b)
    pbN.fromBufferAttribute(normal, b)

    curvedMidpoint(pa, paN, pb, pbN, mid)
    curvedNormal(pa, paN, pb, pbN, midN)

    const at = positions.length / 3
    positions.push(mid.x, mid.y, mid.z)
    normals.push(midN.x, midN.y, midN.z)

    /* Lineales: dentro de un triangulo la parametrizacion lo es. */
    if (uv) {
      uvs.push((uv.getX(a) + uv.getX(b)) / 2, (uv.getY(a) + uv.getY(b)) / 2)
    }
    if (tangent) {
      tangents.push(
        (tangent.getX(a) + tangent.getX(b)) / 2,
        (tangent.getY(a) + tangent.getY(b)) / 2,
        (tangent.getZ(a) + tangent.getZ(b)) / 2,
        tangent.getW(a),
      )
    }

    middles.set(key, at)
    return at
  }

  const indices = new Uint32Array(triangles * 12)
  let out = 0

  for (let t = 0; t < triangles; t += 1) {
    const a = index ? index.getX(t * 3) : t * 3
    const b = index ? index.getX(t * 3 + 1) : t * 3 + 1
    const c = index ? index.getX(t * 3 + 2) : t * 3 + 2

    const ab = edgeVertex(a, b)
    const bc = edgeVertex(b, c)
    const ca = edgeVertex(c, a)

    indices[out++] = a
    indices[out++] = ab
    indices[out++] = ca
    indices[out++] = ab
    indices[out++] = b
    indices[out++] = bc
    indices[out++] = ca
    indices[out++] = bc
    indices[out++] = c
    indices[out++] = ab
    indices[out++] = bc
    indices[out++] = ca
  }

  const dense = new BufferGeometry()
  dense.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  dense.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3))
  if (uv) dense.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
  if (tangent) dense.setAttribute('tangent', new BufferAttribute(new Float32Array(tangents), 4))
  dense.setIndex(new BufferAttribute(indices, 1))
  dense.computeBoundingBox()
  dense.computeBoundingSphere()

  return dense
}
