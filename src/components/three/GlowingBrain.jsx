import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, CanvasTexture } from 'three'
import { journey } from '../../journey/clock'
import { handoff, layerOpacity } from '../../journey/stages'

/**
 * Resplandor sobre el cerebro que Olaz ya sostiene en la mano.
 *
 * No añade ninguna malla. El primer intento superponía el modelo del cerebro
 * encima, pero el que viene pintado en la textura de Olaz sigue ahí debajo y
 * no hay tamaño que lo tape sin quedar deforme.
 *
 * Así que se ilumina el que ya existe: un halo aditivo, una luz puntual corta
 * que tiñe la mano, y destellos. El resultado es que brilla el cerebro de
 * verdad, no una copia colocada encima.
 */

/** Halo radial generado en un canvas: no hace falta traer una textura. */
function useGlowTexture() {
  return useMemo(() => {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const context = canvas.getContext('2d')
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    )
    /**
     * ROSA DE MARCA, Y NUNCA BLANCO.
     *
     * El centro era `rgba(255,235,238,0.95)`: blanco al 95%, en aditivo, sobre
     * un objeto que ya es claro. En 0,12 —cuando la cámara le pasa al lado— el
     * cerebro salía QUEMADO a blanco puro, sin forma ni volumen, y el rosa que
     * quedaba alrededor era magenta `#FF6B85`, no el rosa de marca.
     *
     * Ahora el núcleo es el rosa claro de marca a poco más de la mitad de
     * opacidad y el cuerpo es `#E98FA0` directamente. Sigue leyéndose como luz
     * —la caída rápida es lo que hace eso, no el blanco— pero ya no puede
     * saturar el canal.
     */
    /**
     * Y LA CAÍDA TIENE QUE SER RÁPIDA, no lineal.
     *
     * Con dos paradas (0,25 → 1) el degradado bajaba en línea recta durante
     * tres cuartos del radio, y bajado el núcleo eso dejó de leerse como luz:
     * se veía un DISCO gris claro recortado contra la pared de la sala, a la
     * izquierda de Olaz. El blanco de antes tapaba ese defecto por saturación.
     *
     * Cuatro paradas concentran casi toda la energía en el tercio interior. Lo
     * que hace que algo parezca una luz y no una mancha es el gradiente de la
     * caída, no cuánto brilla el centro.
     */
    /**
     * Y BAJA OTRA VEZ, porque el núcleo seguía tocando al objeto.
     *
     * Con 0,34 de rosa casi blanco en el centro, el halo se suma justo encima
     * de la parte del cerebro que ya recibía más luz. En el plano corto de
     * 0,10 eso son dos capas de blanco en el mismo píxel. La caída se conserva
     * entera —es lo que lo hace leerse como luz— y lo único que baja es el
     * centro.
     */
    gradient.addColorStop(0, 'rgba(250,206,214,0.20)')
    gradient.addColorStop(0.1, 'rgba(240,166,180,0.14)')
    gradient.addColorStop(0.28, 'rgba(233,143,160,0.05)')
    gradient.addColorStop(0.55, 'rgba(233,143,160,0.01)')
    gradient.addColorStop(0.8, 'rgba(233,143,160,0)')
    gradient.addColorStop(1, 'rgba(233,143,160,0)')

    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)

    return new CanvasTexture(canvas)
  }, [])
}

/**
 * Intensidad de la luz de la mano. Constante.
 *
 * 0,30 y no 0,85, y el número no se puede leer solo: va con `LIGHT_DECAY` y
 * `LIGHT_OFFSET`, que es donde está explicada la cuenta. Con la caída
 * suavizada y la bombilla fuera de la malla, un tercio de la intensidad
 * anterior deja la misma luz cálida en la mano y en el mentón sin quemar el
 * objeto que la produce.
 */
const LIGHT = 0.3

/**
 * ── POR QUÉ EL CEREBRO DE LA MANO SALÍA QUEMADO, Y NO ERA EL HALO ────────
 *
 * Era la luz puntual, y el motivo se puede calcular: estaba en el ORIGEN del
 * grupo, o sea DENTRO de la propia malla del cerebro, con `decay: 2`.
 *
 * Una luz con caída cuadrática entrega `intensidad / distancia²`. El grupo
 * tiene una escala de mundo de 0,277 y el cerebro mide unas 0,35 unidades de
 * ancho, así que su superficie está a unos 0,17 de la bombilla:
 *
 *     0,85 / 0,17²  =  29 veces la intensidad nominal
 *
 * Veintinueve. La cara de Olaz, a 0,6, recibía 2,4. Ninguna curva de tonos
 * salva esa diferencia: el objeto se iba a blanco plano, con dos reflejos
 * recortados donde el mapa de rugosidad es más liso, y perdía todo el
 * volumen. Es la misma familia de error que el halo blanco —sumar luz donde
 * ya sobra— pero un orden de magnitud peor y con la causa escondida en una
 * propiedad que no se ve en pantalla.
 *
 * Se arregla con las tres cosas a la vez, porque ninguna basta sola:
 *
 * - la bombilla SALE de dentro de la malla. `OFFSET` la pone por delante y un
 *   poco por encima, hacia la mano y la cara, que es a quien tiene que
 *   iluminar. Deja de haber superficie a 0,17;
 * - `decay` pasa a 1. Dentro de un objeto cerrado la caída cuadrática no
 *   modela nada: solo amplifica la diferencia entre lo que toca la bombilla y
 *   lo que está un palmo más allá;
 * - y la intensidad baja a un tercio, que es lo que hace falta con la caída
 *   suavizada para que la mano siga teniendo su luz cálida.
 *
 * Lo que NO se toca es de dónde parece salir la luz. Sigue naciendo del
 * cerebro, sigue siendo la única fuente cálida cerca del personaje, y sigue
 * siendo la caída del halo —no su brillo— lo que lo hace leerse encendido.
 */
