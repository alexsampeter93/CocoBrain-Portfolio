import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import {
  CanvasTexture,
  ClampToEdgeWrapping,
  Color,
  DoubleSide,
  Object3D,
  Vector3,
} from 'three'
import { journey } from '../journey/clock'
import { descent, ramp, sampleCamera } from '../journey/stages'
import { getVisualAsset } from '../data/visualAssets'

/**
 * EL PASO: anillos encadenados sobre el eje de viaje.
 *
 * ## Qué problema resuelve, y los dos intentos que no lo resolvieron
 *
 * Entre el cerebro de la mano y la corteza hay ocho unidades de mundo en las
 * que la cámara AVANZA. Avanzar solo se percibe si hay cosas a distintas
 * distancias que te adelanten; si no, la misma imagen creciendo se lee como un
 * zoom y el tramo se siente muerto.
 *
 *   1. **Dos fotografías a pantalla completa que crecían y se separaban.**
 *      Nunca produjo perspectiva: ampliar una foto mantiene la posición
 *      relativa de todo lo que hay dentro. Cinco fases de máscaras y
 *      desenfoques no lo arreglaron porque el problema era el movimiento.
 *   2. **Tramos de cilindro abierto vistos por dentro.** Perspectiva sí, pero
 *      la textura del túnel se estiraba alrededor del cilindro y el resultado
 *      era un túnel DENTRO de otro túnel: dos convergencias distintas
 *      compitiendo en el mismo cuadro.
 *
 * Lo que queda es lo tercero: las dos láminas se usan tal cual, de frente, y
 * lo que se repite es su GEOMETRÍA. Cada anillo es la lámina con el centro
 * transparente, colocada perpendicular al camino y centrada en él; por el
 * hueco se ve el siguiente, y por el del último, el cerebro. La convergencia
 * de la imagen y la del recorrido son la misma porque comparten el eje.
 *
 * ## Las cuatro cosas que hacen que se lea como un espacio y no como imágenes
 *
 * - **el hueco NO se anima.** El anillo entero crece en pantalla al acercarse,
 *   así que su hueco crece solo. La versión anterior lo abría escribiendo
 *   `alphaMap.repeat` en cada frame, y con un valor menor que uno el plano ya
 *   no llegaba a muestrear el borde negro del degradado: aparecía el CANTO
 *   RECTO del rectángulo. Eso es lo que hacía que se leyeran como láminas
 *   pegadas. Ahora el alfa es un anillo fijo que se apaga antes del borde;
 *   ningún anillo tiene esquinas;
 * - **el punto de fuga de cada lámina se centra en el eje.** Medido: el núcleo
 *   azul de `tunnel-mind` está en el 50%/54,5% del archivo y el de
 *   `tunnel-tissue` en el 65,5%/43,8%. Sin corregirlo, el segundo apuntaba a
 *   un palmo del cerebro y los anillos parecían descuadrados entre sí;
 * - **cada anillo gira sobre su eje un ángulo distinto.** Sin eso, doce copias
 *   de la misma imagen alineadas se leen como un bucle mecánico;
 * - **la lámina cambia de una a otra a lo largo del túnel, mezclándose.** Cada
 *   anillo lleva las dos superpuestas con opacidades complementarias, así que
 *   no hay ningún punto en el que una acabe y empiece la otra: se entra por la
 *   retícula luminosa y se llega al tejido.
 *
 * ## Y por qué el horizonte es RELATIVO, que es lo que vacía el tramo
 *
 * Un anillo con el hueco de radio `h` a distancia `a` deja ver por él un cono
 * de `h/a`. El cerebro, de radio `r` y a distancia `s`, ocupa `r/s`. Así que
 * un anillo TAPA el cerebro en cuanto
 *
 *     h / a  <  r / s        →        a  >  (h / r) · s
 *
 * O sea que el horizonte no puede ser un número de unidades: depende de lo
 * lejos que esté el destino. Con un horizonte fijo de 14 unidades, en la
 * primera mitad del descenso los anillos lejanos se dibujaban ENCIMA del
 * cerebro y en la segunda no quedaba ninguno delante. Con el horizonte
 * relativo siempre hay dos o cinco anillos por delante y el cerebro nunca
 * queda detrás de uno.
 *
 * Se comprueba con `node scripts/rings.mjs`, que cuenta anillos vivos punto a
 * punto y avisa si en alguna muestra no queda ninguno.
 */

