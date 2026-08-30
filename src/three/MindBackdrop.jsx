import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, Color, ShaderMaterial, Vector3 } from 'three'
import { journey } from '../journey/clock'
import { atmosphereAt, descent, layerOpacity, ramp } from '../journey/stages'

/**
 * El fondo del interior.
 *
 * Es la pieza que faltaba para que esto pareciera un sitio. Sin ella, detrás
 * de los nodos se veía el crema de la página, y el resultado era que la red no
 * se leía como un espacio: se leía como unos puntos pegados sobre el fondo de
 * una web. Da igual lo bien que estén los nodos, un objeto sin entorno siempre
 * parece un recorte.
 *
 * ## La paleta, y la vuelta que ha dado
 *
 * **No es negro.** La marca es cálida, y un vacío negro la convertiría en otra
 * web de "tech oscuro". La base es un marrón casi negro: se lee como estar
 * dentro de algo orgánico, no dentro de un vacío.
 *
 * Pero durante mucho tiempo tampoco era eso. Los tres colores eran `#120B16`,
 * `#1C0F1D` y `#4A2130`, y los tres tienen el azul por encima del rojo o una
 * saturación de vino muy alta: **eran violeta y plum**, no marrón. Medido en
 * las capturas, el centro de la pantalla dentro de la mente daba `#441E2D`. Con
 * toda la red rosa encima, el interior entero se leía morado y rosa, que es
 * justo lo que la identidad prohíbe.
 *
 * Ahora los tres tienen una función distinta y ninguno es violeta:
 *
 *     uDeep   añil muy profundo. LO LEJOS — lo que antes ponía el lila
 *     uMid    marrón casi negro. El espacio alrededor del cerebro
 *     uGlow   coco cálido. El resplandor justo detrás
 *
 * El reparto frío-cálido es el que hace el trabajo: lo lejano se va al azul y
 * lo cercano se queda caliente, que es como se lee la distancia en cualquier
 * plano. Antes los tres estaban en la misma familia y por eso no había
 * profundidad que ver.
 *
 * ## El añil va en uDeep y no en uMid, y eso costó una vuelta
 *
 * Estuvo en `uMid`, que parecía lo natural —el término medio del degradado—.
 * En el sombreador, sin embargo, `uMid` es lo que se ve MIRANDO HACIA EL
 * CEREBRO, o sea el hemisferio delantero entero. Medido en la vista general de
 * la constelación, el 61% de los píxeles con color caían en el rango violeta:
 * un cielo azul oscuro con el rosa del bloom del cerebro por encima da violeta,
 * exactamente el color que la identidad prohíbe.
 *
 * En `uDeep` el añil es lo que queda por los bordes y a la espalda: se lee como
 * distancia y no como el color del sitio.
 *
 * Y va MUY oscuro a propósito. Si se ve azul, hay demasiado.
 *
 * **El resplandor sigue al cerebro, no a la cámara.** Se calcula el ángulo
 * entre hacia dónde mira cada píxel y dónde está el cerebro, así que el halo
 * queda siempre centrado en él aunque la cámara orbite. Un degradado fijo
 * sobre la esfera no haría eso: giraría con el fondo y delataría que hay una
 * esfera ahí.
 */

/**
 * ── LA GANANCIA QUE DEVUELVE EL COLOR QUE DICE LA RAMPA ────────────────────
 *
 * La tabla del aire está escrita en sRGB, como cualquier paleta: `#40382F` es
 * el color que se quiere VER. Pero esto es una escena, y una escena pasa por
 * la curva de tonos ACES antes de llegar a la pantalla, así que un color
 * puesto tal cual sale más oscuro de lo que dice el número. Medido: el aire de
 * 0,22 se pedía en 59 y se veía en 39.
 *
 * ACES está para comprimir las luces altas, no para apagar un fondo. En la
 * zona baja su respuesta es casi lineal, así que basta con una ganancia
 * constante para deshacerla: despejando `RRTAndODTFit(v) = objetivo` para un
 * valor de fondo típico sale 1,45.
 *
 * No es un ajuste a ojo ni un "súbelo hasta que se vea": es la conversión que
 * faltaba entre el espacio en el que se decide un color y el espacio en el que
 * se dibuja. La viñeta del DOM no la lleva porque el DOM no pasa por ACES —lee
 * la misma rampa y la pinta tal cual—.
 */
const ACES_GAIN = 1.45

