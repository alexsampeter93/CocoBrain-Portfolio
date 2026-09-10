import { useLayoutEffect, useRef } from 'react'
import PortfolioSection from './PortfolioSection'
import EditorialObject from './EditorialObject'
import { PendingList } from './Pending'
import { skillGroups, strengths } from '../../data/portfolio'
import { useSectionExit } from '../../animations/motion'
import { useScene } from '../../animations/editorial'
 import { knowledgeById } from '../../data/network'
import { knowledge } from '../../data/knowledge'
import { groupIcon } from '../../data/icons'
import { Icon } from '../ui/Icon'

/**
 * HABILIDADES — la red, para quien no quiera recorrer la red.
 *
 * ## Los dos ejes, otra vez
 *
 * Esta sección agrupa por CATEGORÍA PROFESIONAL —Frontend, Backend, Bases de
 * datos— y la escena agrupa por FAMILIA TÉCNICA, que es la que decide el color
 * de cada nodo. Son dos clasificaciones distintas del mismo conjunto y ninguna
 * sustituye a la otra: React es `framework` para la escena y "Frontend" para
 * quien lee un currículum.
 *
 * Por eso los grupos viven en `portfolio.js` y no en `knowledge.js`, y por eso
 * `kind` no se toca. Cada grupo NOMBRA ids de la red; la red no sabe que estos
 * grupos existen.
 *
 * ## Qué pasa mientras no haya grupos
 *
 * Sin grupos definidos no se inventa una clasificación: se enseña la red entera
 * tal cual está, ordenada por peso, y se dice claramente que la agrupación
 * profesional está pendiente. Es información verdadera —esos conocimientos
 * existen y están en la escena— presentada sin fingir una estructura que nadie
 * ha decidido.
 *
 * ## FASE 5B: un tercer bloque, para lo que no es una tecnología
 *
 * `strengths` es el otro eje de esta misma área: fortalezas —resolución de
 * problemas, aprendizaje, trabajo en equipo…— que no tienen ninguna relación
 * con el grafo. Van debajo, como una sección propia y con su propio hueco
 * pendiente, para que "tecnología" y "forma de trabajar" no se lean como la
 * misma lista. Ninguna fortaleza se ha asumido: el array llega vacío.
 */


