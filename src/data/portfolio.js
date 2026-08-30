/**
 * EL CONTENIDO EDITORIAL. Todo lo que se lee despacio vive aquí.
 *
 * ════════════════════════════════════════════════════════════════════════
 *  ESTE ARCHIVO ES UN FORMULARIO. Rellenarlo es lo único que queda para
 *  que el portfolio tenga contenido; no hay que tocar ningún componente.
 *
 *  Cada campo vacío se dibuja solo como un hueco etiquetado en la página,
 *  así que se puede ir rellenando por partes y ver el resultado a cada
 *  paso. Lo que no esté aquí, no se publica.
 * ════════════════════════════════════════════════════════════════════════
 *
 * ## Qué es este archivo y qué no
 *
 * `knowledge.js` y `network.js` son la MENTE: conocimientos, relaciones, la
 * red que se explora dentro del cerebro. Este archivo es el PORTFOLIO: lo que
 * Alex ha hecho, dónde, cuándo y cómo. Son dos cosas distintas y por eso están
 * en dos archivos.
 *
 * El puente entre los dos existe y va en una sola dirección: desde aquí se
 * NOMBRAN conocimientos por su `id`. Un proyecto declara `stack: ['react']` y
 * un grupo de habilidades declara `knowledge: ['react', 'vite']`. Nunca al
 * revés: la red no sabe que existe un portfolio, y así puede seguir
 * dibujándose sola.
 *
 * La escena 3D **no lee nada de este archivo**. Ni un título, ni una fecha, ni
 * un párrafo. El 3D contesta *qué es esto, con qué se relaciona, dónde estoy*;
 * esto contesta *qué hizo, cómo, cuándo y con quién*.
 *
 * ## Está vacío a propósito
 *
 * Los campos existen, la interfaz sabe pintarlos y ninguno tiene contenido.
 * Rellenar esto es trabajo de Alex: inventarle una experiencia laboral o un
 * proyecto a alguien es la única cosa que un portfolio no puede permitirse.
 *
 * ## Sobre las tecnologías y las habilidades
 *
 * Que una tecnología esté en `knowledge.js` significa que SE USA EN ESTA WEB.
 * No significa que sea una habilidad que Alex pueda afirmar en una entrevista, y
 * las dos cosas no se pueden confundir: parte de este código no lo ha escrito
 * él, y alguna de las dieciocho puede ser algo que aquí aparezca dos veces y en
 * su carrera ninguna.
 *
 * Por eso las habilidades se declaran AQUÍ, una por una, y no se derivan de la
 * red. `skillGroups` es una afirmación personal; `knowledge.js` es un inventario
 * del proyecto.
 *
 * Donde falta contenido, la interfaz lo dice —no lo disimula—, para que al
 * mirar la página se vea exactamente qué queda por escribir.
 */

/**
 * ── SOBRE MÍ ────────────────────────────────────────────────────────────
 *
 * La jerarquía es headline → resumen → cuerpo → secundarios, y la interfaz la
 * respeta: el titular ocupa el ancho de la pantalla, el resumen va en una
 * columna de lectura, y formación y principios son bloques laterales.
 *
 * - `headline`   dos o tres palabras. Es un TITULAR, no una frase
 * - `summary`    una o dos frases. Lo que se lee si no se lee nada más
 * - `body`       párrafos. La versión larga
 * - `education`  { title, place, period, note }
 * - `principles` { title, body } — cómo trabaja. Tres o cuatro como mucho
 */
/**
 * ⚠ TEXTO RETIRADO
 *
 * Aquí había tres párrafos en primera persona —"Soy Alex, desarrollador full
 * stack junior…", "Busco un sitio donde aprender de gente mejor que yo…"— que
 * escribí YO para poder ver cómo se comportaba la maquetación con párrafos
 * reales. Estaban marcados como provisionales y aun así se publicaban.
 *
 * Eran afirmaciones inventadas sobre una persona: su nivel, su stack, sus
 * motivaciones y lo que busca en un trabajo. Da igual lo verosímiles que
 * suenen; no las dijo Alex. Un portfolio es lo único que no puede llevar ni una
 * frase que su dueño no haya escrito, porque es exactamente lo que alguien va a
 * leer para decidir si le llama.
 *
 * Se quedan aquí, comentadas, por si alguna idea sirve de punto de partida. No
 * vuelven al array sin que Alex las escriba con sus palabras.
 */
