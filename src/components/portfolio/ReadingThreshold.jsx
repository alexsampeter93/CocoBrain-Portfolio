import AreaArt from './AreaArt'

/**
 * El paso de explorar a leer.
 *
 * ## El problema que resuelve
 *
 * Antes aquí no había nada: la pista del recorrido terminaba y empezaba un
 * `<main>` con un borde superior y fondo crema. Ese borde era el momento exacto
 * en el que la web dejaba de ser una experiencia y pasaba a ser una página. No
 * importa lo buena que sea la escena si el aterrizaje dice "aquí se acabó lo
 * interesante".
 *
 * Lo que hay ahora es un cambio de acto. Un tramo alto y casi vacío, donde la
 * escena sigue viva por detrás pero ya atenuada, con una sola línea que anuncia
 * lo que viene y un trazo vertical que desciende. El mismo recurso que separa
 * dos partes de una película: no se corta, se respira.
 *
 * El aire es el contenido. Poner aquí cualquier otra cosa —un botón de "ver
 * proyectos", tres tarjetas de resumen— destruiría el efecto: convertiría una
 * pausa en un índice.
 */
export default function ReadingThreshold() {
  return (
    <section
      data-act="3"
      /**
       * 140vh, el doble de lo que medía. No es aire de más: es la duración de
       * la transición.
       *
       * `journey.reading` está normalizado sobre todo el editorial, así que lo
       * que dura el paso de la mente a la lectura no lo decide una constante de
       * tiempo —no hay ninguna—, lo decide CUÁNTA PÁGINA ocupa este tramo. A
       * 70vh el fondo terminaba de pasar de negro a marfil en media pantalla de
       * scroll y prácticamente no se veía; a 140vh ocupa pantalla y media y se
       * ve perfectamente que el mundo está cambiando mientras cambia.
       *
       * Es el sitio correcto para gastar ese scroll: aquí no hay nada que leer
       * más que dos frases, así que el tiempo se lo lleva entero la imagen.
       */
      className="relative flex min-h-[140vh] items-center px-gutter"
      aria-hidden="true"
    >
      <AreaArt area="threshold" />

      <div className="relative mx-auto w-full max-w-editorial">
        <p className="font-meta text-meta uppercase text-ink-faint">
          Has recorrido la mente
        </p>

        <p className="mt-6 max-w-read text-title font-display font-light text-ink">
          Ahora el trabajo.
        </p>

        {/*
          El trazo que baja. Es el mismo gesto que une los nodos de la red, y
          aquí une los dos actos de la web: lo que se explora y lo que se lee.
        */}
        <span className="mt-block block h-24 w-px bg-rule" />
      </div>
    </section>
  )
}
