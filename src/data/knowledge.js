/**
 * Los nodos que viven DENTRO del cerebro: conocimientos y tecnologías.
 *
 * Significado: *esto es lo que hay dentro de la mente de Alex.* No son
 * decoración, así que ni las etiquetas ni las relaciones se inventan.
 *
 * ## De dónde sale esta lista
 *
 * ÚNICAMENTE de tecnologías **verificables en este mismo repositorio**: lo que
 * aparece en `package.json`, en el pipeline de assets o en el código escrito.
 * Cada una de estas se puede defender señalando dónde se usa.
 *
 * Falta el resto de tu stack real —lenguajes, bases de datos, backend, lo que
 * hayas usado en otros proyectos—. Eso lo añades tú: es contenido personal y
 * no me corresponde inventarlo. Añadir una entrada aquí es suficiente; la
 * posición en el espacio se calcula sola.
 *
 * ## Campos
 *
 * - `id`        identificador estable, usado por las relaciones
 * - `label`     lo que se lee en pantalla
 * - `kind`      familia, para agrupar y colorear
 * - `weight`    1 a 3. Decide tamaño y brillo: es la jerarquía de la red
 * - `sections`  a qué áreas del portfolio pertenece. **Este campo es el
 *               puente entre las dos capas**: al activar "Proyectos" se
 *               encienden los conocimientos que lo declaran
 */
export const knowledge = [
  // Base
  { id: 'javascript', label: 'JavaScript', kind: 'language', weight: 3, sections: ['skills', 'work'] },
  { id: 'node', label: 'Node.js', kind: 'runtime', weight: 2, sections: ['skills'] },
  { id: 'git', label: 'Git', kind: 'tooling', weight: 2, sections: ['skills'] },

  // Interfaz
  { id: 'react', label: 'React', kind: 'framework', weight: 3, sections: ['skills', 'work'] },
  { id: 'vite', label: 'Vite', kind: 'tooling', weight: 2, sections: ['skills'] },
  { id: 'tailwind', label: 'Tailwind', kind: 'framework', weight: 1, sections: ['skills'] },

  // Gráficos: el núcleo de esta web
  { id: 'three', label: 'Three.js', kind: 'graphics', weight: 3, sections: ['skills', 'work'] },
  { id: 'r3f', label: 'React Three Fiber', kind: 'graphics', weight: 3, sections: ['skills', 'work'] },
  { id: 'drei', label: 'drei', kind: 'graphics', weight: 1, sections: ['skills'] },
  { id: 'webgl', label: 'WebGL', kind: 'graphics', weight: 2, sections: ['skills'] },
  { id: 'glsl', label: 'GLSL', kind: 'graphics', weight: 2, sections: ['skills', 'work'] },
  { id: 'postprocessing', label: 'Postproceso', kind: 'graphics', weight: 1, sections: ['skills'] },

  // Movimiento
  { id: 'gsap', label: 'GSAP', kind: 'animation', weight: 3, sections: ['skills', 'work'] },
  { id: 'scrolltrigger', label: 'ScrollTrigger', kind: 'animation', weight: 2, sections: ['skills'] },

  // Assets
  { id: 'gltf', label: 'glTF', kind: 'format', weight: 2, sections: ['skills', 'work'] },
  { id: 'draco', label: 'DRACO', kind: 'format', weight: 1, sections: ['skills'] },
  { id: 'sharp', label: 'sharp', kind: 'tooling', weight: 1, sections: ['skills'] },
  { id: 'playwright', label: 'Playwright', kind: 'tooling', weight: 1, sections: ['skills'] },
]

/**
 * Colores por familia.
 *
 * ## Cuatro tonos, no siete
 *
 * Las siete familias tenían siete valores y **los siete eran rosa**: `#FFB6C1`,
 * `#E98FA0`, `#F08FA5`, `#B85C76`… Sobre el papel eran distintos; en pantalla,
 * a doce píxeles y en aditivo, eran el mismo punto rosa repetido dieciocho
 * veces. La consecuencia no era solo que no se distinguieran las familias: es
 * que la mente entera se leía de un color, que es el problema que arrastraba
 * el interior.
 *
 * Ahora son cuatro tonos de la paleta —crema, rosa, coco y añil— repartidos
 * entre las siete familias. Cuatro y no siete a propósito: **esto no puede
 * convertirse en una colección multicolor.** Con cuatro hay variedad suficiente
 * para que se vea que hay tipos de cosas, y pocos suficientes para que la red
 * siga leyéndose como un solo organismo.
 *
 * ## El reparto, y por qué ese
 *
 * Sale del peso de cada familia, no del gusto. `graphics` son seis nodos de
 * dieciocho, así que se lleva el rosa de marca: lo que más hay es lo que define
 * el color del sitio. `tooling` son cuatro y se lleva el añil, que es el único
 * frío —cuatro de dieciocho es una minoría visible, que es exactamente lo que
 * tiene que ser un acento—. El resto se reparte entre crema y coco.
 *
 * Catorce cálidos contra cuatro fríos. Esa proporción es la paleta de la marca
 * aplicada a la red.
 *
 * ## Todos claros, y no es una elección estética
 *
 * Los nodos se dibujan con `meshBasicMaterial` en aditivo: el color se SUMA al
 * fondo. Un coco oscuro y bonito sobre papel aquí sería un nodo invisible. Por
 * eso incluso el más apagado de los cuatro es un tono medio-alto.
 */
export const KIND_COLORS = {
  // Crema: la base sobre la que se construye todo.
  language: '#F2E2D0',
  format: '#F2E2D0',

  // Rosa de marca: lo que más hay, y el color de la casa.
  graphics: '#E98FA0',
  framework: '#F2A2B0',

  // Coco: el vínculo con la mascota.
  animation: '#D69A6E',
  runtime: '#D69A6E',

  // Añil: el único frío. La minoría que da contraste.
  tooling: '#8FA8D0',
}