/**
 * Dónde se colocan, en progreso del recorrido.
 *
 * Acaba en 0,375 y no en 0,335, y el motivo es medible: el último anillo tiene
 * que quedar a unas dos unidades del centro del cerebro —o sea, justo delante
 * de su superficie—. Terminando antes, entre 0,30 y 0,34 la cámara ya los
 * había adelantado todos y no quedaba ninguno por delante. Ese era el tramo
 * muerto, y no era una cuestión de opacidad: era que no había nada puesto.
 */
const SPAN = [0.105, 0.375]

/** Cuántos como mucho. Se colocan por DISTANCIA, así que suelen salir menos. */
const COUNT = 18

/**
 * Separación entre anillos, del primero al último, en unidades de mundo.
 *
 * Se estrechan al final por el mismo motivo por el que se estrecha el túnel:
 * llegar es acelerar. Y no se reparten por progreso sino por distancia
 * recorrida, porque la cámara no avanza a velocidad constante —repartidos por
 * progreso, los últimos tres quedaban amontonados y se apagaban a la vez—.
 */
const STEP = [1.2, 0.45]

/**
 * Medio lado del anillo, del primero al último.
 *
 * El plano es CUADRADO, y eso no es un detalle. Con el plano apaisado, el
 * degradado radial del alfa se convierte en una elipse: el hueco es casi el
 * doble de ancho que de alto y el anillo deja de ser un anillo. Cuadrado, el
 * alfa es un círculo de verdad en el mundo, y la lámina se recorta a su
 * cuadrado central —que es donde está el vórtice— con `repeat`.
 */
const RADIUS = [4.2, 2.2]

/** Fracción del radio en la que el alfa está completamente abierto. */
const HOLE = 0.3

/**
 * Margen del horizonte relativo. Un anillo se apaga cuando su hueco ya no
 * abarca al cerebro con este margen de sobra. Ver la cabecera.
 */
const CLEARANCE = 1.18

/**
 * Y tampoco se dibuja lo que está tan cerca que su hueco ya se ha comido el
 * encuadre entero.
 *
 * Es el mismo criterio que el horizonte, por el otro lado. Un anillo cuyo
 * hueco abarca más que la ESQUINA de la pantalla no tiene un solo píxel
 * visible: su pared entera está fuera del cuadro. Con un `NEAR` en unidades
 * fijas —0,42— los dos o tres anillos más cercanos se seguían dibujando en
 * cada frame sin aportar nada, y eran precisamente los que más superficie
 * pedían rasterizar.
 *
 * La esquina de un encuadre de 35° a 16:9 está a 32,7°, o sea una tangente de
 * 0,64. Un anillo empieza a asomar cuando `hueco / distancia < 0,64`, así que
 * el corte es `distancia > hueco / 0,64`. Redondeado a 1,6, que deja un poco
 * de margen para pantallas más cuadradas.
 */
const NEAR = 1.6

/** Cuándo existe el paso, en progreso: entra, se queda, se va. */
/*
  Entra en 0,105 y no en 0,112, y llega a presencia plena en 0,15 en vez de en
  0,168. El motivo de esperar era dejarle sitio a Olaz, que se va en 0,12; pero
  entre que Olaz se iba y el paso llegaba quedaba un hueco de tres centesimas
  con el cuadro practicamente vacio. Ahora el paso empieza a abrirse mientras
  el cerebro de la mano todavia llena la pantalla, y lo releva sin que en
  ningun frame falte una cosa u otra.
*/
const ALIVE = [0.105, 0.15, 0.3, 0.358]

const TO_RING = new Vector3()

/**
 * Las dos láminas se PRECARGAN a nivel de módulo.
 *
 * Sin esto entran en el gestor de carga cuando el componente se monta, o sea
 * DESPUÉS de que el precalentamiento haya decidido que todo está cargado. La
 * primera vez que se dibujaba un anillo había que subir a la tarjeta dos
 * imágenes de 1600 × 900: medido con journey.mjs contra el build, 83 ms de
 * frame en p=0,119 y 100 ms en p=0,122, justo al empezar el paso.
 *
 * Declaradas aquí, cuentan para useProgress y el barrido de Warmup las
 * encuentra ya subidas.
 */