/**
 * ── EL CAMPO DE TECNOLOGÍAS ─────────────────────────────────────────────────
 *
 * Esto era una tabla: seis filas, cada una con su nombre a la izquierda y sus
 * tecnologías en una lista a la derecha. Se leía bien y no se recordaba, que es
 * exactamente el problema de una tabla.
 *
 * Ahora la sección es UNA sola composición con dos piezas que se hablan:
 *
 *     ÍNDICE            las seis familias, en el margen, numeradas
 *     CAMPO             las veintiséis tecnologías, grandes, en un bloque
 *                       continuo separadas por un punto medio
 *
 * Las tecnologías dejan de estar repartidas en cajas y pasan a ser el TEXTO de
 * la sección. Puestas seguidas y a cuerpo de titular, veintiséis nombres ocupan
 * media pantalla y se leen como un párrafo — que es lo que son: el inventario
 * de con qué trabaja alguien.
 *
 * ## La interacción es la que hace que explorar tenga sentido
 *
 * Señalar una FAMILIA enciende sus tecnologías y apaga el resto: el campo
 * revela su estructura sin que haya que dibujarla con líneas ni con cajas.
 * Señalar una TECNOLOGÍA hace lo simétrico — se enciende ella y se enciende su
 * familia en el índice, así que se puede entrar por cualquiera de los dos
 * lados.
 *
 * Es la misma idea que la red del cerebro: las relaciones no se dibujan, se
 * encienden.
 *
 * ## FASE 12B — UN ICONO POR FAMILIA, NUNCA UNO POR TECNOLOGÍA
 *
 * Lo evidente era poner el logotipo de cada tecnología al lado de su nombre:
 * React, Rust, MySQL. Se descarta, y por tres motivos que no son de gusto:
 *
 * - **serían otro sistema.** Los logotipos de marca son macizos, van en
 *   colores ajenos y no siguen `currentColor`, así que no se enterarían del
 *   suelo ni del tema —§7 tiene documentado lo que le costó al HUD llevar un
 *   hexadecimal escrito a mano— y romperían de golpe las cuatro decisiones
 *   que hacen que los iconos de esta web se lean como una sola familia;
 * - **devolverían la tabla.** Veintiséis marcas alineadas con sus nombres son
 *   una rejilla de fichas, que es EXACTAMENTE la composición que este campo
 *   existe para haber sustituido. Las tecnologías son el TEXTO de la sección
 *   y un texto no lleva un icono cada tres palabras;
 * - **y no son de Alex.** Son marcas registradas de terceros, y esta web no
 *   publica material con dueño que no se haya decidido publicar.
 *
 * El icono va donde sí añade algo: en el ÍNDICE, que es la única parte de la
 * composición que ya era una lista corta de categorías. Seis trazos que dicen
 * de qué va cada familia, y el campo se queda como estaba.
 *
 * Y hay un motivo de lectura además del de sistema: el índice es lo que se
 * queda en pantalla cuando el campo se retira hacia él al salir de la sección
 * —la costura con el CV—. Lo que sobrevive a esa retirada ya no es solo una
 * columna de palabras: es la estructura, dibujada.
 *
 * ## Un solo manejador para veintiséis elementos
 *
 * Va por delegación en el contenedor y escribiendo un atributo, no por estado
 * de React: con un manejador por tecnología serían veintiséis suscripciones y
 * otros tantos renderizados del árbol por cada píxel que se mueve el ratón.
 * Aquí se escribe `data-active` en el contenedor y el resto lo resuelve la hoja
 * de estilos.
 *
 * Y funciona con TECLADO: los mismos elementos responden a `focus`, así que la
 * exploración no depende de tener puntero.
 */
/**
 * ── EL RITMO DEL CAMPO ──────────────────────────────────────────────────────
 *
 * La espina se traza, el índice de familias baja uno a uno y las veintiséis
 * tecnologías entran DESPUÉS y muy escalonadas: cuatro centésimas entre una y
 * la siguiente, que a lo largo de veintiséis piezas es medio recorrido de la
 * secuencia. No es una lluvia de palabras —cada una viaja diez píxeles— pero el
 * campo deja de encenderse de golpe y pasa a escribirse.
 *
 * El orden importa: primero la ESTRUCTURA (la espina y las seis familias) y
 * después el detalle. Es exactamente el mismo orden con el que se descubre la
 * red dentro del cerebro, que es de donde vienen estos veintiséis nombres.
 */
const FIELD_CUES = {
  rule: { at: 0, from: { scaleY: 0, transformOrigin: 'top center' }, dur: 0.8 },
  meta: { at: 0.12, from: { y: 10, opacity: 0 }, stagger: 0.07, dur: 0.6 },
  object: { at: 0.5, from: { opacity: 0, scale: 0.9 }, dur: 0.9 },
  body: { at: 0.3, from: { y: 10, opacity: 0 }, stagger: 0.04, dur: 0.7 },
}