const VERTEX = /* glsl */ `
  varying vec3 vWorld;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const FRAGMENT = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uMid;
  uniform vec3 uGlow;
  uniform vec3 uCenter;
  uniform vec3 uAir;
  uniform float uAirMix;
    uniform float uOpacity;

  varying vec3 vWorld;

  void main() {
    // Hacia dónde mira este píxel, y dónde queda el cerebro desde aquí.
    vec3 ray = normalize(vWorld - cameraPosition);
    vec3 toCenter = normalize(uCenter - cameraPosition);

    // 1 = el píxel está justo sobre el cerebro, -1 = a la espalda.
    float align = dot(ray, toCenter);

    // Halo amplio alrededor del cerebro.
    float halo = smoothstep(-0.1, 1.0, align);
    // Y un núcleo más cerrado, para que el centro no quede lavado.
    float core = smoothstep(0.75, 1.0, align);

    vec3 color = mix(uDeep, uMid, halo);
    /**
     * 0.55 y no 0.85. El resplandor llenaba el centro de la pantalla, que es
     * donde está el cerebro y donde la red ya pone todo el color que hace
     * falta: dos fuentes del mismo tono en el mismo sitio es lo que hacía que
     * el interior se leyera de un solo color. Ahora es un charco de luz por
     * detrás, no el color del sitio.
     */
    color = mix(color, uGlow, core * 0.55);

    // Caída vertical suave: sin ella el fondo se lee como una pared plana.
    float height = clamp(ray.y * 0.5 + 0.5, 0.0, 1.0);
    color *= mix(0.82, 1.06, height);

    /**
     * El telón es OPACO siempre, y la transición se hace por COLOR: de crema
     * —el mismo de la página— al interior oscuro.
     *
     * Antes se desvanecía por alfa, y eso rompía el cerebro de cristal. Un
     * material transmisivo dibuja lo que hay detrás, y three lo saca de un
     * búfer en el que solo entran los objetos OPACOS. Con el telón, los nodos
     * y las líneas todos transparentes, en cuanto la mascota terminaba de
     * irse no quedaba nada opaco en la escena: el cerebro se quedaba
     * refractando un búfer vacío y desaparecía.
     *
     * Siendo opaco entra en ese búfer, así que el cristal tiene algo que
     * refractar. Y visualmente no cambia nada: partir del crema de la página
     * es indistinguible de no tener telón.
     */
    /**
     * SE MEZCLA, NO SUSTITUYE. Aquí estaba el destello.
     *
     * Esto mezclaba contra un color fijo y el material era OPACO: en el
     * instante en que el telón se encendía —siempre en p=0,115— pintaba la
     * pantalla entera de ese gris pardo. Medido a pasos de
     * 0,005, la luminancia del cuadro caía de 167 a 143 **en un solo paso**,
     * mientras el resto del descenso baja de 2 en 2. Eso es el fogonazo: la
     * arquitectura de la sala desaparecía de golpe y la sustituía un campo
     * plano.
     *
     * El razonamiento original —arrancar en la media del entorno para que el
     * relevo no se notara— era correcto cuando el entorno medía 143. Dejó de
     * serlo cuando el fondo se volvió más nítido y más claro: ahora mide 167.
     * Un valor copiado a mano de una medición caduca cuando cambia lo medido.
     *
     * Con alfa el telón se funde sobre lo que hay detrás en vez de taparlo, así
     * que la sala se disuelve progresivamente. Y cuando la opacidad llega a uno
     * vuelve a ser opaco del todo, que es lo que el cristal necesita para tener
     * algo que refractar.
     */
    /*
      ── EL AIRE DEL DESCENSO, POR ENCIMA DEL COLOR DE LA MENTE ────────────

      Los tres colores de arriba son los del INTERIOR: negro cálido, añil
      profundo y el resplandor coco. Correctos una vez dentro, y equivocados
      antes: este telón se enciende en 0,10 y desde 0,17 es prácticamente lo
      único que llena el cuadro, así que entre 0,17 y 0,34 pintaba el negro de
      la mente mientras el recorrido todavía está fuera, bajando.

      Medido: en 0,22 la luminancia media del cuadro era 10 sobre 255. Eso era
      el "tramo muerto", y la lección es que no faltaba estructura —los anillos
      del paso estaban puestos y contados— sino AIRE: sin nada iluminado
      detrás, la estructura tampoco tiene contra qué leerse.

      uAir es el color del espacio en este momento del descenso, pedido a la
      misma rampa que tiñe la viñeta del DOM —vive en stages.js justamente
      para que no haya dos—. uAirMix se retira al llegar a la corteza: de ahí
      en adelante el color del sitio ya no lo pone el aire, lo pone el cerebro.
    */
    color = mix(color, uAir, uAirMix);

    gl_FragColor = vec4(color, uOpacity);
  }
`