const LIGHT_OFFSET = [0.2, 0.8, 1.9]
const LIGHT_DECAY = 1

export default function GlowingBrain({ position, scale = 1, layer = 'handBrain' }) {
  const texture = useGlowTexture()
  const rootRef = useRef(null)
  const haloRef = useRef(null)
  const lightRef = useRef(null)

  useFrame(() => {
    // El desvanecido se lee de la tabla en cada frame. Antes llegaba como prop
    // desde React, lo que obligaba a re-renderizar el árbol en cada píxel de
    // scroll para mover una opacidad.
    const p = journey.progress
    const fade = layerOpacity(layer, p)

    /**
     * CUÁNTO SE APAGA AL ATRAVESARLO.
     *
     * Este cerebro es el umbral entre los dos actos y tiene que verse. Pero al
     * pasarle la cámara por dentro llena el cuadro, y con el halo aditivo al
     * máximo el resultado era una pantalla de rosa: el plano más claro de toda
     * la web, justo en el tramo que tiene que ir oscureciéndose.
     *
     * `handoff` es una campana sobre la ventana en la que este cerebro se
     * desvanece —o sea, exactamente el instante del cruce—, así que baja solo
     * ahí. Fuera de ese medio segundo el objeto queda como estaba: no se toca
     * ni el modelo ni el material, solo cuánto emite mientras se atraviesa.
     *
     * Es el mismo principio que en la corteza y está escrito en el manual:
     * restar luz, no sumarla.
     */
    const crossing = 1 - handoff(p) * 0.8

    const root = rootRef.current
    if (root) {
      // Se apaga, nunca se desmonta: quitar la malla a mitad de recorrido
      // obliga a recompilar su shader al volver, y eso son frames perdidos.
      root.visible = fade > 0.01
      if (!root.visible) return
    }

    /**
     * ── AQUÍ NO PALPITA NADA, Y ESE ERA EL DESTELLO ───────────────────────
     *
     * Había un latido de `Math.sin(t * 2.4)` en dos sitios a la vez: el halo
     * cambiaba de tamaño un ±14% y la luz puntual de intensidad un ±31%
     * —de 1,1 a 2,1—, con un período de 2,6 segundos.
     *
     * Eso es una animación TEMPORAL: seguía corriendo con el usuario quieto en
     * la portada, y como la luz alcanza la mano y la cara de Olaz, el
     * personaje entero cambiaba de brillo cada dos segundos y medio. Medido
     * sobre quince segundos de portada sin tocar nada: la luminancia media del
     * cuadro oscilaba 2,56 puntos y había píxeles que cambiaban de extremo a
     * extremo entre capturas.
     *
     * La regla que sale de aquí, y que vale para toda la web: **lo único que
     * puede mover la escena es el scroll.** Un latido "de vida" que el usuario
     * no ha pedido es un parpadeo.
     *
     * Lo que hace que este cerebro se lea como encendido no es que palpite: es
     * la caída rápida del halo y que sea la única fuente de luz cálida cerca.
     * Eso se queda.
     */
    if (haloRef.current) {
      haloRef.current.material.opacity = fade * crossing
    }

    if (lightRef.current) {
      lightRef.current.intensity = LIGHT * fade * crossing
    }
  })

  return (
    // Nombre para que la camara del scroll pueda localizarlo y volar hacia
    // el sin necesidad de duplicar aqui sus coordenadas.
    <group ref={rootRef} name="brain-target" position={position} scale={scale}>
      {/* El sprite siempre mira a cámara, así el halo no se ve de canto. */}
      {/*
        2,2 y no 4,2. Ampliado a la escala del grupo, el halo medía casi el
        doble que el cerebro y en la portada se veía como un DISCO pálido
        recortado contra la pared de la sala, desplazado hacia arriba y a la
        izquierda porque la malla del cerebro no está centrada en el origen del
        grupo. Ceñido al objeto, la última parada del degradado cae dentro del
        sprite y ya no hay borde que ver.
      */}
      <sprite ref={haloRef} scale={[2.2, 2.2, 1]}>
        <spriteMaterial
          map={texture}
          blending={AdditiveBlending}
          depthWrite={false}
          // `depthTest` activado. Desactivarlo hacia que el halo se dibujara
          // por encima de todo: al acercarse la camara llenaba la pantalla de
          // rosa y parecia que la web se quedaba colgada.
          depthTest
          transparent
          /*
            PASA POR EL MAPEO DE TONOS. Estaba en `false`, o sea que el halo se
            saltaba la curva ACES y se sumaba en crudo: cualquier valor por
            encima de 1 se recortaba a blanco puro en vez de comprimirse. Es la
            otra mitad de por qué este cerebro se quemaba.
          */
        />
      </sprite>

      <pointLight
        ref={lightRef}
        position={LIGHT_OFFSET}
        color="#E98FA0"
        intensity={LIGHT}
        distance={4}
        decay={LIGHT_DECAY}
      />

      {/*
        Aquí había `<Sparkles>`: dieciocho destellos con su propio reloj
        (`speed={0.45}`), apareciendo y desapareciendo al margen del scroll.
        Son los puntos brillantes sueltos que salían en las capturas de la
        portada y del descenso, y son exactamente lo que esta fase venía a
        quitar: movimiento que el usuario no ha pedido.
      */}
    </group>
  )
}
