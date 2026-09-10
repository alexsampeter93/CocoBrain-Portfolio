/**
 * ── EL TEMA: UNA SEGUNDA CARA, NO UNA INVERSIÓN ─────────────────────────────
 *
 * CocoBrain no tenía dualidad claro/oscuro: tenía una IDENTIDAD —marfil y coco,
 * 70/20/10— con dos paréntesis narrativos oscuros, la mente y (desde 10D) el
 * área de Experiencia. Un modo oscuro que pusiera el editorial en coco habría
 * convertido ese paréntesis en el tono general, que es justo lo que §7 prohíbe:
 * la oscuridad de esta web ES la mente.
 *
 * Lo resuelve el color, y la idea es de Alex: **el oscuro del modo oscuro es un
 * AÑIL NOCHE, no el coco.** Medidos los candidatos contra las tintas y acentos
 * que ya existen:
 *
 *     ground              marfil   rosa mente   añil mente
 *     coco    #2B211C     13,73      6,66         6,49
 *     noche   #16233A     13,74      6,66         6,50   <- recambio exacto
 *     Santorini #2C4A73    7,86      3,81         3,72   <- los acentos caen
 *     rosa pálido #E9C9CE  1,34         —            —   <- no lleva tinta clara
 *
 * `#16233A` es contrastivamente idéntico al coco, así que entra sin recalibrar
 * un solo token. Pero lo que decide no es el número: **ese oscuro no es la
 * mente**, así que la mente conserva su exclusividad y el modo oscuro pasa a
 * ser una segunda cara en vez de una invasión.
 *
 * ## Qué NO toca
 *
 * El recorrido 3D, entero. Lo pidió Alex explícitamente y además es lo correcto:
 * la mente es oscura en los dos temas porque es un sitio, no un estilo. El tema
 * solo alcanza al editorial, y eso ya era la forma del sistema desde 10F — el
 * atributo `data-ground` que el HUD lee solo existe durante la lectura.
 *
 * Y Experiencia se queda en COCO en los dos modos: en claro se lee como
 * oscuro-contra-claro y en oscuro como cálido-contra-frío. El paréntesis
 * narrativo sobrevive al cambio de tema en vez de disolverse en él.
 *
 * ## Por qué el valor por defecto es CLARO, y no el del sistema
 *
 * Es la decisión discutible de este archivo, así que va escrita. Lo estándar es
 * respetar `prefers-color-scheme`, y aquí eso significaría que a mucha gente la
 * primera impresión de la marca le llegaría en su versión secundaria. La cara
 * por defecto de CocoBrain es el marfil: el recorrido va de la luz a la luz y
 * eso es lo que cierra el círculo (§7).
 *
 * Así que el sistema no decide, pero la persona sí: en cuanto se toca el
 * interruptor, la elección se guarda y manda para siempre. Si algún día se
 * prefiere lo contrario, se cambia `read()` y nada más.
 *
 * ## Y va en un almacén externo, no en un contexto de React
 *
 * El mismo motivo que `calmMode`: react-three-fiber monta la escena en su
 * propio reconciliador y el contexto del árbol de DOM no lo cruza. Hoy la
 * escena no necesita saber el tema —y ese es el diseño— pero la simetría con
 * `calmMode` vale más que ahorrarse un archivo: los dos interruptores de esta
 * web se leen igual.
 */
const STORAGE_KEY = 'cb_theme'

const read = () => {
  if (typeof window === 'undefined') return 'light'
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

let theme = read()
const listeners = new Set()

export function getTheme() {
  return theme
}

export function isDarkTheme() {
  return theme === 'dark'
}

export function setTheme(next) {
  const value = next === 'dark' ? 'dark' : 'light'
  if (theme === value) return
  theme = value

  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Modo incógnito: la preferencia no sobrevive, pero la sesión funciona.
  }

  listeners.forEach((listener) => listener())
}

export function toggleTheme() {
  setTheme(theme === 'dark' ? 'light' : 'dark')
}

export function subscribeTheme(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
