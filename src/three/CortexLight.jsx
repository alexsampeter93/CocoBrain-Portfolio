import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { journey } from '../journey/clock'
import { cortex, crossing, dwell, enclosure } from '../journey/stages'

/**
 * LA LUZ RASANTE DE LA CORTEZA. Solo existe mientras se llega y se atraviesa.
 *
 * ## Por qué hacía falta
 *
 * El cerebro estaba iluminado por una sola fuente, y está en su CENTRO. Desde
 * fuera eso es un contraluz: la superficie que da a la cámara no recibe nada.
 * Mientras el cerebro se veía de lejos daba igual —lo que se leía era su
 * silueta y el brillo de los surcos a través del vidrio— pero al acercarse a
 * dos unidades, con la corteza llenando el cuadro, el resultado medido era que
 * **el casco estaba delante y no se veía**: opacidad 1, transmisión 0,14, y aun
 * así el cuadro era un campo marrón con los nodos flotando.
 *
 * No era un problema de material. Era que no había luz.
 *
 * ## Qué hace
 *
 * Un foco que viaja CON la cámara, desplazado a un lado y algo por encima. Ese
 * desplazamiento es todo el efecto: una luz frontal aplana los pliegues y una
 * rasante los levanta. Es la diferencia entre ver una mancha rosa y ver
 * volumen, y es lo que convierte el umbral en "hay una superficie enorme
 * delante" en vez de "hay algo oscuro".
 *
 * ## Y por qué se apaga
 *
 * Nace con `cortex` —la misma señal que cierra el cristal— y muere al entrar,
 * porque dentro la luz tiene que venir de la propia red. Fuera de esa ventana
 * no existe: su intensidad baja a cero. NO se apaga con `visible`, y eso es
 * deliberado: cambiar el numero de luces de la escena obliga a three a
 * recompilar todos los materiales. Ver la nota de `RoomLight`.
 *
 * Determinista: su intensidad y su posición salen de `journey.progress`. No hay
 * reloj, ni parpadeo, ni pulso.
 */

/** Cuánto se aparta del eje de la cámara, en unidades de mundo. */
const OFFSET = { side: 1.5, up: 0.9, back: 0.6 }

/** Intensidad en el pico. Cálida, del lado del coco, nunca blanca. */
const PEAK = 26

/* Preasignados: nada de `new Vector3()` dentro del bucle. */
const POSITION = new Vector3()
const RIGHT = new Vector3()

/**
 * ── LA LUZ DE LA SALA ─────────────────────────────────────────────────────
 *
 * Dos direccionales que solo existen mientras se HABITA el interior, y son las
 * que de verdad hacen que ahí dentro se vea un cerebro y no una cueva.
 *
 * ## Por qué direccionales y no una puntual
 *
 * Se intentó con la puntual que ya hay en el centro del cerebro, subiéndola del
 * 4% al 28% con el argumento de que era "la red iluminando su habitación". El
 * frame de 0,63 salió con la mitad inferior quemada a blanco.
 *
 * Es el error que este proyecto ya tiene escrito dos veces: **una luz con caída
 * cuadrática dentro de una malla orgánica no modela, amplifica.** Medido con
 * rayos desde el centro, la primera pared de la sala está a 0,44 del tamaño de
 * mediana y a 0,084 en el peor caso — o sea que entre el pliegue más cercano al
 * centro y la pared del fondo hay un factor de cien. No existe un valor bueno.
 *
 * Una direccional no tiene posición: entrega lo mismo a todas las superficies
 * que miran hacia ella, esté a un palmo o a dos unidades. Sobre una anatomía de
 * giros y surcos eso es exactamente lo que hace falta, porque lo que dibuja el
 * volumen es la ORIENTACIÓN de cada pliegue, no su distancia.
 *
 * ## Por qué DOS
 *
 * Una sola deja el lado opuesto plano. La clave cálida entra por donde se ha
 * atravesado la corteza —arriba y por delante, el marfil del acto 1 filtrándose
 * por el tejido— y el relleno frío viene del lado contrario, en el añil de la
 * paleta y a un quinto de intensidad.
 *
 * Ese contraste cálido/frío es lo que separa un interior iluminado de un
 * interior alumbrado, y de paso es la única aparición del añil en el acto 5:
 * el manual lo pide como el 10% de la paleta y aquí cae donde no compite con
 * nada, en las sombras.
 *
 * Determinista y gratis: no proyectan sombras, no tienen posición que actualizar
 * y su intensidad sale de `dwell(progress)`.
 */
