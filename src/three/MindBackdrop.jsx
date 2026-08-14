import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, Color, ShaderMaterial, Vector3 } from 'three'
import { journey } from '../journey/clock'
import { layerOpacity } from '../journey/stages'

/**
 * El fondo del interior.
 *
 * Es la pieza que faltaba para que esto pareciera un sitio. Sin ella, detrás
 * de los nodos se veía el crema de la página, y el resultado era que la red no
 * se leía como un espacio: se leía como unos puntos pegados sobre el fondo de
 * una web. Da igual lo bien que estén los nodos, un objeto sin entorno siempre
 * parece un recorte.
 *
 * Dos decisiones que merece la pena justificar:
 *
 * **No es negro.** La marca es cálida, y un vacío negro la convertiría en otra
 * web de "tech oscuro". Los tonos son marrones muy profundos con una entrada
 * de rosa: se lee como estar dentro de algo orgánico, no dentro de un vacío.
 *
 * **El resplandor sigue al cerebro, no a la cámara.** Se calcula el ángulo
 * entre hacia dónde mira cada píxel y dónde está el cerebro, así que el halo
 * queda siempre centrado en él aunque la cámara orbite. Un degradado fijo
 * sobre la esfera no haría eso: giraría con el fondo y delataría que hay una
 * esfera ahí.
 */

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
    color = mix(color, uGlow, core * 0.85);

    // Caída vertical suave: sin ella el fondo se lee como una pared plana.
    float height = clamp(ray.y * 0.5 + 0.5, 0.0, 1.0);
    color *= mix(0.82, 1.06, height);

    gl_FragColor = vec4(color, uOpacity);
  }
`

export default function MindBackdrop({ center, radius }) {
  const materialRef = useRef(null)

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uDeep: { value: new Color('#160F0C') },
          uMid: { value: new Color('#3A281F') },
          uGlow: { value: new Color('#6E3239') },
          uCenter: { value: new Vector3(...center) },
          uOpacity: { value: 0 },
        },
        // Dibujado por dentro: la cámara está dentro de la esfera.
        side: BackSide,
        transparent: true,
        // No escribe profundidad ni la comprueba: es el telón, siempre detrás.
        depthWrite: false,
        depthTest: false,
      }),
    [center],
  )

  useFrame(() => {
    const value = layerOpacity('mind', journey.progress)
    material.uniforms.uOpacity.value = value
    if (materialRef.current) materialRef.current.visible = value > 0.01
  })

  return (
    // `renderOrder` muy bajo para que se pinte antes que todo lo demás.
    <mesh ref={materialRef} position={center} renderOrder={-10} raycast={() => null}>
      {/* Pocos segmentos: es un degradado, no hace falta una esfera fina. */}
      <sphereGeometry args={[radius * 9, 24, 16]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
