/**
 * Modo "cabeza despejada": apaga todo el movimiento de la web.
 *
 * Es un guino al tema —una mente que no para y un interruptor para pararla—
 * y a la vez el modo accesible de la web.
 *
 * Va en un almacen externo minusculo en vez de en un contexto de React por un
 * motivo tecnico concreto: react-three-fiber monta la escena en su propio
 * reconciliador, y el contexto del arbol de DOM no lo cruza. Un almacen
 * suscribible sí lo hace, y es la forma soportada de compartir estado entre
 * los dos mundos sin duplicar proveedores.
 */
const STORAGE_KEY = 'cb_calm_mode'

let calm = false
const listeners = new Set()

if (typeof window !== 'undefined') {
  try {
    calm = window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    calm = false
  }
}

export function getCalmMode() {
  return calm
}

export function setCalmMode(next) {
  if (calm === next) return
  calm = next

  try {
    window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
  } catch {
    // Modo incognito: la preferencia no sobrevive, pero la sesion funciona.
  }

  listeners.forEach((listener) => listener())
}

export function toggleCalmMode() {
  setCalmMode(!calm)
}

export function subscribeCalmMode(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