/**
 * ── LA CLAVE NO PUEDE SER CÁLIDA SI EL ALBEDO YA LO ES ────────────────────
 *
 * El tercio inferior del cuadro —la pared que la clave alcanza casi de frente—
 * salía terracota tirando a salmón, y no era el carmín: era la suma de dos
 * cálidos. El albedo de la sala tiene la proporción 1 : 0,70 : 0,53 y la clave
 * iba en `#F3E4CE`, que es 1 : 0,94 : 0,85. El producto sigue siendo coco, pero
 * al subir la intensidad **el canal rojo satura primero** y el tono se desplaza
 * hacia el naranja: luz cálida sobre materia cálida no da más calidez, da rosa.
 *
 * Con una clave casi neutra —`#F2EDE3`, 1 : 0,98 : 0,93— el calor lo pone
 * enteramente la materia, que es de donde tiene que venir, y los tres canales
 * llegan juntos al techo en vez de hacerlo el rojo solo.
 *
 * El relleno añil sube a 0,62: es el segundo acento atmosférico y solo se lee
 * en las caras que dan la espalda a la clave, o sea en la profundidad. Por
 * debajo no se percibe; por encima, el interior empieza a ser "marrón y azul",
 * que no es lo que se busca.
 */
const ROOM = { key: 1.16, fill: 0.62, blood: 0.42 }

function RoomLight() {
  const keyRef = useRef(null)
  const fillRef = useRef(null)
  const bloodRef = useRef(null)
  const lastRef = useRef(-1)

  useFrame(() => {
    const room = dwell(journey.progress)
    if (Math.abs(room - lastRef.current) < 0.003) return
    lastRef.current = room

    /*
      ── Y NO SE APAGAN CON `visible`, SOLO CON LA INTENSIDAD ─────────────

      Encender y apagar una luz cambia el NUMERO DE LUCES de la escena, y de
      ese numero depende la firma del programa de cada material: three las
      recompila todas. Medido con `journey.mjs` contra el build, togglear estas
      dos subio los frames de mas de 33 ms de 19 a 31, con picos de 117 y 167 ms
      justo en los puntos donde se encienden y se apagan.

      Dejandolas siempre en la escena con intensidad cero, el programa no cambia
      nunca. El coste es un termino mas en el sombreador durante todo el
      recorrido, que para dos direccionales sin sombras es ruido.
    */
    if (keyRef.current) keyRef.current.intensity = ROOM.key * room
    if (fillRef.current) fillRef.current.intensity = ROOM.fill * room
    if (bloodRef.current) bloodRef.current.intensity = ROOM.blood * room
  })

  return (
    <>
      {/* La clave: cálida, desde arriba y por delante — por donde se ha entrado. */}
      <directionalLight
        ref={keyRef}
        position={[2.8, 1.5, 2.2]}
        color="#F2EDE3"
        intensity={0}
      />
      {/* El relleno: añil, del lado contrario, para que la sombra tenga color. */}
      <directionalLight
        ref={fillRef}
        position={[-2.6, -1.2, -2.0]}
        color="#8FA8D0"
        intensity={0}
      />
      {/*
        ── EL CARMIN VIENE DE ABAJO, Y ES UNA LUZ ──────────────────────────

        Es la decision de direccion del interior, y sustituye a subirle el
        emisivo a la pared.

        Un emisivo pinta la superficie ENTERA por igual: la textura del GLB
        tiene magenta en mas de la mitad de sus pixeles, asi que puesto como
        emissiveMap el carmin no caia en los surcos, caia en todas partes. Ese
        era el "interior demasiado rosa", y no se arreglaba bajandolo —bajarlo
        solo lo apagaba, seguia siendo uniforme—.

        Una luz SI distingue. Esta viene de abajo y de atras, asi que solo
        alcanza las caras que miran hacia abajo: los flancos inferiores de cada
        giro y el fondo de las hendiduras. Las crestas, que miran hacia la
        clave, se quedan en coco.

        Resultado: la materia es marron y el carmin aparece donde hay
        profundidad, que es exactamente el reparto que pide la identidad. Y es
        el rosa de marca del acto 3, no el magenta del asset.
      */}
      <directionalLight
        ref={bloodRef}
        position={[0.6, -3.0, -1.4]}
        color="#C4707F"
        intensity={0}
      />
    </>
  )
}

