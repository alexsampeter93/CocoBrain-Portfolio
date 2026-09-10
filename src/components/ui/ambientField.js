/**
 * ── LA TOPOGRAFÍA DE COCOBRAIN ──────────────────────────────────────────────
 *
 * El fondo del editorial era un color plano con una ilustración al 8% detrás.
 * Medido en su día con `palette.mjs`: **90% neutro de un solo valor**, o sea
 * pantalla y media de un beige que no es una superficie sino la ausencia de
 * una. El grano le devolvió MATERIA; lo que le sigue faltando es SITIO.
 *
 * Esto son curvas de nivel. No una red neuronal dibujada —eso ya está prohibido
 * en §7, y además dentro del cerebro hay una de verdad que se llevaría la
 * lectura— sino la otra mitad de la idea: **el relieve del terreno por el que
 * se está pasando.** Un mapa topográfico de una mente.
 *
 * ## Por qué curvas de nivel y no "blobs"
 *
 * Porque una curva de nivel dice algo: que hay una altura, que hay una
 * pendiente, que dos puntos cercanos están a distinta profundidad. Tres manchas
 * orgánicas superpuestas no dicen nada — son decoración, que es exactamente lo
 * que este proyecto tiene prohibido. La diferencia se ve en el detalle: las
 * curvas se APIÑAN donde el terreno cae deprisa y se separan donde es llano, y
 * eso el ojo lo lee como volumen aunque no sepa nombrarlo.
 *
 * ## Cómo se generan, y por qué no con marching squares
 *
 * Lo canónico para un mapa de contorno es evaluar un campo escalar en una
 * rejilla y sacar las isolíneas con marching squares. Da curvas correctas y
 * cuesta noventa líneas de encadenar segmentos sueltos.
 *
 * Aquí se hace al revés y sale mejor: cada relieve se declara como una CURVA
 * RADIAL —un radio que varía con el ángulo según una serie de senos— y sus
 * niveles son la misma curva a escalas decrecientes, con los coeficientes
 * ligeramente DERIVADOS en cada anillo. Esa deriva es todo el truco: sin ella
 * los anillos son concéntricos y se leen como una diana; con ella el centro se
 * desplaza y la forma se estrecha por un lado, que es lo que hace una ladera de
 * verdad.
 *
 * Sale determinista, cerrado, suave, y en treinta líneas en vez de noventa.
 *
 * ## Y es DETERMINISTA, como todo lo demás de esta web
 *
 * `Math.random()` está prohibido en la escena desde la fase 5E —la misma
 * posición de scroll tiene que dar el mismo cuadro— y aquí vale igual: dos
 * visitas a la misma página no pueden tener fondos distintos, porque entonces
 * el fondo deja de ser identidad y pasa a ser ruido. El generador lleva su
 * propia semilla y siempre devuelve lo mismo.
 */

/** Congruencial lineal. Determinista, y aquí no hace falta más. */
const seeded = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}

/** El lienzo en el que se generan las curvas. Se estira a la ventana. */
export const FIELD = { w: 1000, h: 1250 }

/**
 * Una polilínea cerrada convertida en curva suave.
 *
 * Catmull-Rom pasando POR los puntos, traducida a cubicas de Bézier — que es
 * lo único que entiende un `path` de SVG. Cerrada de verdad (`Z`), así que no
 * hay costura visible por mucho que se mire.
 */
const smoothClosed = (points) => {
  const n = points.length
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]
    const p1 = points[i]
    const p2 = points[(i + 1) % n]
    const p3 = points[(i + 2) % n]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d + 'Z'
}

/**
 * Los cuatro relieves del campo, y cuántos niveles tiene cada uno.
 *
 * Cuatro y no diez: un mapa con relieve por todas partes es una textura, y una
 * textura no tiene composición. Están repartidos para que el scroll pase por
 * zonas de densidad distinta — hay tramos con curvas y tramos casi llanos, y
 * ese contraste es lo que convierte un patrón en un paisaje.
 *
 * ## Y CABEN LOS CUATRO EN LA FRANJA QUE SE VE
 *
 * Es la corrección de la fase 9B, y es de encuadre, no de dibujo.
 *
 * El lienzo es vertical (1000 × 1250) y se sirve con `slice`, así que en una
 * pantalla apaisada se recorta por arriba y por abajo: a 1920 × 1080 solo se ve
 * la franja central, el 45% del alto. Con los relieves repartidos de 0,12 a
 * 0,90 el primero y el último quedaban SIEMPRE fuera de cuadro en escritorio, y
 * de los otros dos se veían las laderas pero no las cimas. El resultado es que
 * las curvas se leían como vetas largas y no como curvas de nivel — se perdía
 * justo lo que hace que esto sea un mapa: los anillos cerrados.
 *
 * Repartidos entre 0,26 y 0,76 los cuatro caben en esa franja, y en vertical
 * —donde se ve el alto entero— siguen cubriéndola porque el radio de cada uno
 * es casi un tercio del lienzo.
 */