useTexture.preload([
  getVisualAsset('transitions.passageFar').src,
  getVisualAsset('transitions.passageNear').src,
])

/**
 * La rampa cromática del paso, del marfil de la portada al coco profundo.
 *
 * Con una parada intermedia en coco oscuro por la misma razón que la atmósfera
 * del descenso: dos colores de temperatura opuesta interpolados en línea recta
 * se cruzan por un gris malva, que es justo el tono prohibido.
 */
const PALETTE = ['#F4E7D7', '#E6C7AC', '#C99A78', '#9C6647', '#6B4230']

function paletteAt(t) {
  const scaled = Math.min(0.999, Math.max(0, t)) * (PALETTE.length - 1)
  const index = Math.floor(scaled)
  return new Color(PALETTE[index]).lerp(new Color(PALETTE[index + 1]), scaled - index)
}

function mix(a, b, t) {
  return a + (b - a) * t
}

/**
 * EL ANILLO, en alfa. Un solo canvas para todos: no cambia nunca.
 *
 * Cuatro paradas y las cuatro hacen falta. El hueco central limpio es por
 * donde se ve lo siguiente; la subida hasta la opacidad plena es lo que evita
 * que el borde interior se lea como un recorte; la bajada final es lo que hace
 * que el plano no tenga canto. Y `ClampToEdge` con la última parada en negro
 * garantiza que las esquinas del cuadrado —que caen fuera del círculo— salgan
 * transparentes.
 */
function useRingAlpha() {
  return useMemo(() => {
    const size = 256
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
    gradient.addColorStop(0.0, '#000')
    gradient.addColorStop(HOLE * 0.5, '#000')
    gradient.addColorStop(0.28, '#fff')
    gradient.addColorStop(0.47, '#fff')
    gradient.addColorStop(0.5, '#000')
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)

    const texture = new CanvasTexture(canvas)
    texture.wrapS = ClampToEdgeWrapping
    texture.wrapT = ClampToEdgeWrapping
    return texture
  }, [])
}

/**
 * Centra el vórtice de la lámina en el eje del anillo y recorta su cuadrado.
 *
 * `vanish` es dónde está el núcleo azul dentro del archivo, en fracciones
 * medidas: `[x desde la izquierda, y desde arriba]`. La `v` de una textura va
 * al revés que la `y` de una imagen, de ahí el `1 -`.
 */
function aim(map, vanish) {
  const square = 9 / 16
  map.wrapS = ClampToEdgeWrapping
  map.wrapT = ClampToEdgeWrapping
  map.repeat.set(square, 1)
  map.offset.set(vanish[0] - square / 2, 1 - vanish[1] - 0.5)
  map.needsUpdate = true
  return map
}

