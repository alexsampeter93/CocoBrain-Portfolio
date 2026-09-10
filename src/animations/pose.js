/**
 * ── UN DUEÑO POR PROPIEDAD, CUANDO HAY QUE COMBINAR VARIAS COSAS ────────────
 *
 * La ley de la casa dice que una propiedad animada tiene un único propietario.
 * En el DOM eso se resuelve con envoltorios —el marco, la lámina, la escala y el
 * hover viven cada uno en su elemento— y funciona porque siempre se puede meter
 * un `<div>` más.
 *
 * En tres dimensiones NO se puede. `group.rotation.y` es un número, y si el
 * scroll, la vuelta ocasional y el puntero quieren moverlo a la vez, o hay una
 * composición explícita o hay tres escritores peleándose y el último gana.
 *
 * Esto es esa composición, y no es un sistema: son treinta líneas.
 *
 *     const pose = createPose((c) => {
 *       group.rotation.y = base + c.scroll * TURN + c.spin + c.pointer
 *       invalidate()
 *     })
 *
 *     pose.set('scroll', self.progress)   // el scroll
 *     pose.set('spin', v)                 // la vuelta ocasional
 *     pose.set('pointer', x * 0.16)       // el cursor
 *
 * Cada fuente escribe SU canal y nunca la propiedad. El aplicador es el único
 * que toca el objeto, así que añadir una cuarta influencia —la velocidad del
 * scroll, un estado de hover, lo que venga— es añadir un canal y una línea al
 * aplicador. No hay que reescribir nada de lo que ya funciona, que es la
 * pregunta que ordena toda la fase 7A.
 *
 * ## Por qué un objeto plano y no una clase, ni un store, ni un evento
 *
 * Porque lo que hace falta es exactamente esto. Un canal es un número con
 * nombre; escribir uno recalcula la pose. Con GSAP animando canales
 * —`gsap.to(pose.channels, { spin: TAU, onUpdate: pose.apply })`— se obtiene lo
 * mismo que animando la propiedad, con la diferencia de que dos animaciones
 * simultáneas dejan de destruirse.
 *
 * ## Y no llama al aplicador si nada cambió
 *
 * Un `set` con el mismo valor no repinta. Importa: estos aplicadores terminan
 * en `invalidate()`, y en un canvas con `frameloop="demand"` pedir un frame que
 * dibuja lo mismo es trabajo puro.
 */
export function createPose(apply, initial = {}) {
  const channels = { ...initial }
  let dirty = false

  const run = () => {
    dirty = false
    apply(channels)
  }

  return {
    /** Los valores en crudo. Se los pasa a GSAP para animarlos. */
    channels,
    /** Escribe un canal y recompone. Si el valor no cambia, no hace nada. */
    set(name, value) {
      if (channels[name] === value) return
      channels[name] = value
      run()
    },
    /** Varios canales de una vez, con una sola recomposición. */
    setAll(values) {
      for (const [name, value] of Object.entries(values)) {
        if (channels[name] === value) continue
        channels[name] = value
        dirty = true
      }
      if (dirty) run()
    },
    /** Recompone sin cambiar nada: para cuando GSAP escribe en `channels`. */
    apply: run,
    get(name) {
      return channels[name]
    },
  }
}