export default function CortexLight() {
  const lightRef = useRef(null)

  useFrame((state) => {
    const light = lightRef.current
    if (!light) return

    const p = journey.progress
    /**
     * Sube al acercarse y se apaga al estar dentro. El `1 - inside` no es
     * redundante: `cortex` se queda en uno para siempre una vez alcanzado, y
     * esta luz no puede seguir encendida en la travesía interior.
     */
    /**
     * ── Y NO SE APAGA AL ENTRAR ──────────────────────────────────────────
     *
     * Iba multiplicada por `1 − insideness`, o sea que se extinguía justo al
     * cruzar. Era correcto cuando dentro no había paredes que iluminar: la sala
     * era un elipsoide liso que se pintaba a sí mismo con un emisivo.
     *
     * Ahora la sala es la anatomía del cerebro, y una superficie de giros y
     * surcos NO se lee sin una luz que la roce. Esta es esa luz: va al lado y un
     * poco por encima de la cámara, así que cada pliegue proyecta su propia
     * sombra y la pared deja de ser una mancha para tener relieve.
     *
     * Dentro baja al 45%, no a cero. Ahí ya no tiene que revelar una corteza que
     * llena el cuadro, solo modelar una pared que está a una unidad.
     */
    /*
      Y baja mientras se PERFORA. Es una puntual con caída cuadrática: contra
      un pliegue a medio palmo entrega veinte veces su intensidad nominal, y en
      0,42 eso quemaba a blanco las caras que la cámara tiene encima justo
      cuando hay que ver materia.

      Pero la resta tiene que ser PEQUEÑA: entre 0,44 y 0,48 la cámara está
      dentro de la masa y esta luz es la única que hay. Bajándola al 35% —que
      es lo que parecía prudente cuando el cruce era translúcido y se lavaba
      solo— el cuadro se iba a negro, que es el fundido que no puede haber.
    */
    /*
      `pierce` es una RAMPA que se queda en uno, así que restarle directamente
      apagaba también la sala. Lo que hay que bajar es el INSTANTE de perforar,
      no lo que viene después: una campana sobre el mismo corte.
    */
    /**
     * ── Y AHORA CUELGA DE `enclosure`, NO DE `insideness` ─────────────────
     *
     * Con `insideness` funcionaba mientras el recorrido no salía. Al construir
     * la salida se vio el fallo: `insideness` baja entre 0,76 y 0,86, así que
     * esta luz volvía a su intensidad plena JUSTO durante el cruce de vuelta,
     * con la cámara todavía a medio palmo de los pliegues. Una puntual con
     * caída cuadrática a esa distancia entrega veinte veces su valor nominal, y
     * el frame de 0,79 salía como una pantalla de rosa quemado.
     *
     * `enclosure` mide lo que de verdad decide cuánta luz cabe: cuánta corteza
     * hay alrededor. Se queda cerrada mientras hay tejido cerca y se abre
     * cuando el cerebro vuelve a ser un objeto que se mira de lejos.
     *
     * Y la campana del cruce pasa a ser `crossing`, que es la de las DOS
     * membranas. `pierce` solo conocía la de entrada.
     */
    const through = crossing(p)
    /**
     * ── Y DENTRO CAMBIA DE CARACTER: DE FOCO A LUZ DE SALA ────────────────
     *
     * Atravesando, una puntual con caida cuadratica es lo correcto: cae rapido,
     * no lava el plano y deja ver materia a un palmo. Habitando el interior es
     * justo lo que no hace falta — la camara esta a 0,36 del centro y la pared
     * a 1,0, asi que la misma caida entrega veinte veces mas a lo que roza que
     * a lo que hay al fondo. En pantalla eso es un foco quemado sobre un campo
     * negro, o sea la cueva que este tramo tenia que dejar de ser.
     *
     * Con `dwell` la luz pasa a caida LINEAL y mas alcance mientras se recorre la
     * red, y vuelve a ser un foco en los dos cruces. La intensidad nominal baja
     * en la misma proporcion, porque con decay 1 a dos unidades entrega la
     * mitad en vez de la cuarta parte.
     *
     * No es una luz nueva: es la misma cambiando de comportamiento segun lo que
     * este haciendo la camara.
     */
    const room = dwell(p)
    const strength = cortex(p) * (1 - enclosure(p) * 0.42) * (1 - through * 0.3)

    /*
      Misma regla: se apaga con la intensidad, no con `visible`. Apagarla
      cambiaba el numero de luces de la escena y obligaba a three a recompilar
      todos los materiales, y eso son frames de cien milisegundos justo en el
      umbral de la corteza.
    */
    if (strength <= 0.01) {
      light.intensity = 0
      return
    }

    /*
      Dentro se retira casi del todo, y esa es la decision.

      Es una puntual y viaja PEGADA a la camara, asi que dentro de la sala
      siempre tiene algun pliegue a medio metro: con la intensidad del cruce,
      el frame de 0,63 salia con la mitad inferior quemada a blanco. Se probo
      bajandole la caida a lineal y alargandole el alcance —para que repartiera
      en vez de concentrar— y sigue habiendo un pliegue a medio metro.

      Su trabajo es REVELAR la corteza cuando se llega y cuando se atraviesa, y
      ese trabajo lo hace bien. Dentro le toca a otras dos: el hemisferico, que
      tiene direccion y modela los giros sin foco, y la puntual del centro del
      cerebro, que es la red iluminando su propia habitacion y trae la caida
      radial que da profundidad.

      Se queda al 8% como un apunte de direccion, no como fuente.
    */
    light.decay = 2 - room
    light.distance = 9 + room * 9
    light.intensity = PEAK * strength * (1 - room * 0.965)

    /**
     * Va donde está la cámara, apartada. Se coloca en coordenadas del mundo
     * usando los ejes de la propia cámara, así que el sesgo lateral se
     * mantiene sea cual sea la dirección de entrada.
     */
    const camera = state.camera
    // La primera columna de la matriz de la cámara es su eje "derecha".
    RIGHT.setFromMatrixColumn(camera.matrixWorld, 0)
    POSITION.copy(camera.position).addScaledVector(RIGHT, OFFSET.side)
    POSITION.y += OFFSET.up
    light.position.copy(POSITION)
  })

  return (
    <>
      <pointLight
        ref={lightRef}
        color="#F0C9A8"
        intensity={0}
        distance={9}
        decay={2}
      />
      <RoomLight />
    </>
  )
}