export default function Corridor({ path, brain }) {
  const groupRef = useRef(null)
  const ringsRef = useRef([])

  const mind = getVisualAsset('transitions.passageFar')
  const tissue = getVisualAsset('transitions.passageNear')
  const [mindMap, tissueMap] = useTexture([mind.src, tissue.src])
  const alpha = useRingAlpha()

  useMemo(() => {
    aim(mindMap, [0.5, 0.545])
    aim(tissueMap, [0.655, 0.438])
  }, [mindMap, tissueMap])

  /**
   * Las posiciones, calculadas UNA vez sobre la misma curva que recorre la
   * cámara. Compartir la curva es lo que garantiza que la cámara pase siempre
   * por el centro de los anillos y que el punto de fuga sea el destino: no hay
   * dos versiones del recorrido que puedan desincronizarse.
   */
  const rings = useMemo(() => {
    const position = new Vector3()
    const target = new Vector3()
    const next = new Vector3()
    const previous = new Vector3()
    const mindCenter = new Vector3()
    const pose = new Object3D()

    /**
     * El centro de la mente, preguntándoselo a la curva en vez de escribirlo.
     * En 0,30 la tabla mira exactamente ahí —es una de sus paradas—, así que
     * el punto de mira de ese instante ES el destino.
     */
    sampleCamera(path, 0.3, position, mindCenter)

    /**
     * PRIMERA PASADA: cuánto se anda en total.
     *
     * Hace falta porque `t` —lo que decide el color, el tamaño y la mezcla de
     * las dos láminas— tiene que ir de cero a uno a lo largo del túnel. La
     * versión anterior lo sacaba del ÍNDICE sobre `COUNT`, y como `COUNT` es un
     * tope y no una cantidad, `t` se quedaba en 0,53: el paso no llegaba nunca
     * al tejido ni al coco profundo, y la mitad de la rampa cromática no se
     * llegaba a ver. Repartido por distancia, `t` llega a uno pongas los
     * anillos que pongas.
     */
    let total = 0
    sampleCamera(path, SPAN[0], previous, target)
    for (let step = 1; step <= 900; step += 1) {
      sampleCamera(path, SPAN[0] + ((SPAN[1] - SPAN[0]) * step) / 900, position, target)
      total += position.distanceTo(previous)
      previous.copy(position)
    }

    const list = []
    let walked = 0
    let mark = 0
    sampleCamera(path, SPAN[0], previous, target)

    for (let step = 1; step <= 900; step += 1) {
      const at = SPAN[0] + ((SPAN[1] - SPAN[0]) * step) / 900
      sampleCamera(path, at, position, target)
      walked += position.distanceTo(previous)
      previous.copy(position)

      const t = Math.min(1, walked / (total || 1))
      if (walked < mark + mix(STEP[0], STEP[1], t)) continue
      mark = walked

      /**
       * EL EJE DEL ANILLO APUNTA AL DESTINO, no a la tangente del camino.
       *
       * Es la corrección que convierte una lámina en un túnel. La cámara no
       * mira hacia donde avanza —mira al cerebro, que es lo que quiere ver— así
       * que orientando los anillos por la tangente su punto de fuga caía a un
       * palmo del destino: en el cuadro se veían dos convergencias distintas, la
       * de la imagen y la de la escena, y el ojo no las juntaba.
       *
       * Apuntando al centro de la mente, el núcleo azul de la lámina, el hueco
       * del anillo y el cerebro son el mismo punto de la pantalla. Que es
       * exactamente para lo que sirve un punto de fuga.
       */
      const axis = mindCenter.clone().sub(position).normalize()

      /**
       * La orientación se calcula aquí y no en cada frame. Un anillo no se
       * mueve nunca: `lookAt` en el bucle de render era trabajo repetido para
       * escribir siempre lo mismo.
       *
       * El giro sobre el eje sale del índice, no de un dado: la escena tiene
       * que ser una función del scroll, y eso incluye no depender de nada que
       * cambie entre dos cargas. 137 grados es el ángulo áureo: doce anillos
       * seguidos no repiten orientación ni se alinean por parejas.
       */
      pose.position.copy(position)
      pose.up.set(0, 1, 0)
      pose.lookAt(position.clone().sub(axis))
      pose.rotateZ((((list.length * 137) % 360) * Math.PI) / 180)

      const radius = mix(RADIUS[0], RADIUS[1], t)
      list.push({
        at,
        position: position.clone(),
        quaternion: pose.quaternion.clone(),
        forward: axis,
        radius,
        hole: radius * HOLE,
        // Cuánto se lleva del túnel: decide el color y la mezcla de láminas.
        t,
        blend: Math.pow(t, 1.7),
        color: paletteAt(t),
      })

      if (list.length >= COUNT) break
    }

    return { list, mindCenter }
  }, [path])

  useFrame((state) => {
    const group = groupRef.current
    if (!group) return

    const p = journey.progress
    const alive = ramp(p, ALIVE[0], ALIVE[1]) * (1 - ramp(p, ALIVE[2], ALIVE[3]))
    group.visible = alive > 0.004
    if (!group.visible) return

    // La cámara se aleja del marfil: el paso se apaga con ella en vez de
    // quedarse como la única cosa clara del cuadro.
    const dim = 1 - descent(p) * 0.35
    const toBrain = state.camera.position.distanceTo(rings.mindCenter)
    /*
      `brain` es el TAMAÑO del cerebro —su lado mayor, que es lo que se le pasa
      a `FloatingBrain` como `size`—, no su radio. La silueta que hay que dejar
      libre por el hueco es la mitad de eso. Sin el medio, el horizonte salía a
      la mitad de lo que debía y el paso se quedaba sin anillos dos pantallas
      antes de tiempo.
    */
    const silhouette = brain * 0.5

    for (let i = 0; i < rings.list.length; i += 1) {
      const node = ringsRef.current[i]
      if (!node) continue
      const ring = rings.list[i]

      const ahead = TO_RING.subVectors(ring.position, state.camera.position).dot(ring.forward)

      /**
       * El horizonte, en unidades y para ESTE anillo: hasta dónde puede estar
       * sin taparle el cerebro. Es `a ≤ hueco · distanciaAlCerebro / radio`,
       * despejado de la cabecera. Depende de dónde esté la cámara, así que se
       * recalcula cada frame; es una división por anillo.
       */
      const horizon = (ring.hole * toBrain) / (CLEARANCE * silhouette)
      const near = ring.hole * NEAR

      if (ahead < near || ahead > horizon) {
        node.visible = false
        continue
      }

      // Entra por el fondo y se apaga al pasar de largo. Las dos rampas se
      // multiplican: un anillo nace lejos, llena el cuadro y se va por detrás.
      const presence = ramp(1 - ahead / horizon, 0, 0.42) * ramp(ahead, near, near * 1.9)
      const value = presence * alive
      node.visible = value > 0.006
      if (!node.visible) continue

      // Lo que tienes al lado recibe más luz que lo que está al fondo. Es lo
      // que separa el primer anillo del quinto cuando los dos son la misma
      // lámina.
      const closeness = 1 - Math.min(1, ahead / horizon)
      /**
       * LA PARED ES LO CLARO DEL CUADRO, Y ESTABA AL REVÉS.
       *
       * Iba a `0,72 + 0,5 · cercanía`, o sea SIEMPRE por debajo de uno: la
       * lámina, ya tenue de por sí, se componía por alfa sobre el aire del
       * descenso y lo dejaba más oscuro que antes de pintarla. En pantalla eso
       * no es un túnel, es una viñeta: medido en 0,22, el centro del cuadro
       * daba 13 sobre 255 con el aire detrás en 60.
       *
       * En las dos láminas de referencia la pared está ILUMINADA y la garganta
       * es lo oscuro. Es lo que hace que se lea como un sitio por el que se
       * pasa: lo que tienes al lado recibe luz, el fondo no. Así que el factor
       * arranca por encima de uno y sube con la cercanía.
       */
      const lit = dim * (3.1 + 1.6 * closeness)

      const first = node.children[0]
      const second = node.children[1]
      first.material.opacity = value * (1 - ring.blend)
      second.material.opacity = value * ring.blend
      first.material.color.copy(ring.color).multiplyScalar(lit)
      second.material.color.copy(ring.color).multiplyScalar(lit)
    }
  })

  return (
    <group ref={groupRef} visible={false}>
      {rings.list.map((ring, index) => (
        <group
          key={ring.at}
          ref={(node) => {
            ringsRef.current[index] = node
          }}
          position={ring.position}
          quaternion={ring.quaternion}
        >
          {/*
            Las dos láminas, superpuestas y con opacidades complementarias. Un
            cuarto de milímetro de separación entre ellas: sin él, el orden de
            dibujado entre dos planos exactamente coplanares depende del
            criterio de ordenación y puede cambiar de un frame a otro.

            Son cuatro triángulos cada una. Doblar el número de planos para
            poder mezclar las dos láminas cuesta menos que cualquiera de las
            alternativas —un material propio con dos mapas, o alternar anillos,
            que se lee como un patrón—.
          */}
          {[
            { map: mindMap, z: 0 },
            { map: tissueMap, z: 0.0025 },
          ].map((layer, order) => (
            <mesh key={order} position={[0, 0, layer.z]} raycast={() => null}>
              <planeGeometry args={[ring.radius * 2, ring.radius * 2]} />
              <meshBasicMaterial
                map={layer.map}
                alphaMap={alpha}
                side={DoubleSide}
                transparent
                opacity={0}
                depthWrite={false}
                toneMapped={false}
                /*
                  La niebla de la cavidad mezcla hacia el color del aire ANTES
                  de componer. Sobre estas láminas, que ya llegan tenues, eso
                  las convertía en un borrón pardo justo en el tramo en el que
                  tienen que dar estructura.
                */
                fog={false}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}
