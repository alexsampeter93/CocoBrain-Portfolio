/**
 * ¿Cuántos anillos del paso hay puestos, cuántos se ven en cada momento, y
 * QUÉ TROZO DE PANTALLA ocupa cada uno?
 *
 *   node scripts/rings.mjs [aspect]
 *
 * Existe porque el paso se vaciaba a mitad del descenso y a ojo parecía un
 * problema de opacidad. No lo era: los anillos se colocan a lo largo de la
 * curva y la cámara los ADELANTA, así que hay que contar cuántos quedan por
 * delante en cada momento. Cero anillos por delante es un campo vacío, y eso
 * es un número, no una impresión.
 *
 * Y desde la fase 5F contesta la segunda pregunta, que es la que de verdad
 * decide si un anillo se lee como un túnel o como una lámina pegada:
 *
 *     hueco  < medio encuadre  →  la pared cruza el cuadro y lo tapa todo
 *     hueco  > la esquina      →  el anillo está fuera, no se ve nada
 *     entre las dos            →  pared en la periferia, destino en el centro
 *
 * Los ángulos se dan en grados de MEDIO encuadre: 17,5 es el borde de arriba,
 * 29,0 el lateral y 32,7 la esquina, con un fov de 35 y 16:9.
 *
 * Los números salen de `three/Corridor.jsx`. Si se cambian allí, se cambian
 * aquí: una herramienta de diagnóstico que mide otra cosa es peor que no
 * tenerla.
 */
import { Vector3 } from 'three'
import { cameraPath, sampleCamera, ramp } from '../src/journey/stages.js'
import { tokens } from '../src/layout/tokens.js'
import { sections } from '../src/data/sections.js'

const ASPECT = Number(process.argv[2] ?? 1.778)
const FOV = 35

// ── Los mismos valores que `three/Corridor.jsx` ──────────────────────────
const SPAN = [0.105, 0.375]
const COUNT = 18
const STEP = [1.2, 0.45]
const RADIUS = [4.2, 2.2]
const HOLE = 0.3
const CLEARANCE = 1.18
const NEAR = 1.6
const ALIVE = [0.112, 0.168, 0.3, 0.358]

const mix = (a, b, t) => a + (b - a) * t
const deg = (radians) => (radians * 180) / Math.PI

const t = tokens.regular
const path = cameraPath(t, { fov: FOV, aspect: ASPECT, nodeOrder: sections.map((s) => s.nodeName) })
const brain = t.mind.radius * t.mind.brain
const silhouette = brain * 0.5

const position = new Vector3()
const target = new Vector3()
const next = new Vector3()
const previous = new Vector3()
const mindCenter = new Vector3()
sampleCamera(path, 0.3, position, mindCenter)

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

  const k = Math.min(1, walked / (total || 1))
  if (walked < mark + mix(STEP[0], STEP[1], k)) continue
  mark = walked

  sampleCamera(path, Math.min(1, at + 0.004), next, target)
  const radius = mix(RADIUS[0], RADIUS[1], k)
  list.push({
    at,
    position: position.clone(),
    forward: mindCenter.clone().sub(position).normalize(),
    radius,
    hole: radius * HOLE,
  })
  if (list.length >= COUNT) break
}

const halfHeight = deg(Math.atan(Math.tan((FOV * Math.PI) / 360)))
const halfWidth = deg(Math.atan(Math.tan((FOV * Math.PI) / 360) * ASPECT))
const corner = deg(Math.atan(Math.hypot(Math.tan((FOV * Math.PI) / 360) * ASPECT, Math.tan((FOV * Math.PI) / 360))))

console.log(
  '\n' + list.length + '/' + COUNT + ' anillos sobre ' + walked.toFixed(2) + ' unidades' +
  '   ·   encuadre ' + halfHeight.toFixed(1) + '° alto, ' + halfWidth.toFixed(1) + '° ancho, ' +
  corner.toFixed(1) + '° esquina\n',
)

const TO = new Vector3()
let empty = 0
let blocked = 0

for (let i = 0; i <= 32; i += 1) {
  const p = 0.11 + (0.27 * i) / 32
  sampleCamera(path, p, position, target)
  const alive = ramp(p, ALIVE[0], ALIVE[1]) * (1 - ramp(p, ALIVE[2], ALIVE[3]))
  const toBrain = position.distanceTo(mindCenter)
  const brainAngle = deg(Math.atan(silhouette / toBrain))

  let seen = 0
  let sum = 0
  let widest = 0
  const detail = []

  for (const ring of list) {
    const ahead = TO.subVectors(ring.position, position).dot(ring.forward)
    const horizon = (ring.hole * toBrain) / (CLEARANCE * silhouette)
    const near = ring.hole * NEAR
    if (ahead < near || ahead > horizon) continue
    const presence = ramp(1 - ahead / horizon, 0, 0.42) * ramp(ahead, near, near * 1.9)
    const value = presence * alive
    if (value <= 0.01) continue
    seen += 1
    sum += value
    const hole = deg(Math.atan(ring.hole / ahead))
    const outer = deg(Math.atan(ring.radius / ahead))
    widest = Math.max(widest, Math.min(outer, corner) - Math.max(hole, 0))
    detail.push(hole.toFixed(0) + '→' + outer.toFixed(0) + '°')
  }

  if (alive > 0.15 && sum < 0.12) empty += 1
  // Un anillo tapa el destino si su hueco es MENOR que el cerebro en pantalla.
  const covers = detail.length && Number(detail[0].split('→')[0]) < brainAngle
  if (covers) blocked += 1

  console.log(
    '  ' + p.toFixed(3) +
    '  vivo ' + alive.toFixed(2) +
    '  anillos ' + String(seen).padStart(2) +
    '  presencia ' + sum.toFixed(2).padStart(5) +
    '  cerebro ' + brainAngle.toFixed(1).padStart(5) + '°' +
    '  aros ' + detail.slice(0, 5).join(' ') +
    (covers ? '   ⚠ TAPA EL CEREBRO' : ''),
  )
}

console.log(
  '\n  → ' +
  (empty ? empty + ' MUESTRAS CON EL PASO ENCENDIDO Y NADA QUE VER' : 'el paso nunca se queda vacío') +
  '\n  → ' +
  (blocked ? blocked + ' MUESTRAS CON UN ANILLO TAPANDO EL DESTINO' : 'el cerebro siempre se ve por el hueco') +
  '\n',
)
