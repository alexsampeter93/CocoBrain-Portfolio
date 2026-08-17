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
 * Colores por familia. Salen de la paleta del interior: el rosa es el tono
 * base y las familias se separan por temperatura, no por saltos de color, para
 * que la red siga leyéndose como una sola cosa.
 */
export const KIND_COLORS = {
  language: '#FFB6C1',
  framework: '#E98FA0',
  graphics: '#F08FA5',
  animation: '#FFB6C1',
  runtime: '#E98FA0',
  format: '#B85C76',
  tooling: '#B85C76',
}
