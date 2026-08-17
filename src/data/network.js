import { knowledge } from './knowledge'

/**
 * Las relaciones de la red. Capa 2: quién se conecta con quién y por qué.
 *
 * Está separada de los nodos a propósito. Un nodo es un hecho —"sé React"—;
 * una arista es una afirmación distinta —"uso React CON Three.js"—. Mezclarlas
 * obligaría a reescribir la lista entera para cambiar una relación.
 *
 * Ninguna de estas conexiones es decorativa: todas describen una dependencia o
 * un uso conjunto real dentro de este proyecto.
 */
export const knowledgeLinks = [
  // JavaScript sostiene todo lo demás.
  ['javascript', 'react'],
  ['javascript', 'node'],
  ['javascript', 'three'],
  ['javascript', 'gsap'],

  // La cadena de la interfaz.
  ['react', 'r3f'],
  ['react', 'vite'],
  ['react', 'tailwind'],
  ['vite', 'node'],

  // El núcleo gráfico.
  ['three', 'r3f'],
  ['three', 'webgl'],
  ['three', 'glsl'],
  ['three', 'gltf'],
  ['r3f', 'drei'],
  ['r3f', 'postprocessing'],
  ['webgl', 'glsl'],

  // Movimiento.
  ['gsap', 'scrolltrigger'],
  ['gsap', 'r3f'],

  // Cadena de assets.
  ['gltf', 'draco'],
  ['gltf', 'sharp'],
  ['git', 'node'],
  ['playwright', 'node'],
]

/** Índice por id, para no recorrer la lista en cada consulta. */
export const knowledgeById = new Map(knowledge.map((node) => [node.id, node]))

/**
 * Vecinos directos de un nodo. Se calcula una vez al cargar, no por frame.
 */
export const neighboursOf = (() => {
  const map = new Map(knowledge.map((node) => [node.id, []]))

  knowledgeLinks.forEach(([a, b]) => {
    if (map.has(a) && map.has(b)) {
      map.get(a).push(b)
      map.get(b).push(a)
    }
  })

  return map
})()

/**
 * Qué conocimientos pertenecen a un área del portfolio.
 *
 * **Este es el puente entre las dos capas de la red.** Al activar "Proyectos"
 * fuera, se consulta aquí qué nodos de dentro deben reaccionar. La relación se
 * declara en `knowledge.js` con el campo `sections`, así que cambiarla no toca
 * ni una línea de la escena 3D.
 */
export const knowledgeBySection = (() => {
  const map = new Map()

  knowledge.forEach((node) => {
    node.sections?.forEach((section) => {
      if (!map.has(section)) map.set(section, [])
      map.get(section).push(node.id)
    })
  })

  return map
})()

/** Ids de los conocimientos relacionados con un área. Vacío si no hay. */
export function relatedTo(sectionId) {
  return knowledgeBySection.get(sectionId) ?? []
}

/**
 * Aristas cuyos DOS extremos pertenecen al área. Son las que se encienden con
 * ella: iluminar una arista con un solo extremo relacionado sugiere una
 * conexión que no existe.
 */
export function linksWithin(sectionId) {
  const inside = new Set(relatedTo(sectionId))
  return knowledgeLinks.filter(([a, b]) => inside.has(a) && inside.has(b))
}