export const about = {
  headline: '',
  summary: '',
  body: [],
  education: [],
  principles: [],
}

/**
 * ── EXPERIENCIA ─────────────────────────────────────────────────────────
 *
 * No es una línea de tiempo con puntitos. La presentación es una CADENA: cada
 * puesto es un nodo grande con su periodo a un lado y un filete vertical que lo
 * une con el siguiente, igual que las conexiones de la red. La trayectoria se
 * lee como lo que es —una cosa lleva a la siguiente— sin recurrir al cliché.
 *
 * - `company`, `role`, `period` — el encabezado
 * - `summary`          una frase: qué era ese trabajo
 * - `responsibilities` lista corta
 * - `achievements`     lista corta. Lo que cambió por haber estado ahí
 * - `stack`            ids de `knowledge.js`. Si un id no existe en la red, se
 *                      muestra igualmente como texto: la experiencia no puede
 *                      depender de que la red esté completa
 */
export const experience = []

/**
 * ── PROYECTOS ───────────────────────────────────────────────────────────
 *
 * El área más importante junto con la escena, y la única que no se maqueta en
 * columnas: cada proyecto ocupa el ancho entero y se lee en cuatro tiempos
 * —qué era, qué problema había, qué hice, qué salió—.
 *
 * - `id`, `title`, `tagline`, `year`
 * - `problem`, `solution`, `role`   los tres bloques del caso
 * - `outcome`      resultados y aprendizajes
 * - `stack`        ids de `knowledge.js`
 * - `media`        ver abajo. El hueco visual del proyecto
 * - `links`        { live, repo, video } — solo los que existan
 *
 * `media` admite tres formas y la interfaz reserva el sitio para las tres sin
 * que haya que decidirlo ahora:
 *
 *     { kind: 'image', src: '/img/projects/x.webp', alt: '' }
 *     { kind: 'video', src: '/video/x.mp4', poster: '' }
 *     { kind: 'scene', id: 'x' }   ← un objeto 3D propio, más adelante
 *
 * Mientras `media` esté vacío se dibuja el hueco con su proporción, para que la
 * composición ya se pueda juzgar sin las imágenes.
 */
export const projects = []

/**
 * ── HABILIDADES ─────────────────────────────────────────────────────────
 *
 * Para quien no quiera recorrer la red nodo a nodo. Es la MISMA información
 * ordenada de otra manera, no información nueva.
 *
 * **`kind` en `knowledge.js` no se toca.** Ahí `kind` es la familia técnica que
 * decide el COLOR del nodo en la escena —`graphics`, `tooling`, `format`—, y
 * eso es una clasificación visual. Lo de aquí es una clasificación
 * PROFESIONAL: "Frontend", "Backend", "Bases de datos". Son dos ejes distintos
 * y el mismo conocimiento cae en los dos: React es `framework` para la escena y
 * "Frontend" para un reclutador. Mezclarlos obligaría a elegir uno y perder el
 * otro.
 *
 * - `id`, `label`
 * - `note`       una línea: qué significa saber esto. Opcional
 * - `knowledge`  ids de `knowledge.js`. De aquí sale la lista Y el enlace con
 *                la red: al enfocar un grupo se pueden encender sus nodos
 */
export const skillGroups = []

/**
 * ── CV ──────────────────────────────────────────────────────────────────
 *
 * Ni un PDF incrustado ni una copia de todo lo anterior. Es el resumen
 * profesional en una pantalla, con la descarga a un lado.
 *
 * - `summary`   el párrafo de cabecera de un currículum
 * - `file`      ruta al PDF en `public/`. Vacío = no se ofrece la descarga
 * - `updated`   'marzo 2026'. Un CV sin fecha no se cree
 * - `highlights` tres o cuatro líneas: lo que se lee en diez segundos
 */
export const cv = {
  summary: '',
  file: '',
  updated: '',
  highlights: [],
}

/**
 * ── CONTACTO ────────────────────────────────────────────────────────────
 *
 * El cierre, y por eso no es un área con nodo: es a donde llegas cuando ya has
 * visto todo lo demás. Un formulario aquí sobraría —nadie rellena formularios
 * en un portfolio— así que es un correo y los enlaces que importen.
 *
 * - `email`
 * - `links`  { label, href } — GitHub, LinkedIn, lo que haya
 */
export const contact = {
  email: '',
  links: [],
}