function TechField({ groups }) {
  const field = useRef(null)

  /*
    ── EL CAMPO SE RETIRA HACIA SU ÍNDICE ─────────────────────────────────

    Al salir de Habilidades, las veintiséis tecnologías pierden densidad y se
    recogen HACIA LA IZQUIERDA, que es donde está el índice de familias. El
    índice no se mueve.

    Lo que queda en pantalla al abandonar la sección es, literalmente, la
    estructura: seis familias numeradas en una columna. Y justo debajo empieza
    el hilo que baja hacia el CV, donde al llegar gira y se convierte en el
    filete que abre el documento.

    Conocimiento → orden → síntesis. Sin duplicar un dato ni dibujar una
    metáfora encima: es el mismo material perdiendo lo accesorio.
  */
  const exit = useSectionExit({ pull: -34 })
  // El hilo que llega de Experiencia y enhebra el índice.
  /* Y el campo entero se monta: espina, índice, tecnologías, neurona. */
  const scene = useScene({ cues: FIELD_CUES, start: 'top 82%', end: 'top 22%' })

  /*
    El campo se lee como texto pero es una lista: cada tecnología es un `<li>`
    dentro del `<ul>` de su familia, y las familias van en un `<ul>` mayor. Lo
    que hace que se lea seguido es la maquetación, no el marcado — un lector de
    pantalla sigue oyendo seis listas con sus nombres.
  */
  useLayoutEffect(() => {
    const root = field.current
    if (!root) return

    const set = (id) => {
      if (id) root.dataset.active = id
      else delete root.dataset.active
    }
    const read = (event) => event.target.closest('[data-group]')?.dataset.group ?? null

    const over = (event) => set(read(event))
    const out = (event) => {
      // Solo se apaga si el puntero sale del campo entero, no al pasar de una
      // tecnología a la de al lado: si no, el campo parpadea al recorrerlo.
      if (!root.contains(event.relatedTarget)) set(null)
    }

    root.addEventListener('pointerover', over)
    root.addEventListener('pointerout', out)
    root.addEventListener('focusin', over)
    root.addEventListener('focusout', out)
    return () => {
      root.removeEventListener('pointerover', over)
      root.removeEventListener('pointerout', out)
      root.removeEventListener('focusin', over)
      root.removeEventListener('focusout', out)
    }
  }, [])

  return (
    /* Dos dueños sobre el mismo nodo y ninguno se pisa: uno lo usa para
       delegar el puntero y el otro para montar la escena. Ninguno de los dos
       escribe estilos, así que aquí no hace falta una envoltura. */
    <div
      ref={(node) => {
        field.current = node
        scene.current = node
      }}
      className="tech-field grid gap-block lg:grid-cols-12"
    >
      {/*
        ── EL ÍNDICE ─────────────────────────────────────────────────────

        Seis familias numeradas, pegadas mientras se recorre el campo. No es
        una navegación —no lleva a ninguna parte— es una LEYENDA: dice qué
        familias hay y sirve para encenderlas.
      */}
      <div className="lg:col-span-3">
        <div className="relative lg:sticky lg:top-28">
          {/*
            ── EL HILO DE LA TRAYECTORIA LLEGA AL ÍNDICE ──────────────────

            Es la unión con Experiencia, que es la sección de antes. Allí un
            trazo vertical enhebra los cuatro puestos; aquí ese mismo trazo
            baja por el costado del índice y lo enhebra a él.

            Lo que se lee es que la línea no se acaba: cambia de contenido.
            Deja de encadenar sitios donde has estado y pasa a encadenar
            familias de lo que sabes. Trayectoria → conocimiento ordenado.
          */}
          <span
            data-cue="rule"
            aria-hidden="true"
            className="pointer-events-none absolute -left-8 top-1 hidden h-full w-px bg-rule lg:block"
          />
          <ul className="space-y-4">
            {groups.map((group, i) => {
              const glyph = groupIcon(group.id)
              return (
                <li key={group.id}>
                  <span
                    data-group={group.id}
                    tabIndex={0}
                    data-cue="meta"
                    className="tech-family flex items-center gap-3 font-meta text-meta uppercase text-ink-faint"
                  >
                    <span className="tabular-nums opacity-50">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {/*
                      El trazo va entre el folio y el nombre, y ese orden
                      importa: se lee FORMA y después PALABRA, que es el
                      sentido en el que un icono sirve de algo. Detrás del
                      nombre sería una viñeta.

                      No lleva color propio —`currentColor`, como todos— así
                      que se enciende en el acento con su familia sin una sola
                      regla nueva, y el nombre sigue siendo `span:last-child`
                      para la transición que ya existía.

                      Y NO lleva opacidad propia. La llevó —un 70%— y medido
                      en píxel sobre el build daba **2,92 : 1** en reposo
                      sobre marfil, por debajo del 3 que WCAG pide a un
                      elemento gráfico. Es la lección de 10D con otro
                      disfraz: atenuar un elemento para que sea más
                      discreto no da una jerarquía más fina, da un elemento
                      que no está. La jerarquía la pone el TAMAÑO.
                    */}
                    {glyph && <Icon name={glyph} size="1.5em" className="shrink-0" />}
                    <span>{group.label}</span>
                  </span>
                </li>
              )
            })}
          </ul>

          {/*
            ── LA NEURONA ────────────────────────────────────────────────

            Es el único sitio del editorial donde este objeto tiene un
            trabajo: la sección va de conocimientos que se conectan, y una
            neurona es literalmente la pieza que conecta. No ilustra el
            texto — ocupa el pie del índice, debajo de las seis familias,
            como el núcleo del que salen.

            Se probó también en la cabecera del área y ahí competía con el
            titular, que es lo que manda en una llegada. Abajo, cerrando la
            leyenda, acompaña sin disputar nada.
          */}
          <EditorialObject
            model="/models/cocobrain_neuron_icon.glb"
            cue="object"
            className="mt-block hidden lg:block"
            style={{ width: '9rem', height: '9rem' }}
          />
        </div>
      </div>

      {/*
        ── EL CAMPO ──────────────────────────────────────────────────────

        Las seis familias, seguidas, sin separación visible entre ellas. Lo
        que las separa es el encendido: hasta que se señala algo, esto es un
        bloque continuo de veintiséis nombres.
      */}
      <div ref={exit} className="lg:col-span-8 lg:col-start-5">
        {groups.map((group) => (
          <ul key={group.id} className="contents">
            {group.knowledge.map((id) => {
              const item = knowledgeById.get(id) ?? { id, label: id }
              return (
                <li
                  key={id}
                  data-group={group.id}
                  tabIndex={0}
                  data-cue="body"
                  className="tech mr-5 inline-block font-display text-lead font-light leading-[1.5] text-ink-soft"
                >
                  {item.label}
                  <span aria-hidden="true" className="tech-dot ml-5 text-ink-faint/35">
                    ·
                  </span>
                </li>
              )
            })}
          </ul>
        ))}

        {/*
          La nota de cada familia, que antes vivía al lado de su lista. Aquí
          aparece sola: la de la familia señalada. Es el otro sentido de la
          lectura — el campo dice CON QUÉ y esta línea dice DÓNDE se usó.
        */}
        <div className="mt-block grid min-h-[4.5rem] border-t border-rule pt-6">
          {groups.map((group) => (
            <p
              key={group.id}
              data-note={group.id}
              className="tech-note max-w-read text-body text-ink-soft"
            >
              {group.note}
            </p>
          ))}
          <p className="tech-hint max-w-read font-meta text-meta uppercase text-ink-faint">
            Señala una tecnología o una familia
          </p>
        </div>
      </div>
    </div>
  )
}
export default function SkillsArea({ index }) {
  return (
    <PortfolioSection
      id="skills"
      act="4"
      index={index}
      label="Habilidades"
      title="Lo que sé hacer"
      /**
       * El subtítulo cambia según haya grupos declarados o no, y no es un
       * detalle de estilo: es la diferencia entre una afirmación cierta y una
       * falsa.
       *
       * Con grupos, la sección dice lo que Alex sabe hacer, porque lo ha
       * declarado él. Sin grupos, lo único que hay debajo es el inventario de
       * esta web —tecnologías que están en el repositorio, parte de ellas
       * escritas por otra mano— y presentarlas como "lo que sé hacer" sería
       * ponerle en la boca una afirmación que no ha hecho.
       *
       * Y decía "lo mismo que hay dentro del cerebro, ordenado para leerse de
       * un vistazo". Era cierto mientras los grupos solo podían nombrar ids de
       * la red; desde que admiten texto, la mayoría de lo que hay aquí —Python,
       * Java, Spring, Rust, MySQL— NO está dentro del cerebro y nunca lo ha
       * estado. Una frase que describe la arquitectura no puede sobrevivir a un
       * cambio de la arquitectura.
       */
      lead={
        skillGroups.length > 0
          ? 'Lo que he usado en mis proyectos y en el ciclo, agrupado por para qué sirve.'
          : undefined
      }
    >
      {/*
        ── EL EJE TÉCNICO ──────────────────────────────────────────────────

        Se etiqueta "Tecnología" explícitamente ahora que hay un segundo eje
        debajo: antes bastaba con el título del área, pero "Lo que sé hacer"
        ya no describe solo esta mitad.
      */}
      <div className="mt-area">
        <h3 className="font-meta text-meta uppercase text-ink-faint">Tecnología</h3>

        {skillGroups.length > 0 ? (
          /*
            Los grupos se apilan a lo ancho en vez de repartirse en dos
            columnas. Con la retícula interna de cada grupo, dos columnas
            dejarían el nombre y la lista en cajas de 250 px y volveríamos al
            problema de partida. Apilados, cada filete cruza el ancho entero y
            la sección se recorre de arriba abajo como una tabla de contenidos.
          */
          <div className="mt-block">
            <TechField groups={skillGroups} />
          </div>
        ) : (
          <div className="mt-6 space-y-block">
            <PendingList
              label="agrupación profesional"
              note="Frontend, Backend, Bases de datos, Herramientas… Cada grupo nombra conocimientos de la red por su id; la clasificación técnica de la escena no se toca."
            />

            {/*
              Mientras tanto, el inventario de esta web. No es relleno —son las
              tecnologías que de verdad se usan en el repositorio— pero tampoco
              es una lista de habilidades, y el encabezado tiene que decir cuál
              de las dos cosas es.
            */}
            <div className="border-t border-rule pt-8">
              <h3 className="font-meta text-meta uppercase text-ink-faint">
                Tecnologías usadas en esta web
              </h3>
              <p className="mt-3 max-w-read text-body text-ink-faint">
                Es el inventario del proyecto, no una declaración de habilidades.
                Esa la escribe Alex arriba.
              </p>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-3">
                {[...knowledge]
                  .sort((a, b) => b.weight - a.weight)
                  .map((item) => (
                    <li
                      key={item.id}
                      className="font-meta text-meta uppercase"
                      // El peso se lee en la opacidad, igual que en la escena se
                      // lee en el tamaño del nodo.
                      style={{ color: item.weight === 3 ? 'var(--ink)' : 'var(--ink-faint)' }}
                    >
                      {item.label}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/*
        ── EL EJE NO TÉCNICO ────────────────────────────────────────────────

        Mismo patrón que "Cómo trabajo" en Sobre mí: título y cuerpo cortos,
        sin ninguna relación con la red. Es deliberado que no comparta
        composición con los grupos de arriba —una lista de chips no distingue
        "sé usar esto" de "trabajo así", y son afirmaciones de naturaleza
        distinta—.
      */}
      <div className="mt-area border-t border-rule pt-block">
        <h3 className="font-meta text-meta uppercase text-ink-faint">Fortalezas</h3>

        {strengths.length > 0 ? (
          <ul className="mt-6 grid gap-x-block gap-y-6 md:grid-cols-2">
            {strengths.map((item) => (
              <li key={item.id}>
                <p className="text-body font-medium text-ink">{item.label}</p>
                {item.body && (
                  <p className="mt-2 max-w-read text-body text-ink-soft">{item.body}</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6">
            <PendingList
              label="fortalezas"
              note="Cómo trabaja, no con qué: resolución de problemas, aprendizaje, organización, trabajo en equipo… No se asume ninguna."
            />
          </div>
        )}
      </div>
    </PortfolioSection>
  )
}
