/**
 * ── EL MAPA DE LOS ICONOS ───────────────────────────────────────────────────
 *
 * El equivalente de `visualAssets` para lo que no es un archivo: aquí viven los
 * TRAZOS y ningún componente dibuja un `path` a mano, igual que ninguno conoce
 * un nombre de archivo de imagen. Sustituir un icono es cambiar una línea.
 *
 * ## Todos comparten cuatro decisiones, y ninguna es de gusto
 *
 * - **lienzo de 24 y trazo de 1,6.** Un solo sistema métrico: dos iconos con
 *   grosores distintos al lado del mismo texto se leen como dos familias;
 * - **`currentColor`, siempre.** Es lo que hace que sigan solos al suelo y al
 *   tema — la web tiene tres regímenes de tinta desde 11D, y un icono con su
 *   color escrito a mano se rompería en dos de ellos. Es la misma lección que
 *   §13 tiene escrita para el HUD;
 * - **solo trazo, nunca relleno.** Un icono macizo al lado de una tipografía
 *   ligera pesa más que el texto al que acompaña, y entonces deja de acompañar;
 * - **extremos redondeados.** Es lo único que los emparenta con las curvas de
 *   nivel del fondo y con los filetes del editorial, que son la geometría que
 *   esta web ya tiene.
 *
 * ## De dónde salen
 *
 * De **Reicon** (github.com/dqev/reicon, MIT): 2.700+ iconos SVG que existen
 * como archivo crudo, así que se copian EN LÍNEA y no hace falta instalar
 * nada — la regla 4 no se toca. Redibujados al sistema de arriba cuando su
 * grosor o su lienzo no coincidían.
 *
 * ## Y los que CAMBIAN de estado no están aquí
 *
 * El del tema y el de "cabeza despejada" no son un trazo: son un trazo que se
 * transforma al pulsarlo. Viven en `components/ui/Icon.jsx` porque tienen
 * comportamiento, y esto es solo datos.
 */
