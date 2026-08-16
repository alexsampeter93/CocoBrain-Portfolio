import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles, useGLTF } from '@react-three/drei'
import { Box3, Color, MeshPhysicalMaterial, Vector3 } from 'three'
import { journey } from '../../journey/clock'
import { layerOpacity } from '../../journey/stages'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

/**
 * El cerebro, flotando, con los nodos orbitandolo.
 *
 * El intento anterior metia la camara DENTRO del modelo escalado y dibujado
 * por la cara interior. El resultado era una pared de pliegues rosas que
 * llenaba la pantalla y tapaba los nodos: no se leia como un sitio, se leia
 * como un fallo. Visto desde fuera, como objeto, si se entiende.
 */
/**
 * Misma malla de siempre, con la textura rosa/negra ya horneada dentro. No es
 * un cerebro nuevo: la geometria coincide hasta el triangulo (973.635 contra
 * 973.786 del original, antes de simplificar).
 */
const MODEL_URL = '/preview/brain-neural.glb'
const DRACO_PATH = '/draco/'

/**
 * Vidrio de verdad, no opacidad.
 *
 * `transmission` no es lo mismo que bajar el alfa. Bajar el alfa mezcla el
 * color del objeto con lo que hay detras y se ve como un fantasma. La
 * transmision hace que la luz ATRAVIESE el material: refracta segun el indice
 * `ior`, se tine segun el grosor, y conserva los reflejos de la superficie. Es
 * la diferencia entre una calcomania y una pieza de cristal.
 *
 * El precio es que three tiene que dibujar la escena DOS VECES: una a un
 * buffer aparte para saber que hay detras del cristal, y otra la final. Por
 * eso en movil se cae a un material normal.
 */
const GLASS = {
  roughness: 0.14,
  ior: 1.45,
  metalness: 0,
}

/**
 * Cuanta transmision, ajustable desde la URL: `?glass=0` la apaga, `?glass=0.6`
 * la deja a medias.
 *
 * Existe porque NO PUEDO comprobar esto yo. El navegador con el que saco las
 * capturas dibuja por software, y ahi la transmision necesita un buffer de
 * coma flotante que no tiene: el cerebro sale invisible. En una tarjeta de
 * verdad deberia verse. Antes que dar por bueno un valor que no he podido
 * mirar, se deja donde se pueda cambiar sin tocar codigo.
 */
function readTransmission() {
  if (typeof window === 'undefined') return 0.9
  const raw = new URLSearchParams(window.location.search).get('glass')
  if (raw === null) return 0.9
  const value = Number(raw)
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.9
}

/** Paleta del cerebro. Los surcos brillan con este rosa. */
const GLOW = '#E98FA0'
const BODY = '#1C0F1D'

export default function FloatingBrain({ size = 2.1, layer = 'mind', compact = false }) {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH)
  const rootRef = useRef(null)
  const spinRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()
  const fadeRef = useRef(-1)

  // En movil se cae a un material normal: la transmision obliga a dibujar la
  // escena dos veces y no compensa.
  const baseTransmission = compact ? 0 : readTransmission()
  const baseOpacity = baseTransmission > 0 ? 1 : 0.88

  const { model, scale, materials } = useMemo(() => {
    const clone = scene.clone(true)
    const list = []

    clone.traverse((object) => {
      if (!object.isMesh || !object.material) return

      const source = object.material
      const material = new MeshPhysicalMaterial({
        color: new Color(BODY),
        /**
         * La textura horneada del glb se reutiliza como mapa EMISIVO, no como
         * color base. Es la clave para que el vidrio siga siendo vidrio: como
         * color base la taparia el propio material transparente, mientras que
         * lo emisivo se suma despues y por eso los surcos rosas siguen
         * brillando desde dentro aunque se vea a traves del cerebro.
         */
        emissive: new Color(GLOW),
        emissiveMap: source.map ?? null,
        emissiveIntensity: 2.1,
        // Los reflejos de la superficie los pone el HDRI. Sin ellos el vidrio
        // no se lee como vidrio: se lee como gelatina.
        envMapIntensity: 1.4,
        normalMap: source.normalMap ?? null,
        transparent: true,
        // El grosor va en unidades del MODELO, no de la escena. Como el grupo
        // se escala despues, aqui se trabaja con el tamano de la malla.
        thickness: 0.55,
        ...GLASS,
        transmission: baseTransmission,
        opacity: baseOpacity,
      })

      object.material = material
      list.push(material)
    })

    const bounds = new Box3().setFromObject(clone).getSize(new Vector3())
    const largest = Math.max(bounds.x, bounds.y, bounds.z) || 1

    return { model: clone, scale: size / largest, materials: list }
  }, [scene, size, baseTransmission, baseOpacity])

  useFrame((state) => {
    const root = rootRef.current
    if (!root) return

    const fade = layerOpacity(layer, journey.progress)

    // Los materiales solo se tocan cuando el desvanecido se mueve de verdad,
    // que son unos pocos frames de todo el recorrido.
    if (Math.abs(fade - fadeRef.current) > 0.002) {
      fadeRef.current = fade
      root.visible = fade > 0.02

      for (const material of materials) {
        // La opacidad de reposo no es 1 en movil, asi que el desvanecido la
        // MULTIPLICA en vez de sustituirla. Escribir `fade` a secas subia el
        // cristal a opaco justo al aparecer.
        material.opacity = baseOpacity * fade
        // La transmision tambien se atenua: si se quedara fija, el cerebro
        // seguiria refractando el fondo cuando ya deberia haberse ido.
        if (baseTransmission > 0) material.transmission = baseTransmission * fade
      }
    }

    if (!root.visible || reducedMotion) return

    const t = state.clock.elapsedTime
    if (spinRef.current) {
      spinRef.current.rotation.y = t * 0.14
      spinRef.current.position.y = Math.sin(t * 0.5) * 0.09
    }
  })

  return (
    <group ref={rootRef} visible={false}>
      <group ref={spinRef} scale={scale}>
        <primitive object={model} />
      </group>

      {/* La luz nace del cerebro y alcanza a los nodos que lo rodean. Su
          alcance sale del tamaño: en móvil todo es más pequeño y una luz de
          alcance fijo se comería la escena entera. */}
      <pointLight color={GLOW} intensity={9} distance={size * 3.4} decay={2} />

      <Sparkles
        count={26}
        scale={size * 1.5}
        size={2.4}
        speed={0.3}
        color="#FFC2CC"
        opacity={0.8}
      />
    </group>
  )
}

useGLTF.preload(MODEL_URL, DRACO_PATH)