const RELIEFS = [
  { cx: 0.16, cy: 0.26, r: 0.34, rings: 9, seed: 12 },
  { cx: 0.84, cy: 0.4, r: 0.42, rings: 11, seed: 77 },
  { cx: 0.3, cy: 0.6, r: 0.38, rings: 10, seed: 204 },
  { cx: 0.76, cy: 0.76, r: 0.3, rings: 8, seed: 451 },
]

/** Cuántas muestras por anillo. Con 88 no se ve ni un vértice. */
const SAMPLES = 88

/**
 * Devuelve las curvas del campo, cada una con el anillo al que pertenece.
 *
 * `depth` va de 0 —el anillo más exterior, el más lejano— a 1 —el más interior,
 * la cima—. Lo usa la capa para repartirlas en planos: las de fuera casi no se
 * mueven, las de dentro un poco más.
 */
export const buildField = () => {
  const paths = []

  for (const relief of RELIEFS) {
    const rand = seeded(relief.seed)
    // Los cinco armónicos que le dan forma. Amplitudes pequeñas: una curva de
    // nivel es una elipse abollada, no una estrella.
    const harmonics = [2, 3, 4, 5, 7].map((k) => ({
      k,
      amp: (0.34 / k) * (0.45 + rand()),
      phase: rand() * Math.PI * 2,
    }))
    /*
      Hacia dónde se desplaza la cima respecto de la base, y cuánto se aplasta
      la ladera. Los dos empezaron mucho más tímidos —0,34 de deriva y un 0,78
      igual para los cuatro relieves— y la primera captura salió como una
      DIANA: anillos casi concéntricos, que es exactamente lo que este archivo
      dice que hay que evitar. Un cerro real tiene la cumbre descentrada
      respecto de su base y cae distinto por cada lado.
    */
    const driftX = (rand() - 0.5) * 0.86
    const driftY = (rand() - 0.5) * 0.7
    const squash = 0.58 + rand() * 0.5

    for (let ring = 0; ring < relief.rings; ring++) {
      const t = ring / (relief.rings - 1)
      // Los niveles se apiñan hacia la cima: en un mapa real la pendiente
      // crece con la altura, y eso es lo que da la sensación de volumen.
      const scale = 1 - 0.86 * t ** 1.35
      const cx = (relief.cx + driftX * t * t) * FIELD.w
      const cy = (relief.cy + driftY * t * t) * FIELD.h

      const points = []
      for (let i = 0; i < SAMPLES; i++) {
        const a = (i / SAMPLES) * Math.PI * 2
        let rr = 1
        for (const h of harmonics) {
          // La forma se va SUAVIZANDO hacia la cima: los armónicos altos
          // pierden peso, así que el anillo interior es casi una elipse. Es lo
          // que hace un cerro de verdad — abajo la costa es recortada y arriba
          // la cumbre es lisa.
          rr += h.amp * (1 - t * 0.3) * Math.sin(h.k * a + h.phase)
        }
        const radius = relief.r * scale * rr
        points.push([cx + Math.cos(a) * radius * FIELD.w, cy + Math.sin(a) * radius * FIELD.h * squash])
      }

      paths.push({ d: smoothClosed(points), depth: t, cx, cy })
    }
  }

  return paths
}

/**
 * ── LOS NODOS: DONDE EL MAPA SE ACUERDA DE QUE ES UNA MENTE ─────────────────
 *
 * Un punto y un trazo corto, posados sobre una curva de nivel. Seis en toda la
 * página.
 *
 * Son la única concesión figurativa del fondo y por eso son tan pocos: lo que
 * convierte un mapa topográfico en un mapa MENTAL no es llenarlo de nodos, es
 * que haya dos o tres en el sitio exacto. Con veinte volvería a ser el fondo
 * tecnológico de partículas que la dirección de arte prohíbe.
 *
 * Se colocan SOBRE una curva —no flotando— porque un punto sobre una línea se
 * lee como una cota, y una cota es información. Un punto en medio del aire es
 * una mota de polvo.
 */
export const buildNodes = (paths) => {
  const rand = seeded(9317)
  const picks = []
  // Uno por relieve, en un anillo intermedio: ni la costa ni la cima.
  for (let i = 0; i < paths.length; i += Math.floor(paths.length / 6) || 1) {
    if (picks.length >= 6) break
    const path = paths[i]
    if (path.depth < 0.2 || path.depth > 0.75) continue
    const a = rand() * Math.PI * 2
    picks.push({
      x: path.cx + Math.cos(a) * 60,
      y: path.cy + Math.sin(a) * 44,
      // La longitud del trazo que sale del nodo, y hacia dónde.
      dx: Math.cos(a + 0.9) * (26 + rand() * 30),
      dy: Math.sin(a + 0.9) * (18 + rand() * 22),
      depth: path.depth,
    })
  }
  return picks
}
