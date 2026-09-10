/**
 * ── TIPOGRAFÍA QUE ENTRA EN ESCENA ──────────────────────────────────────────
 *
 * Un titular que se desvanece parece una imagen cargando. Uno que sube desde
 * debajo de su propia línea parece tipografía colocándose, que es lo que es.
 *
 * La diferencia son dos elementos: uno recorta y el otro se mueve. El de fuera
 * lleva `overflow: hidden` y no se anima nunca; el de dentro lleva el
 * `data-cue` y es el que la escena empuja. Un dueño por elemento, la ley de la
 * casa.
 *
 * ## Y no es `clip-path`
 *
 * §9 tiene medido que animar una máscara rasteriza la capa entera. Aquí NO se
 * anima ningún recorte: el recorte es estático y lo único que se mueve es un
 * `transform` dentro de él. Misma lectura, coste de compositor.
 *
 * ## EL RECORTE ES DE LA LÍNEA, NUNCA DE LA LETRA
 *
 * Es la regla de la que salen los dos componentes de este archivo, y está
 * escrita porque hacerlo al revés costó una fase entera de titulares cortados.
 *
 * `MaskLetters` ponía `overflow: hidden` en CADA LETRA, y eso ata el recorte a
 * dos medidas que no tienen nada que ver con él:
 *
 * - **al avance del glifo.** Un interletraje NEGATIVO —y un titular de capítulo
 *   lleva `-0.045em`— resta ancho a la caja de la letra, así que la caja mide
 *   menos que el dibujo y el recorte le afeita el costado. Medido contra el
 *   build, en "Zalent" a 175 px: `letter-spacing: -7,87px` y la caja
 *   exactamente 7,87 px más estrecha que el avance. Se cortaban TODAS las
 *   letras por la derecha, no solo alguna;
 * - **a la caja de línea.** Con el interlineado cerrado la caja termina antes
 *   que el dibujo, así que arriba se afeitan los ascendentes —la "t", la "d",
 *   la "f"— y abajo las descendentes. El corte de arriba es el peor de ver,
 *   porque la letra se queda plana a la altura de una mayúscula y parece que la
 *   tipografía es así.
 *
 * Los dos se pueden compensar con relleno y margen negativo, y compensarlos es
 * el error: son dos síntomas de que el recorte está en el sitio equivocado, y
 * cada valor nuevo hay que volver a ajustarlo cada vez que cambia un cuerpo o
 * un interletraje.
 *
 * **El recorte va en la LÍNEA.** Una banda que ocupa el ancho entero y el alto
 * de un renglón, con las letras moviéndose dentro. Entonces:
 *
 * - horizontalmente no hay ningún borde cerca de ninguna letra, así que el
 *   interletraje deja de importar — puede ser el que quiera el diseño;
 * - verticalmente solo hay un borde que ajustar, el de abajo, que es por el que
 *   las letras aparecen. Y es UNO, no uno por letra.
 *
 * Que es además lo que describe el gesto: las letras no salen cada una de su
 * caja, salen todas de la misma línea.
 */

/**
 * El respiro de la banda. Arriba puede ser generoso porque por arriba no entra
 * nada: la banda solo tiene que tapar lo que está POR DEBAJO del renglón. Abajo
 * es el borde por el que la letra aparece, así que es el justo para que quepa
 * una descendente y ni un pelo más.
 *
 * El relleno se resta con un margen negativo: la banda recorta más lejos y
 * ocupa exactamente lo mismo en la maquetación.
 */
const BAND = {
  paddingTop: '0.34em',
  marginTop: '-0.34em',
  paddingBottom: '0.24em',
  marginBottom: '-0.24em',
}

/**
 * El respiro de una máscara de línea suelta. Aquí el contenido es un renglón
 * entero con su interlineado normal, así que el único corte real es el de las
 * descendentes —la "j" de "trabajo", la "y" de "Hoy"—.
 */
const BREATH = { paddingBottom: '0.14em', marginBottom: '-0.14em' }

