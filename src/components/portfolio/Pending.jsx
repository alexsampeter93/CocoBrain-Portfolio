/**
 * Lo que falta, dicho en voz alta.
 *
 * ## Por qué esto existe en vez de texto de relleno
 *
 * La tentación al maquetar un portfolio vacío es escribir *lorem ipsum* o, peor,
 * inventar un proyecto plausible para que la página "se vea". Las dos cosas
 * hacen lo mismo: esconden el trabajo que queda. Se llega a la víspera de
 * publicar creyendo que solo falta revisar y resulta que falta escribirlo todo.
 *
 * Así que el hueco se dibuja, se mide y se etiqueta. La composición se puede
 * juzgar hoy —que es para lo que sirve maquetar sin contenido— y de un vistazo
 * se ve exactamente qué queda por escribir.
 *
 * Nada de esto llega a producción con contenido dentro: cuando el dato existe,
 * el componente que lo pinta sustituye a este.
 */

/** Un bloque de texto que todavía no está escrito. */
export function PendingText({ label, lines = 3 }) {
  return (
    <div className="max-w-read" role="note">
      <p className="font-meta text-meta uppercase text-accent/70">pendiente · {label}</p>

      <div aria-hidden="true" className="mt-5 space-y-3">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className="h-px bg-rule"
            // Las líneas decrecen como decrece un párrafo real: si todas
            // midieran igual, el hueco no diría nada sobre lo que va dentro.
            style={{ width: `${100 - i * 11}%` }}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * El hueco de un medio: captura, vídeo o el objeto 3D de un proyecto.
 *
 * Reserva la PROPORCIÓN, que es lo único que hay que decidir ahora. Cuando
 * llegue la imagen entra sin mover una línea de la maquetación, y hasta
 * entonces la composición ya se puede juzgar con el peso visual correcto.
 *
 * `kind` no cambia el aspecto todavía, solo lo que dice la etiqueta. Sirve para
 * ir anotando qué tipo de pieza pide cada sitio: es la lista de lo que habrá
 * que producir.
 */
export function PendingMedia({ ratio = '16 / 9', kind = 'imagen', note }) {
  return (
    <figure
      className="relative w-full overflow-hidden border border-rule"
      style={{ aspectRatio: ratio }}
    >
      {/*
        Sin degradado ni patrón: un hueco vacío tiene que parecer un hueco
        vacío. En cuanto se le pone textura empieza a parecer una decisión de
        diseño y deja de pedir que lo rellenen.
      */}
      <figcaption className="absolute bottom-0 left-0 p-5 font-meta text-meta uppercase text-ink-faint">
        <span className="text-accent/70">{kind}</span>
        {note && <span className="ml-3 normal-case tracking-normal">{note}</span>}
      </figcaption>
    </figure>
  )
}

/**
 * Un área entera sin contenido. Dice cuántas entradas espera y de qué tipo, que
 * es la información útil cuando lo que falta es la lista completa.
 */
export function PendingList({ label, note }) {
  return (
    <div className="border-l border-rule py-2 pl-6" role="note">
      <p className="font-meta text-meta uppercase text-accent/70">pendiente · {label}</p>
      {note && <p className="mt-3 max-w-read text-body text-ink-faint">{note}</p>}
    </div>
  )
}
