/**
 * ── EL GRANO Y LA VIÑETA: LO QUE HACE QUE ESTO SEA UNA IMAGEN ─────────────
 *
 * Dos capas fijas por delante de todo, sin animación y sin estado.
 *
 * ## Por qué hace falta
 *
 * Medido con `scripts/palette.mjs` sobre el editorial, el reparto de la página
 * era **90% neutro** con un 10% de coco: un beige de un solo valor ocupando
 * pantalla y media. Un color plano a pantalla completa no se lee como una
 * superficie, se lee como la ausencia de una. Y el problema no se arregla
 * poniendo otra imagen detrás —ya hay una, al 8%— porque lo que falta no es
 * contenido, es MATERIA: la variación de alta frecuencia que distingue el papel
 * de un relleno de color.
 *
 * El grano se la da, y de paso hace algo que ninguna otra capa de esta web
 * puede hacer: **cruza por encima del canvas y del HTML a la vez.** Es el único
 * elemento que comparten el 3D y el editorial, y eso es exactamente lo que los
 * ata en una sola imagen en vez de dejar "un canvas de Three.js con texto
 * encima". Del mismo modo que una película tiene el mismo grano en el plano
 * general y en el primer plano.
 *
 * La viñeta va debajo y con otro trabajo: concentra la mirada en el centro del
 * cuadro, que es donde vive el sujeto en los siete actos —Olaz, el cerebro, la
 * red, la constelación—.
 *
 * ## LO QUE CUESTA, MEDIDO — y cómo se midió mal dos veces
 *
 * Primero esta nota dijo "es gratis: no cambia nunca". Después una comparación
 * con `journey.mjs` pareció desmentirlo —23 frames largos con la capa contra 11
 * sin ella— y la nota pasó a culpar al `mixBlendMode: overlay`, con el
 * razonamiento de que una capa con mezcla obliga a leer el fondo en cada frame.
 *
 * El razonamiento es correcto en general y **aquí no era la causa**: quitada la
 * mezcla, la misma prueba seguía dando 23. Repitiendo tres veces cada variante:
 *
 *     con grano    14  12  18
 *     sin grano    12   9  19
 *
 * Los rangos se solapan enteros. El grano no cuesta nada medible, y los dos
 * primeros números eran **varianza de la herramienta**: `journey.mjs` recorre
 * el viaje entero de una pasada e incluye la primera compilación de cada
 * material, así que una sola ejecución suya no sirve para atribuir un coste.
 * Para eso está `perf.mjs`, que mide en régimen: con la capa puesta da p50 y
 * p95 de 16,7–16,8 ms en los veinte escenarios.
 *
 * La mezcla se queda fuera igualmente: sin ella el resultado visual al 5% es el
 * mismo y la capa deja de depender del soporte de blend modes del compositor.
 *
 * Y la textura no es un archivo: es un `feTurbulence` de SVG en línea, así que
 * no añade ni una petición —la regla de cero peticiones vale también para las
 * propias— ni un byte al presupuesto de carga.
 *
 * ## Los números
 *
 * `TILE` a 200 px es el tamaño del mosaico en píxeles de CSS, no del documento:
 * el grano mide lo mismo en un portátil que en un móvil, que es lo que hace un
 * grano de verdad. `baseFrequency` alta (0,9) da ruido fino, del tamaño de un
 * píxel o dos; más bajo empieza a verse como nubes.
 *
 * El ruido es un gris MEDIO, y eso es lo que le permite funcionar en los dos
 * extremos de la web sin necesitar mezcla: sobre el marfil de la portada
 * oscurece un punto y sobre el negro del interior aclara un punto. Un grano que
 * solo oscureciera desaparecería dentro del cerebro, que es medio recorrido.
 */

/** El mosaico del ruido, en píxeles de CSS. */
const TILE = 200

/**
 * Cuánto grano. Es deliberadamente poco: por encima del 6% deja de leerse como
 * material y empieza a leerse como una textura encima, que es el error que
 * convierte un recurso cinematográfico en un filtro.
 */
const GRAIN = 0.05

const NOISE = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}">` +
    '<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/></filter>' +
    '<rect width="100%" height="100%" filter="url(#n)"/>' +
    '</svg>',
)}")`

/**
 * Interruptor de diagnóstico, como los de §9: `?grain=0`.
 *
 * Existe porque sin poder comparar con y sin, el coste de una capa no se puede
 * atribuir. Y aquí sirvió para lo contrario de lo esperado: para demostrar que
 * la capa NO era la causa de los frames largos que se le habían achacado.
 */
function enabled() {
  if (typeof window === 'undefined') return true
  return new URLSearchParams(window.location.search).get('grain') !== '0'
}

export default function FilmGrain() {
  if (!enabled()) return null

  return (
    <>
      {/*
        La viñeta. Radial y muy abierta —empieza a cerrar en el 55% del radio—
        para que no se lea como un marco. Lo que tiene que notarse es que las
        esquinas pesan menos, no que hay una viñeta.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-30"
        style={{
          background:
            'radial-gradient(120% 100% at 50% 45%, transparent 55%, rgba(20,15,12,0.10) 82%, rgba(20,15,12,0.22) 100%)',
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-30"
        style={{
          backgroundImage: NOISE,
          backgroundSize: `${TILE}px ${TILE}px`,
          opacity: GRAIN,
        }}
      />
    </>
  )
}
