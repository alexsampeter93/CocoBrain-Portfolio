import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, FrontSide, MathUtils, Vector3 } from 'three'
import gsap from 'gsap'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { usePointer } from '../../hooks/usePointer'
import { journey } from '../../journey/clock'
import { layerOpacity, ramp } from '../../journey/stages'

/**
 * Ojo con los nombres: los que puso Meshy no corresponden con lo que
 * contienen los archivos. `Coco_Thinker` es el que sostiene el cerebro en la
 * mano, y `Brainy_Coconut` es el pensativo.
 */
export const MASCOT_MODELS = {
  brain: '/preview/olaz-thinker.glb',
  thinker: '/preview/olaz-brain.glb',
}

const DRACO_PATH = '/draco/'

/**
 * Limites de la mirada.
 *
 * Estaban en 65 y 26 grados, y era demasiado: el personaje se pasaba el rato
 * girando de lado a lado y mareaba. Un gesto de atencion no necesita amplitud,
 * necesita direccion. Con 24 grados se entiende perfectamente que te sigue, y
 * ademas la cara se mantiene siempre de frente.
 */
const MAX_YAW = MathUtils.degToRad(24)
const MAX_PITCH = MathUtils.degToRad(11)

/** Bajo a proposito: el gesto llega despacio y se lee como calma, no como nervio. */
const LOOK_EASING = 0.055

/**
 * Tramo en el que el personaje se queda quieto.
 *
 * En cuanto empiezas a bajar deja de seguir al cursor y se para. Son dos
 * problemas de un tiro:
 *
 * 1. El cerebro de la mano cuelga del grupo que rota, asi que al girar el
 *    personaje el cerebro se movia —y la camara volaba a la posicion medida en
 *    reposo, no a donde estaba en ese momento. De ahi que "segun la posicion
 *    del cursor, la camara no va al cerebro".
 * 2. Un personaje que sigue moviendose mientras la camara se le echa encima
 *    compite con el movimiento de camara y ensucia la entrada.
 *
 * Ademas tiene sentido narrativo: te saluda mientras miras, y se queda quieto
 * cuando decides entrar.
 */
const SETTLE_RANGE = [0.02, 0.14]

/**
 * Distancia en pantalla, en coordenadas normalizadas, a la que la mirada
 * llega a su tope. 0.55 significa: separando el cursor algo mas de media
 * pantalla del personaje, ya esta girado del todo.
 *
 * Antes esto se resolvia proyectando el cursor al espacio 3D con `unproject`
 * a profundidad 0.5, pero con near 0.1 y far 100 ese punto cae a 0.4 unidades
 * de la camara: practicamente encima. El angulo resultante variaba unos dos
 * grados y por eso el seguimiento no se notaba.
 */
const LOOK_SATURATION = 0.85

// Inclinacion del cuerpo acompanando a la mirada. Es lo que hace que el
// gesto se note: girar solo sobre el eje vertical se lee como un maniqui
// rotando; inclinarse un poco se lee como interes.
const LEAN_AMOUNT = 0.05

/**
 * Vector reutilizado para medir la posicion en pantalla.
 *
 * Crear un `new Vector3()` dentro del bucle de render son sesenta objetos por
 * segundo que el recolector de basura tiene que limpiar. Cada limpieza es una
 * micropausa, y una micropausa en mitad de un scroll se ve como un tiron.
 */
const SCRATCH = new Vector3()

/**
 * La respiración y el flotado, EXPORTADOS.
 *
 * No son constantes privadas porque la sombra de contacto los necesita: el
 * personaje sube y baja 0,02 unidades y encoge 0,01 al respirar, así que sus
 * pies se separan del suelo hasta 0,035. Una sombra que no lo sigue convierte
 * ese gesto en flotación —que es literalmente lo que estaba pasando—.
 *
 * Se comparten en vez de duplicarse: los dos `useFrame` corren en el mismo
 * bucle con el mismo reloj, así que calculando la misma expresión coinciden
 * exactamente. Copiar los números en el otro archivo habría durado hasta el
 * primer ajuste.
 */
/*
  Se exportaban también `feetLift`, `BREATH_*` y `FLOAT_*` para que la sombra
  del suelo siguiera la altura real de los pies. La sombra ya no existe —ver §7
  de CLAUDE.md— y con ella se ha ido lo que solo servía para alimentarla:
  ninguno de esos valores tiene ya un segundo lector.
*/
const BREATH_SPEED = 1.5
const BREATH_AMOUNT = 0.01

const FLOAT_AMPLITUDE = 0.02
const FLOAT_SPEED = 0.6