export default function MindBackdrop({ center, radius }) {
  const meshRef = useRef(null)

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          // Paleta del interior. Ver la cabecera: base marrón, profundidad
          // añil, resplandor coco. Ningún violeta.
          uDeep: { value: new Color('#0E1520') },
          uMid: { value: new Color('#120D0B') },
          uGlow: { value: new Color('#4A2E24') },
          uCenter: { value: new Vector3(...center) },
          uOpacity: { value: 0 },
          uAir: { value: new Color('#463025') },
          uAirMix: { value: 0 },
        },
        // Dibujado por dentro: la cámara está dentro de la esfera.
        side: BackSide,
        // Se MEZCLA. Ver la nota larga del sombreador: opaco, el encendido era
        // un escalón de 24 puntos de luminancia en un solo frame.
        transparent: true,
        // No escribe profundidad: es el telón, y no puede estorbar a nada de lo
        // que se dibuje después.
        depthWrite: false,
        /**
         * ── PERO SÍ LA COMPRUEBA ─────────────────────────────────────────
         *
         * Estaba en `depthTest: false`, y mientras todo lo de la escena fue
         * transparente daba igual: con `renderOrder: -10` este telón se
         * dibujaba el primero y lo demás encima.
         *
         * Deja de dar igual en cuanto la sala cortical pasa a ser OPACA. Los
         * opacos se dibujan ANTES que los transparentes, así que el telón
         * —transparente, con la opacidad en uno y sin comprobar profundidad—
         * pasó a pintarse encima de la sala y la borraba entera. Medido: entre
         * 0,45 y 0,50 la desviación de luminancia del cuadro era de 2,7 sobre
         * 255, o sea un campo liso. No era que la sala estuviera oscura: es que
         * no se veía ni un píxel de ella.
         *
         * Comprobando profundidad hace lo que tiene que hacer un cielo:
         * rellenar lo que nadie ha pintado.
         */
        depthTest: true,
      }),
    [center],
  )

  /**
   * Se enciende en el instante en que nace el cerebro, ni antes ni después.
   *
   * Dejarlo encendido siempre tapaba la portada: al ser opaco, su crema plano
   * se comía el degradado radial del fondo de la página, y un plano detrás de
   * un modelo 3D lo convierte en un recorte pegado.
   *
   * Encenderlo con el mismo umbral que el cerebro resuelve las dos cosas: en
   * la portada no existe, y en cuanto el cristal aparece ya tiene delante un
   * objeto opaco que refractar. Y como arranca en el crema de la página, el
   * momento de encenderse no se ve.
   */
  useFrame(() => {
    const p = journey.progress
    const value = layerOpacity('mind', p)
    material.uniforms.uOpacity.value = value
    if (meshRef.current) meshRef.current.visible = value > 0.0005
    if (!meshRef.current || !meshRef.current.visible) return

    /**
     * El aire se calcula aquí y no en el sombreador: son tres restas por frame
     * contra hacerlo por píxel, y además así los dos lectores de la rampa —esto
     * y la viñeta del DOM— leen exactamente el mismo número.
     *
     * Se retira entre 0,30 y 0,42, que es el tramo en el que la corteza pasa a
     * llenar el cuadro: a partir de ahí el color del espacio ya no lo pone el
     * aire, lo pone el cerebro.
     */
    const air = atmosphereAt(descent(p))
    material.uniforms.uAir.value.setRGB(
      (air[0] / 255) ** 2.2 * ACES_GAIN,
      (air[1] / 255) ** 2.2 * ACES_GAIN,
      (air[2] / 255) ** 2.2 * ACES_GAIN,
    )
    material.uniforms.uAirMix.value = 1 - ramp(p, 0.3, 0.42)
  })

  return (
    // `renderOrder` muy bajo para que se pinte antes que todo lo demás.
    <mesh ref={meshRef} position={center} renderOrder={-10} raycast={() => null}>
      {/* Pocos segmentos: es un degradado, no hace falta una esfera fina. */}
      <sphereGeometry args={[radius * 9, 24, 16]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
