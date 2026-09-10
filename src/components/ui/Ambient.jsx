import { useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { buildField, buildNodes, FIELD } from './ambientField'
import { getTheme, subscribeTheme } from '../../state/theme'

gsap.registerPlugin(ScrollTrigger)

/**
 * ── EL ENTORNO COCOBRAIN ────────────────────────────────────────────────────
 *
 * El editorial se leía sobre un color. Correcto, tranquilo, y de nadie: ese
 * mismo marfil con esa misma tinta lo tiene media internet. Lo que falta para
 * que un fondo sea IDENTIDAD no es más color ni más imagen — es que el sitio
 * por el que se baja **sea un sitio**.
 *
 * Esto es un mapa topográfico. Ver `ambientField.js` para el porqué de las
 * curvas de nivel y de que sean deterministas.
 *
 * ## EL TERRENO ES AHORA EL ENTORNO ENTERO
 *
 * Hasta la fase 9A el campo compartía el fondo con cuatro ilustraciones
 * editoriales, y esas ilustraciones han salido del árbol. El motivo está en el
 * informe de 9A y se resume en que no pertenecían a este mundo: no compartían
 * la paleta —medido, el añil de Experiencia y Habilidades se leía GRIS—, no
 * compartían geometría con nada, y la de Sobre mí era un cerebro literal con
 * una red neuronal dibujada, que es exactamente lo que §7 prohíbe.
 *
 * Con ellas fuera, el terreno pasa a ser lo único que hay debajo del texto. Y
 * eso obliga a que tenga tres cosas que antes no necesitaba: PROFUNDIDAD,
 * ALTURA DE VUELO y LUZ.
 *
 * ## 1 · Tres planos, y por eso se atraviesa en vez de bajar
 *
 * La sensación de "estoy cruzando un espacio" no la da que el fondo se mueva:
 * la da que se mueva MENOS que lo que tienes cerca, y que sus propias capas se
 * muevan distinto entre sí.
 *
 *     LEJOS   las curvas exteriores, la costa del relieve    5 %
 *     MEDIO   las interiores, las que se apiñan en la cima  16 %
 *     CERCA   los nodos y sus trazos                        30 %
 *
 * ## 2 · PERSPECTIVA AÉREA: los tres planos no valen lo mismo
 *
 * Antes los tres se dibujaban con la misma tinta y la profundidad la llevaba
 * solo el desplazamiento. Eso es paralaje, no profundidad: cuatro capas
 * idénticas moviéndose a distinta velocidad siguen leyéndose como cuatro capas.
 *
 * Lo que separa un plano de otro en un paisaje real es que **lo lejano pierde
 * contraste**. Así que la tinta se reparte: el plano lejano al 60% de la
 * densidad del área, el medio al 100% y las cotas al 145%. Es el único cambio,
 * y es el que hace que el campo deje de ser un dibujo plano.
 *
 * Se hace con VALOR y no con desenfoque a propósito. Un `filter: blur()` sobre
 * una capa de pantalla completa cuyo hijo se transforma en cada frame obliga a
 * rasterizarla otra vez en cada frame, que es el error más caro documentado en
 * §9. El valor no cuesta nada.
 *
 * ## 3 · LA ALTURA DE VUELO cambia por zona
 *
 * El mismo terreno visto desde más cerca o desde más lejos. Es lo que convierte
 * seis estados en un RECORRIDO: se empieza a ras de suelo en Sobre mí, se va
 * subiendo hasta la vista más aérea en Habilidades —donde el terreno se lee
 * como un tejido— y se vuelve a bajar para el cierre.
 *
 * **Y solo se AMPLÍA, nunca se reduce por debajo de uno.** El campo tiene
 * cuatro relieves y un tamaño finito: reduciéndolo se destaparían las esquinas
 * vacías del lienzo y lo que se leería es "el dibujo se ha hecho pequeño", que
 * es justo lo contrario de volar más alto. Ampliando solo se recorta, así que
 * nunca hay un borde que ver. `lift: 1` es la vista más alta que este campo
 * puede dar.
 *
 * El trazo NO crece con la escala (`vectorEffect="non-scaling-stroke"`), y eso
 * no es un detalle técnico: en un mapa el grosor de la línea es una convención
 * de lectura, no una medida del terreno. Al subir, las curvas se hacen más
 * pequeñas y más juntas con el mismo trazo — que es exactamente lo que se ve
 * desde un avión.
 *
 * ## 4 · LA LUZ
 *
 * El fondo de página era un color plano: medido en las seis zonas, exactamente
 * el mismo `rgb(245, 230, 211)`. Un color plano no tiene dirección, así que el
 * espacio no tenía de dónde venir la luz.
 *
 * Son dos manchas muy grandes y muy suaves —una CLAVE cálida y una SOMBRA— que
 * cambian de sitio y de fuerza en cada zona. No es un degradado por sección: es
 * la misma luz moviéndose alrededor del mismo terreno.
 *
 * **Y se mueven con `transform` y `opacity`, nunca cambiando el degradado.** Un
 * `background-image` no interpola, así que una transición de color obligaría a
 * repintar una capa de pantalla completa en cada frame durante segundo y medio.
 * Dos manchas con posición y opacidad propias dan lo mismo y las resuelve el
 * compositor. La sombra son DOS manchas —coco y añil— que se cruzan por
 * opacidad, que es la forma de cambiar de temperatura sin repintar nada.
 *
 * ## Un dueño por propiedad, otra vez
 *
 * GSAP escribe `transform` en los tres planos y **nadie más lo toca**. La
 * densidad la escribe la envoltura de cada plano —otro elemento— y la altura de
 * vuelo el grupo de estado, que es un tercero. Sin esa separación, el cambio de
 * área daría un salto en el desplazamiento cada vez que React volviera a
 * pintar.
 */

/**
 * ── LOS SEIS ESTADOS DEL ENTORNO ────────────────────────────────────────────
 *
 * No son seis fondos: es un campo que EVOLUCIONA. Las curvas son las mismas en
 * toda la página —el terreno no cambia porque cambie de qué se habla— y lo que
 * se mueve son cuatro cosas: de qué color está dibujado, cuánto se ve, desde
 * qué altura y de dónde le entra la luz.
 *
 *     zona          tinta   densidad  altura   la luz entra desde
 *     ─────────────────────────────────────────────────────────────
 *     Sobre mí      coco      media    la más   arriba y por la izquierda,
 *                                      baja     que es el lado del texto
 *     Proyectos     coco       baja    media    arriba y por la derecha:
 *                   claro                       es el mediodía de la web
 *     Experiencia   añil      media     alta    de costado, ya fría
 *     Habilidades   añil     la más   la más    cenital y plana: desde
 *                             alta     alta     arriba no hay sombra larga
 *     CV            coco   la más baja  media   casi frontal, luz de mesa
 *     Contacto      coco      media     baja    por detrás del sujeto,
 *                   claro                       cálida: es el anochecer
 *
 * **Proyectos es de las más tenues a propósito.** Es la zona con más contenido
 * —tres portadas, tres abanicos y tres casos— y el terreno ahí tiene que estar
 * debajo, no al lado. La composición de 8E manda.
 *
 * **Y Habilidades tiene el doble de densidad que el CV.** Esa diferencia es lo
 * único que hace falta para que dos áreas seguidas se sientan sitios distintos
 * sin que ninguna deje de pertenecer al mismo mundo.
 *
 * **9B.2 — Sobre mí y Contacto llevan además un contraste de luz distinto.**
 * No es que uno tenga más luz que el otro: los dos mueven su clave casi igual
 * (0,88 contra 0,84). Lo que cambia es la SOMBRA — la mañana la baja (0,48,
 * menos contraste, luz más repartida) y el anochecer la sube (0,63, más
 * contraste, como una luz baja y a contraluz). Es el único ajuste de esta
 * fase: los otros cuatro estados no se han tocado.
 *
 * `lift` — la altura de vuelo. 1 es lo más alto que da el campo; cuanto mayor,
 * más cerca del suelo. Ver arriba por qué nunca baja de uno.
 *
 * `key` / `shade` — dónde está cada mancha de luz, en porcentaje de la ventana
 * medido DESDE EL CENTRO, con su escala y su fuerza. `hue` elige cuál de las
 * dos sombras se enciende.
 */
/**
 * De la tinta de dia a la tinta de noche. Ver la nota de `state`, abajo.
 */
const NIGHT_TINT = {
  '#6B4530': '#C99B6E',
  '#8A5A3C': '#D69A6E',
  '#2C4A73': '#8FA8D0',
}

const STATES = {
  about: {
    tint: '#6B4530',
    ink: 0.1,
    lift: 1.4,
    /* 9B.2: la mañana entra un poco más limpia — la clave sube una nada y la
       sombra baja, así que hay menos contraste que al anochecer. */
    key: { x: -30, y: -26, s: 1, a: 0.88 },
    shade: { x: 34, y: 30, s: 1.1, a: 0.48, hue: 'coco' },
  },
  work: {
    tint: '#8A5A3C',
    ink: 0.07,
    lift: 1.22,
    key: { x: 26, y: -30, s: 1.05, a: 0.7 },
    shade: { x: -30, y: 26, s: 1, a: 0.34, hue: 'coco' },
  },
  experience: {
    tint: '#2C4A73',
    ink: 0.095,
    lift: 1.1,
    key: { x: 34, y: -10, s: 1, a: 0.62 },
    shade: { x: -28, y: 22, s: 1.05, a: 0.5, hue: 'indigo' },
  },
  skills: {
    tint: '#2C4A73',
    ink: 0.1,
    lift: 1,
    key: { x: 0, y: -34, s: 1.15, a: 0.52 },
    shade: { x: 0, y: 30, s: 1.25, a: 0.58, hue: 'indigo' },
  },
  cv: {
    tint: '#6B4530',
    ink: 0.042,
    lift: 1.16,
    key: { x: 0, y: -14, s: 1.2, a: 0.4 },
    shade: { x: 22, y: 26, s: 0.9, a: 0.2, hue: 'coco' },
  },
  contacto: {
    tint: '#8A5A3C',
    ink: 0.085,
    lift: 1.32,
    /* 9B.2: el anochecer sube la clave un poco más que la mañana y sube la
       sombra en vez de bajarla — más contraste, como luz baja y de espaldas.
       Es el único par que se ha tocado; los otros cuatro estados no cambian. */
    key: { x: 22, y: 24, s: 0.95, a: 0.84 },
    shade: { x: -28, y: -24, s: 1.1, a: 0.63, hue: 'coco' },
  },
}

/** Antes de la primera área —el umbral— el campo llega ya con su estado. */
const DEFAULT_STATE = STATES.about

/** Cuánto se desplaza cada plano en todo el editorial, en % del campo. */
const DRIFT = { far: 5, mid: 16, near: 30 }

/**
 * Cuánta de la densidad del área se lleva cada plano. Es la perspectiva aérea:
 * lo lejano pierde contraste y lo cercano lo gana.
 */
const DEPTH = { far: 0.6, mid: 1, near: 1.45 }

/** Una mancha de luz: su sitio, su tamaño y su fuerza, listos para el estilo. */
const lamp = ({ x, y, s, a }, on = true) => ({
  transform: `translate3d(${x}vw, ${y}vh, 0) scale(${s})`,
  opacity: on ? a : 0,
})

export default function Ambient({ area }) {
  const root = useRef(null)
  const far = useRef(null)
  const mid = useRef(null)
  const near = useRef(null)
  const reduced = usePrefersReducedMotion()

  /*
    El campo se calcula UNA vez por sesión y no depende de nada: mismas curvas
    en cada visita, en cada pantalla y en cada recarga. Un fondo que cambia
    entre visitas no es identidad, es ruido — la misma razón por la que la
    escena no puede llevar `Math.random()`.
  */
  const { paths, nodes } = useMemo(() => {
    const built = buildField()
    return { paths: built, nodes: buildNodes(built) }
  }, [])

  useLayoutEffect(() => {
    const el = root.current
    if (!el || reduced) return

    const ctx = gsap.context(() => {
      const main = document.querySelector('main')
      if (!main) return

      /*
        ── EL CAMPO LLEGA EN EL UMBRAL ─────────────────────────────────────

        Durante el recorrido 3D no se ve: ahí manda la escena, y un mapa
        topográfico detrás de la mente sería una segunda cosa que mirar en el
        único tramo de la web donde la dirección de arte pide lo contrario.

        Entra donde entra el editorial y con la misma señal que ya usa todo lo
        demás en ese punto: la retirada de la escena. Ver §8, "El umbral".
      */
      gsap.fromTo(
        el,
        { opacity: 0 },
        {
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: main,
            start: 'top bottom',
            end: 'top 55%',
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        },
      )

      /*
        Y los tres planos se separan a lo largo de toda la lectura. Un solo
        disparador para los tres: es el mismo recorrido, y tres disparadores
        con la misma ventana serían tres formas de calcular lo mismo.
      */
      const planes = [
        [far.current, DRIFT.far],
        [mid.current, DRIFT.mid],
        [near.current, DRIFT.near],
      ]
      const drift = gsap.timeline({
        scrollTrigger: {
          trigger: main,
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      })
      for (const [node, amount] of planes) {
        if (!node) continue
        // `fromTo` con los dos extremos declarados, como todo en esta web
        // desde la fase 7B: un `from` grabaría como destino lo que el elemento
        // tuviera encima en el momento de dibujarse por primera vez.
        drift.fromTo(
          node,
          { yPercent: amount * 0.5, y: 0 },
          { yPercent: -amount * 0.5, y: 0, ease: 'none', duration: 1 },
          0,
        )
      }
    }, el)

    return () => ctx.revert()
  }, [reduced])

  /**
   * ── EL TERRENO TOMA SU COLOR EN EL REGISTRO DE LA MENTE (fase 11D) ─────
   *
   * Las tintas de `STATES` son coco y anil OSCUROS: dibujan curvas de nivel
   * sobre marfil. Sobre el anil noche no se ven -son mas oscuras que el
   * suelo- asi que en modo noche cada area toma el MISMO color de la paleta
   * en su version clara, que es la que la mente usa cuando el fondo es
   * oscuro. No se estrena ni un color: es exactamente el mismo movimiento
   * que hizo 10D con el acento del area oscura.
   *
   *     #6B4530  coco          ->  #C99B6E  coco claro del acto 1
   *     #8A5A3C  coco medio    ->  #D69A6E  el coco de los nodos
   *     #2C4A73  anil marca    ->  #8FA8D0  el anil de la mente
   *
   * Y el TEMA se lee por estado, no por ref: aqui no hay bucle por frame
   * -el estado de area es un evento discreto, como el indice del HUD- asi
   * que un render de mas al cambiar de tema es exactamente lo que hace falta
   * para que el SVG se repinte.
   */
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => 'light')
  const base = STATES[area] ?? DEFAULT_STATE
  const state = theme === 'dark' ? { ...base, tint: NIGHT_TINT[base.tint] ?? base.tint } : base

  return (
    <div
      ref={root}
      aria-hidden="true"
      style={{ opacity: reduced ? 1 : 0 }}
      /*
        Detrás del canvas y delante del color plano. Ahí es donde tiene que
        estar: el campo es parte del MUNDO, no de la interfaz, así que lo que
        quede de escena durante la lectura —ese 6% que el manual conserva a
        propósito— se dibuja por delante de él y los dos se leen como una sola
        profundidad.
      */
      className="ambient pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/*
        ── LA LUZ ────────────────────────────────────────────────────────────

        Va DEBAJO de las curvas: el terreno está dibujado sobre el suelo, y el
        suelo es lo que se ilumina. Encima de las curvas sería un velo.

        Las tres manchas existen siempre y ninguna se monta ni se desmonta: lo
        que cambia es dónde están y cuánto valen. Es la misma ley que el resto
        del entorno — nada aparece, todo cambia de estado.
      */}
      <div className="ambient-light">
        <span className="ambient-lamp ambient-key" style={lamp(state.key)} />
        <span
          className="ambient-lamp ambient-shade-coco"
          style={lamp(state.shade, state.shade.hue === 'coco')}
        />
        <span
          className="ambient-lamp ambient-shade-indigo"
          style={lamp(state.shade, state.shade.hue === 'indigo')}
        />
      </div>

      <svg
        className="ambient-svg h-full w-full"
        viewBox={`0 0 ${FIELD.w} ${FIELD.h}`}
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {/*
          El color y la altura de vuelo viven en el grupo, no en cada trazo: son
          decenas de curvas y escribir el estado en cada una sería escribir el
          mismo dato cuarenta veces. `currentColor` lo reparte solo.

          La transición va en CSS, no en GSAP: un cambio de área es un evento
          DISCRETO —o estás en una o estás en la otra— igual que el índice del
          HUD, así que no hay ninguna posición de scroll a la que atarlo. Se
          extingue sola y en reposo no corre nada.

          `transformBox: view-box` para que la escala gire alrededor del centro
          del lienzo y no del origen del sistema de coordenadas del SVG, que
          está en la esquina.
        */}
        <g
          className="ambient-state"
          style={{
            color: state.tint,
            transform: `scale(${state.lift})`,
            transformBox: 'view-box',
            transformOrigin: 'center',
          }}
        >
          {/*
            ── LEJOS · la costa del relieve ──────────────────────────────────

            Las curvas exteriores, que son las que abarcan más y las que menos
            se mueven. Van más finas que las de dentro: en un mapa, la línea
            fina es la cota intermedia y la gruesa es la maestra, y respetarlo
            es lo que hace que esto se lea como cartografía y no como un
            patrón decorativo.

            Y van al 60% de la densidad del área. Es la perspectiva aérea: lo
            que está lejos pierde contraste.
          */}
          <g className="ambient-depth" style={{ opacity: state.ink * DEPTH.far }}>
            <g ref={far} className="ambient-plane">
              {paths
                .filter((p) => p.depth < 0.45)
                .map((p, i) => (
                  <path
                    key={`f${i}`}
                    d={p.d}
                    stroke="currentColor"
                    strokeWidth={0.9}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
            </g>
          </g>

          {/* ── MEDIO · lo que se apiña hacia la cima ── */}
          <g className="ambient-depth" style={{ opacity: state.ink * DEPTH.mid }}>
            <g ref={mid} className="ambient-plane">
              {paths
                .filter((p) => p.depth >= 0.45)
                .map((p, i) => (
                  <path
                    key={`m${i}`}
                    d={p.d}
                    stroke="currentColor"
                    strokeWidth={1.3}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
            </g>
          </g>

          {/*
            ── CERCA · las cotas ─────────────────────────────────────────────

            Seis puntos con su trazo, posados sobre una curva. Son lo único
            figurativo del fondo y por eso son seis: lo que convierte un mapa
            del terreno en un mapa MENTAL no es llenarlo de nodos, es que haya
            dos o tres en el sitio exacto.

            Al 145% de la densidad: son lo más cercano que hay en el campo, y
            en un paisaje lo cercano es lo que más contrasta.
          */}
          <g className="ambient-depth" style={{ opacity: state.ink * DEPTH.near }}>
            <g ref={near} className="ambient-plane ambient-marks">
              {nodes.map((n, i) => (
                <g key={`n${i}`}>
                  <line
                    x1={n.x}
                    y1={n.y}
                    x2={n.x + n.dx}
                    y2={n.y + n.dy}
                    stroke="currentColor"
                    strokeWidth={1.1}
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle cx={n.x} cy={n.y} r={3.4} fill="currentColor" />
                </g>
              ))}
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}