export default function Mascot3D({
  url,
  children,
  reaction = 0,
  startle = 0,
  turnAway = 0,
  lookEnabled = true,
  /** Altura del personaje en unidades de mundo. Sale de `tokens.mascot.height`. */
  height = 3,
  /** Capa de `LAYERS` que decide cuando se desvanece. */
  layer = 'mascot',
  /** Punto del modelo cuya posicion en el mundo hay que medir y reportar. */
  anchorLocal = null,
  onMeasure,
  onPoke,
}) {
  const { scene } = useGLTF(url, DRACO_PATH)
  const camera = useThree((state) => state.camera)
  const reducedMotion = usePrefersReducedMotion()
  const pointer = usePointer()

  const fitRef = useRef(null)
  const motionRef = useRef(null)
  const breathRef = useRef(null)
  const jumpRef = useRef(null)
  // -1 para que el primer frame siempre escriba.
  const fadeRef = useRef(-1)

  /**
   * Los materiales se recogen UNA vez en una lista.
   *
   * Antes el desvanecido hacia `scene.traverse(...)` en cada frame. Recorrer
   * el grafo entero de una malla de noventa mil triangulos sesenta veces por
   * segundo, para tocar unas pocas opacidades, era una de las fuentes reales
   * de tirones. Recorrer y tocar son dos cosas distintas: lo que hay que hacer
   * cada frame es tocar.
   */
  const { tuned, materials } = useMemo(() => {
    const list = []

    scene.traverse((object) => {
      if (!object.isMesh || !object.material) return
      // Meshy exporta metallic-roughness que bajo un HDRI deja el coco con
      // brillo de plastico. Se anula y se sube la respuesta al entorno.
      object.material.metalness = 0
      /**
       * 0,95 y no 1,25, y lo decide el cerebro de la mano.
       *
       * Un HDRI de estudio ilumina desde todas las direcciones a la vez: sube
       * el nivel general y APLANA el relieve, porque casi no deja lado en
       * sombra. En el coco no se notaba —tiene una textura de fibra que ya trae
       * su propio detalle— pero el cerebro es una superficie lisa de pliegues,
       * y en el plano corto de 0,10 llenaba el cuadro como una masa rosa sin
       * volumen.
       *
       * Bajándolo, la luz direccional y la de la mano vuelven a mandar sobre el
       * relieve y los surcos se leen. Lo que se pierde es medio punto de nivel
       * en la portada, que es justo lo que sobraba.
       */
      object.material.envMapIntensity = 0.95
      /**
       * El exportador marca el material como de doble cara. En una malla
       * cerrada como esta no aporta nada y sale caro: desactiva el descarte de
       * caras traseras, asi que la tarjeta rasteriza tambien las mitad de los
       * triangulos que miran hacia el lado contrario y que nunca se ven.
       */
      object.material.side = FrontSide
      object.material.needsUpdate = true
      list.push(object.material)
    })

    return { tuned: scene, materials: list }
  }, [scene])

  /**
   * El personaje mide SIEMPRE lo mismo en el mundo.
   *
   * Antes el tamano dependia tambien del ancho de la pantalla, asi que al
   * cambiar de tamano la ventana —o al minimizarla y restaurarla— el modelo se
   * reescalaba y daba un salto. Ese era el "Olaz se sigue moviendo".
   *
   * Ahora la unica variable es `height`, y lo que se adapta a la pantalla es
   * la DISTANCIA DE LA CAMARA, que se calcula en `journey/framing.js`. Es
   * ademas como funciona una camara de verdad: no se encoge el actor, se echa
   * uno para atras.
   */
  useLayoutEffect(() => {
    const group = fitRef.current
    if (!group) return

    group.scale.setScalar(1)
    group.position.set(0, 0, 0)

    const box = new Box3().setFromObject(group)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    if (size.y === 0) return

    const fit = height / size.y
    group.scale.setScalar(fit)
    group.position.set(-center.x * fit, -center.y * fit, -center.z * fit)

    if (!onMeasure) return

    /**
     * Dos medidas suben hacia el recorrido, y las dos son de las que "si
     * dependen de la geometria, se miden":
     *
     * - el ancho real ya escalado, para que la camara sepa cuanto tiene que
     *   abarcar sin suponer la proporcion del modelo;
     * - donde ha quedado el cerebro de la mano, que es la puerta por la que
     *   entra la camara.
     */
    group.updateWorldMatrix(true, false)

    onMeasure({
      width: size.x * fit,
      anchor: anchorLocal ? group.localToWorld(anchorLocal.clone()) : null,
    })
  }, [tuned, height, anchorLocal, onMeasure])

  /** Salto con aplastado: la unica deformacion que aguanta una malla fusionada. */
  useEffect(() => {
    if (!reaction || reducedMotion) return

    const group = jumpRef.current
    const breath = breathRef.current
    if (!group || !breath) return

    // Matar el anterior antes de arrancar: si se solapan, tiembla.
    gsap.killTweensOf([group.position, breath.scale])

    const timeline = gsap.timeline()
    timeline
      .to(breath.scale, { x: 1.1, y: 0.86, duration: 0.11, ease: 'power2.out' })
      .to(group.position, { y: 0.32, duration: 0.3, ease: 'power2.out' }, '<')
      .to(breath.scale, { x: 0.93, y: 1.12, duration: 0.18, ease: 'power2.out' }, '<0.05')
      .to(group.position, { y: 0, duration: 0.26, ease: 'power2.in' })
      .to(breath.scale, { x: 1.14, y: 0.82, duration: 0.09, ease: 'power2.out' })
      .to(breath.scale, { x: 1, y: 1, duration: 0.6, ease: 'elastic.out(1, 0.42)' })

    return () => timeline.kill()
  }, [reaction, reducedMotion])

  /**
   * Respingo al empezar a bajar. Mas corto y mas seco que el salto: es un
   * susto, no una celebracion.
   */
  useEffect(() => {
    if (!startle || reducedMotion) return

    const group = jumpRef.current
    const breath = breathRef.current
    if (!group || !breath) return

    gsap.killTweensOf([group.position, breath.scale])

    const timeline = gsap.timeline()
    timeline
      .to(breath.scale, { x: 0.9, y: 1.16, duration: 0.09, ease: 'power3.out' })
      .to(group.position, { y: 0.14, duration: 0.16, ease: 'power3.out' }, '<')
      .to(group.position, { y: 0, duration: 0.32, ease: 'bounce.out' })
      .to(breath.scale, { x: 1, y: 1, duration: 0.45, ease: 'elastic.out(1, 0.4)' }, '<')

    return () => timeline.kill()
  }, [startle, reducedMotion])

  /*
    ── AQUÍ HABÍA "GESTOS DE REPOSO", Y ERAN UN CICLO AUTÓNOMO ──────────────

    Un `setTimeout` cada 5,5–11 segundos elegía con `Math.random()` entre un
    brinco, un suspiro y un bamboleo. Dos motivos para que salga, y el segundo
    es el que manda:

    - **no era determinista**: volver al mismo punto del scroll no devolvía el
      mismo cuadro, porque dependía del reloj del sistema y de un dado;
    - **movía la imagen con el usuario quieto**, que es exactamente lo que esta
      fase venía a quitar.

    Lo que hace que la portada no se lea como un modelo expuesto no es que el
    personaje se menee solo: es que sigue al cursor —eso sí se queda, porque
    responde a una acción— y que en cuanto empiezas a bajar, flota y respira.
  */


  /**
   * Desvanecido por opacidad en vez de desmontar el modelo.
   *
   * Es lo que permite que la camara atraviese la portada sin tirones: la
   * malla sigue en memoria y en la GPU, solo deja de verse. Desmontarla a
   * mitad de recorrido era la causa de los saltos.
   */
  useFrame(() => {
    const fade = layerOpacity(layer, journey.progress)

    // Durante la mayor parte del recorrido el desvanecido no se mueve (vale 1
    // en la portada y 0 dentro del cerebro). Si no ha cambiado no hay nada que
    // escribir, y esos son casi todos los frames.
    if (Math.abs(fade - fadeRef.current) < 0.002) return
    fadeRef.current = fade

    const visible = fade > 0.01
    tuned.visible = visible
    if (!visible) return

    /**
     * ── Y CAMBIAR `transparent` OBLIGA A RECOMPILAR ───────────────────────
     *
     * Esto escribía `material.transparent = fade < 0.999` sin más, y ahí estaba
     * la única parte del recorrido que NO era reversible.
     *
     * `transparent` no es un número que se lea por frame: decide un `#define`
     * del sombreador —con `OPAQUE` puesto, el fragmento fuerza su alfa a uno—
     * y ese define se resuelve al COMPILAR. Cambiando el flag sin
     * `needsUpdate`, el material dice una cosa y el programa hace otra, y cuál
     * de las dos gana depende de con qué estado se compiló la primera vez.
     *
     * Medido bajando y subiendo por los mismos veintiún puntos: en p=0,09 el
     * cerebro de la mano salía OPACO en la primera pasada y al 65% —que es su
     * valor correcto— en todas las demás. Diferencia media de 12,9 sobre 255 y
     * picos de 107 en un solo píxel; el resto del viaje, de 0,16 a 1,00, no
     * pasaba de 0,66.
     *
     * Con la guarda, el programa se recompila las dos únicas veces que el
     * material cambia de modo en todo el recorrido, y el cuadro es el mismo se
     * llegue desde donde se llegue.
     */
    for (const material of materials) {
      const blend = fade < 0.999
      if (material.transparent !== blend) {
        material.transparent = blend
        material.needsUpdate = true
      }
      material.opacity = fade
      material.depthWrite = fade > 0.5
    }
  })

  useFrame((state) => {
    const motion = motionRef.current
    const breath = breathRef.current
    if (!motion || reducedMotion) return

    /**
     * Cuanto queda de "vida propia". Vale 1 en la portada y 0 en cuanto
     * empiezas a bajar. Multiplica a todo lo que se mueve por su cuenta, asi
     * que el personaje no se detiene de golpe: se va quedando quieto.
     */
    const alive = 1 - ramp(journey.progress, SETTLE_RANGE[0], SETTLE_RANGE[1])

    /**
     * Si empiezas a bajar con un gesto a medias, se corta y vuelve al reposo.
     * Dejarlo terminar significaria que el cerebro sigue moviendose justo
     * cuando la camara esta calculando hacia donde volar.
     */
    const jump = jumpRef.current
    if (jump && alive < 0.98) {
      if (gsap.isTweening(jump.position) || gsap.isTweening(jump.rotation)) {
        gsap.killTweensOf([jump.position, jump.rotation])
      }
      jump.position.y = MathUtils.lerp(jump.position.y, 0, 0.12)
      jump.rotation.z = MathUtils.lerp(jump.rotation.z, 0, 0.12)
    }

    // El COMPÁS, no el tiempo. Flota y respira MIENTRAS SE BAJA; con el
    // scroll quieto se queda quieto, que es la regla de la fase 5E.
    const t = journey.beat
    motion.position.y = Math.sin(t * FLOAT_SPEED) * FLOAT_AMPLITUDE * alive

    if (breath && !gsap.isTweening(breath.scale)) {
      const value = Math.sin(t * BREATH_SPEED) * BREATH_AMOUNT * alive
      breath.scale.set(1 - value, 1 + value, 1 - value)
    }

    /**
     * Mirada, medida en pantalla y no en el espacio 3D.
     *
     * Se proyecta la posicion del personaje a coordenadas de pantalla y se
     * mide cuanto se aparta el cursor de el. Trabajar en 2D aqui no es una
     * simplificacion perezosa: el gesto que se busca —"te esta mirando a
     * ti"— es una relacion entre dos puntos de la pantalla, no entre dos
     * puntos del mundo.
     */
    let yaw = 0
    let pitch = 0

    if (lookEnabled && alive > 0.01) {
      const screen = motion.getWorldPosition(SCRATCH).project(camera)

      // `pointer` viene con +1 abajo y la proyeccion con +1 arriba.
      const dx = pointer.current.x - screen.x
      const dy = pointer.current.y + screen.y

      yaw = MathUtils.clamp((dx / LOOK_SATURATION) * MAX_YAW, -MAX_YAW, MAX_YAW) * alive
      pitch = MathUtils.clamp((dy / LOOK_SATURATION) * MAX_PITCH, -MAX_PITCH, MAX_PITCH) * alive
    }

    // `turnAway` va de 0 a 1 y suma media vuelta: es como se gira de espaldas
    // antes de entrar en el cerebro.
    const targetYaw = yaw + turnAway * Math.PI

    motion.rotation.y = MathUtils.lerp(motion.rotation.y, targetYaw, LOOK_EASING)
    motion.rotation.x = MathUtils.lerp(motion.rotation.x, pitch, LOOK_EASING)
    // El cuerpo se inclina hacia donde mira. Sin esto el giro se lee como un
    // maniqui sobre un plato giratorio.
    motion.rotation.z = MathUtils.lerp(
      motion.rotation.z,
      (-yaw / MAX_YAW) * LEAN_AMOUNT,
      LOOK_EASING,
    )
  })

  return (
    <group>
      <group ref={jumpRef}>
        <group ref={motionRef}>
          <group ref={breathRef}>
            <group
              ref={fitRef}
              /* Nombre para que la sonda de diagnóstico pueda proyectar su
                 caja envolvente sin tener que importar nada de aquí. */
              name="mascot"
              onClick={
                onPoke &&
                ((event) => {
                  event.stopPropagation()
                  onPoke()
                })
              }
              onPointerOver={
                onPoke &&
                (() => {
                  document.body.style.cursor = 'pointer'
                })
              }
              onPointerOut={
                onPoke &&
                (() => {
                  document.body.style.cursor = ''
                })
              }
            >
              <primitive object={tuned} />
              {/* Los hijos van dentro del grupo escalado: sus coordenadas se
                  expresan en el espacio del modelo y acompanan al personaje. */}
              {children}
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