export function Mask({
  as: Tag = 'span',
  inner: Inner = 'span',
  cue = 'title',
  className = '',
  innerClassName = '',
  /**
   * Cómo se comporta la caja. `block` por defecto —una línea de titular ocupa
   * su renglón— y `inline-block` cuando varias máscaras tienen que convivir en
   * la misma línea.
   *
   * Va como propiedad y no como clase suelta a propósito: `block` e
   * `inline-block` son la MISMA propiedad de CSS, así que pasar la segunda por
   * `className` no gana — depende de cuál escriba Tailwind más abajo en la hoja,
   * que no es algo que se pueda decidir desde aquí.
   */
  display = 'block',
  style,
  children,
  ...rest
}) {
  return (
    <Tag className={`${display} overflow-hidden ${className}`} style={{ ...BREATH, ...style }} {...rest}>
      <Inner data-cue={cue} className={`${display} ${innerClassName}`}>
        {children}
      </Inner>
    </Tag>
  )
}

/**
 * ── EL TITULAR DE UN CAPÍTULO SE COMPONE LETRA A LETRA ──────────────────────
 *
 * `MaskLines` sirve para un titular de varias líneas. Para el nombre de un
 * proyecto no sirve: "Zalent" es UNA palabra, así que partir por líneas o por
 * palabras deja exactamente un trozo y el gesto desaparece.
 *
 * A tamaño de capítulo una palabra ya no es una palabra: es una pieza gráfica.
 * Y una pieza gráfica se COMPONE: cada letra sube desde debajo del renglón con
 * un poco de retraso sobre la anterior, así que lo que se lee no es un texto
 * que aparece sino un rótulo colocándose.
 *
 * **Una banda, no una caja por letra.** Ver la nota de arriba: el recorte lo
 * hace este elemento, que ocupa el renglón entero, y las letras de dentro son
 * cajas normales sin recorte ninguno.
 *
 * ## Y el texto sigue siendo texto
 *
 * Una letra por elemento es exactamente lo que rompe a un lector de pantalla:
 * muchos leen "Z, A, L, E, N, T" o meten una pausa por cada caja. Así que la
 * versión partida va `aria-hidden` y al lado viaja el nombre entero en
 * `sr-only`. Lo que se ve es una composición; lo que se anuncia es una palabra.
 *
 * Se parte por PALABRAS primero y por letras dentro de cada palabra: así una
 * palabra nunca se corta por la mitad al final de una línea.
 */
export function MaskLetters({
  text,
  as: Tag = 'span',
  cue = 'letter',
  className = '',
  letterClassName = '',
  /**
   * Un titular de varias líneas es UN nombre, no tres. Con `silent` la línea
   * no lleva su propia copia `sr-only`: la pone una vez quien las compone, y
   * un lector de pantalla anuncia el nombre entero en vez de tres fragmentos.
   */
  silent = false,
}) {
  const words = String(text).split(' ').filter(Boolean)

  return (
    <Tag className={`block overflow-hidden ${className}`} style={BAND}>
      {!silent && <span className="sr-only">{text}</span>}
      <span aria-hidden="true" className="block">
        {words.map((word, w) => (
          // `inline-flex` mantiene juntas las letras de una palabra, y el
          // margen derecho es el espacio entre palabras — un espacio de verdad
          // se colapsaría entre cajas `inline-block`.
          <span key={`${word}-${w}`} className="inline-flex whitespace-nowrap [&:not(:last-child)]:mr-[0.26em]">
            {[...word].map((letter, i) => (
              <span
                key={`${letter}-${i}`}
                data-cue={cue}
                className={`inline-block ${letterClassName}`}
              >
                {letter}
              </span>
            ))}
          </span>
        ))}
      </span>
    </Tag>
  )
}

export function MaskLines({ lines, as: Tag = 'span', cue = 'title', className = '', lineClassName = '' }) {
  return (
    <Tag className={className}>
      {lines.map((line) => (
        <Mask key={line} cue={cue} className={lineClassName}>
          {line}
        </Mask>
      ))}
    </Tag>
  )
}
