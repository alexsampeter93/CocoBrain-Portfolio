import AreaArt from './AreaArt'

/**
 * El marco de un área del portfolio.
 *
 * Es el único componente que se repite en las cinco, y hace tres cosas: fija el
 * ritmo vertical, declara el acto cromático y pone el encabezado. **Nada más.**
 * El interior de cada área lo compone cada área, porque si las cinco
 * compartieran layout volveríamos a tener cinco bloques idénticos, que es
 * exactamente lo que había antes.
 *
 * ## El encabezado dice de dónde vienes
 *
 * `NODO 03 · PROYECTOS` no es decoración: es la misma etiqueta que lleva el
 * nodo en la escena. Al bajar desde la constelación, lo primero que se lee es
 * el nombre del sitio del que acabas de salir. Es lo que evita que el texto
 * aparezca sin contexto —que el usuario sepa dónde está sin tener que
 * deducirlo—.
 */

/**
 * El filete numerado que abre cada área.
 *
 * Se exporta porque el cierre de contacto lo usa sin ser un área con nodo.
 */
export function SectionHeading({ index, label, lead }) {
  return (
    <header className="max-w-editorial">
      {/*
        ── EL FILETE LLEVA EL ACENTO DEL ACTO ──────────────────────────────

        Iba en `bg-rule`, o sea el gris de los separadores. Medido con
        `scripts/palette.mjs` sobre el editorial, la página daba **90% neutro,
        0% rosa y 0% añil**: los cinco acentos estaban declarados por acto en
        `index.css` y el único sitio donde llegaban a verse era la palabra
        "pendiente".

        Es el mismo filete que ya lleva el nodo de esa área en la escena, así
        que ponerle su color no añade un elemento: hace que el encabezado de la
        sección y el punto de luz del que se viene sean reconociblemente la
        misma cosa. Y le devuelve a la página los dos colores que la identidad
        le asigna.

        El número se queda en el gris de los metadatos: si los dos llevaran
        acento, el encabezado pasaría de tener una nota de color a ser un
        elemento de color, y eso es otra cosa.
      */}
      <p className="flex items-center gap-4 font-meta text-meta uppercase text-ink-faint">
        {index && <span className="tabular-nums">{index}</span>}
        <span aria-hidden="true" className="h-px w-12 bg-accent sm:w-20" />
        <span>{label}</span>
      </p>

      {lead && (
        <p className="mt-block max-w-read text-lead font-light text-ink-soft">{lead}</p>
      )}
    </header>
  )
}

export default function PortfolioSection({ id, act, index, label, title, lead, children }) {
  return (
    <section
      id={id}
      /**
       * El acto va como atributo y no como clase de color.
       *
       * La atmósfera la escribe `Backdrops` en variables CSS interpoladas con
       * el scroll, así que aquí no se elige ningún color: se declara a qué acto
       * pertenece esta área y se deja que el clima llegue solo. Es lo que hace
       * que el paso de un área a otra sea un degradado y no un corte.
       */
      data-act={act}
      // Cada área es una región con nombre: un lector de pantalla puede saltar
      // de una a otra y anunciar cuál es, en vez de leer cinco bloques
      // indistinguibles de texto.
      aria-labelledby={`${id}-title`}
      className="relative scroll-mt-24 px-gutter py-area"
    >
      <AreaArt area={id} />

      <div className="relative mx-auto max-w-editorial">
        <SectionHeading index={index} label={label} />

        {/*
          El título del área a tamaño de cartel. Es el ancla visual de la
          sección: sin algo grande, una página de texto sobre fondo oscuro se
          lee como documentación y no como un portfolio.
        */}
        <h2
          id={`${id}-title`}
          className="mt-block max-w-editorial text-display font-display font-semibold text-ink"
        >
          {title}
        </h2>

        {lead && <p className="mt-8 max-w-read text-lead font-light text-ink-soft">{lead}</p>}

        {children}
      </div>
    </section>
  )
}