export const ICONS = {
  /** Enlace que sale de la página. Reemplaza al carácter "↗". */
  external: 'M7 17 17 7M9 7h8v8',

  /**
   * LinkedIn (fase 12C). No es el logotipo trazado píxel a píxel —eso sería
   * un asset con dueño, y esta web no publica material de terceros sin
   * decidirlo—; es la misma "in" que dibujan la mayoría de los sistemas de
   * iconos de trazo (Tabler, Feather...) cuando necesitan decir "esto lleva a
   * un perfil profesional": un marco de esquina recta —como `mail`, `web` y
   * `app`, nunca `rx`— y las dos letras como trazo, nunca relleno. Encaja sin
   * excepción en las cuatro reglas de `data/icons.js` de arriba.
   */
  linkedin: 'M4 4h16v16H4zM8.2 10.4v6.2M8.2 7.6v.1M12 16.6v-4M12 12.6c0-1.2 1-2.2 2-2.2s2 1 2 2.2v4',

  /** La descarga del CV. */
  download: 'M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 19h16',

  /** Volver: el mismo trazo que baja al recorrido, girado. */
  back: 'M10 5 3 12l7 7M3 12h18',

  /** Bajar. Reemplaza al carácter "↓" del narrador de la portada. */
  down: 'M12 4v14m0 0 5-5m-5 5-5-5',

  /** El correo. Un sobre sin relleno: solo la solapa y la caja. */
  mail: 'M3 7.5h18v9H3zM3 8l9 6 9-6',

  /* ── LOS CONTROLES QUE 12A NO LLEGÓ A CONVERTIR ───────────────────────────
     12A cambió los "↗", "↓" y "→" del editorial por trazos, y se dejó tres
     caracteres dentro del visor de medios: la "✕" de cerrar y las dos flechas
     de pasar de pieza. Son el mismo fallo —tipografía DEL SISTEMA, con grosor
     y alineación distintos en cada plataforma— en el único sitio de la web
     donde los controles son lo ÚNICO que hay además de la imagen. */

  /** Cerrar. Dos trazos, no una "✕" de la tipografía del sistema. */
  close: 'M6.5 6.5l11 11M17.5 6.5l-11 11',

  /* Las dos del visor son CABRIOS y no flechas con asta, y es deliberado: van
     pegadas al borde de una imagen a pantalla completa, donde un asta larga
     compite con lo que hay que mirar. Una flecha entera dice "ir a otro
     sitio"; un cabrio dice "la siguiente de estas". */
  /** Pieza anterior. */
  prev: 'M14.5 5l-7 7 7 7',
  /** Pieza siguiente. */
  next: 'M9.5 5l7 7-7 7',

  /** Ir. Reemplaza al carácter "→" de los enlaces que llevan dentro de la web. */
  forward: 'M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5',

  /** Volver arriba. Es `down` del revés, y a propósito: el mismo trazo. */
  up: 'M12 20V6m0 0-5 5m5-5 5 5',

  /* Copiar y su acuse. El segundo NO es un icono distinto que sustituye al
     primero: es lo que confirma que el gesto ha ocurrido, y por eso vuelve
     solo al cabo de un momento. Un control que cambia de icono para siempre
     deja de decir lo que hace. */
  /** Copiar al portapapeles. Dos hojas, una detrás de otra. */
  copy: 'M9 9h10v11H9zM15 9V4H5v11h4',
  /** Hecho. */
  check: 'M4.5 12.5l5 5 10-11',

  /* ── Y LAS SEIS FAMILIAS DEL CAMPO DE TECNOLOGÍAS (fase 12B) ─────────────

     Uno por FAMILIA, nunca uno por tecnología, y esa es la decisión de fondo
     de la fase. Ver la nota de `SkillsArea`: veintiséis logotipos de marca
     serían otro sistema —macizos, de colores ajenos y con dueño— y además
     convertirían el campo en una rejilla de fichas, que es exactamente la
     tabla que esa composición existe para haber sustituido.

     Cada uno dibuja lo que la familia HACE, no la marca con la que se hace. */

  /** Lenguajes: los dos cabrios con los que se escribe código. */
  lang: 'M9 6l-5 6 5 6M15 6l5 6-5 6',

  /** Frontend y web: el marco de un navegador, con su barra. */
  web: 'M3 5.5h18v13H3zM3 9.5h18M6.1 7.5h.7M8.7 7.5h.7',

  /**
   * Escritorio y backend: una ventana sobre su pie.
   *
   * Lo dice la propia nota del grupo —"tres caminos distintos hasta una
   * VENTANA"— así que el icono no interpreta nada: dibuja la palabra que ya
   * estaba escrita en el contenido.
   */
  app: 'M4 5h16v10H4zM4 8.5h16M12 15v4M9.5 19h5',

  /** Datos: el cilindro de siempre. Un dibujo que ya significa "base de datos". */
  data: 'M4 6.5c0-1.38 3.58-2.5 8-2.5s8 1.12 8 2.5-3.58 2.5-8 2.5-8-1.12-8-2.5zM4 6.5v11c0 1.38 3.58 2.5 8 2.5s8-1.12 8-2.5v-11M20 12c0 1.38-3.58 2.5-8 2.5s-8-1.12-8-2.5',

  /**
   * IA en local: un procesador con sus patillas.
   *
   * Es la familia que dice "sin salir de la máquina", y lo que dice eso no es
   * una nube ni una chispa: es el chip. La ausencia de nube ES el mensaje.
   */
  ai: 'M6 6h12v12H6zM9.5 9.5h5v5h-5zM9.5 3v3M14.5 3v3M9.5 18v3M14.5 18v3M3 9.5h3M3 14.5h3M18 9.5h3M18 14.5h3',

  /** Herramientas: una llave inglesa. Lo genérico, que es lo honesto aquí. */
  tool: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
}

/**
 * ── QUÉ TRAZO LE TOCA A CADA FAMILIA ────────────────────────────────────────
 *
 * Vive aquí y no en `SkillsArea` por lo mismo que ningún componente conoce un
 * nombre de archivo de imagen: declarar una familia nueva en `portfolio.js` y
 * darle su trazo tienen que ser dos líneas en dos sitios previsibles, no una
 * búsqueda por el árbol de componentes.
 *
 * Y devuelve `null` para una familia sin trazo declarado en vez de un icono
 * de repuesto. Un icono genérico junto a un nombre concreto no informa de
 * nada y encima disimula que falta algo — es la misma regla que
 * `MISSING_ASSET`: lo que falta se declara, no se tapa.
 */
const GROUP_ICONS = {
  languages: 'lang',
  frontend: 'web',
  desktop: 'app',
  data: 'data',
  'local-ai': 'ai',
  tooling: 'tool',
}

export function groupIcon(id) {
  return GROUP_ICONS[id] ?? null
}

/** El lienzo y el grosor que comparten todos. Ver la nota de arriba. */
export const ICON_BOX = 24
export const ICON_STROKE = 1.6
