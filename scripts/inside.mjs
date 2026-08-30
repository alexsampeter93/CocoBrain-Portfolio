/**
 * ¿La cámara SALE del cerebro en algún momento después de entrar?
 *
 *   node scripts/inside.mjs
 *
 * Es la comprobación del criterio de la fase: "desde la membrana en adelante
 * no debe sentirse que hemos salido del cerebro". Eso, antes de mirar ninguna
 * captura, es una pregunta de geometría y tiene una respuesta exacta.
 *
 * Se recorre la curva de cámara punto a punto y se evalúa el elipsoide del
 * casco medido con `gltf-transform inspect` —semiejes 0,500 · 0,459 · 0,493 del
 * tamaño del cerebro—. Menor que uno es dentro; mayor, fuera.
 *
 * También se comprueba lo contrario: que ninguna parada caiga DENTRO de la nube
 * de conocimiento, que es el único sitio desde el que la red no se puede ver.
 */
import { Vector3 } from 'three'
import { cameraPath, sampleCamera, insideness, STAGES } from '../src/journey/stages.js'
import { tokens } from '../src/layout/tokens.js'
import { sections } from '../src/data/sections.js'
import { nodePositions } from '../src/data/nodeLayout.js'

const HULL = [0.5, 0.459, 0.493]
const RADII = [0.36, 0.26, 0.32]

const order = sections.map((s) => s.nodeName)

for (const [name, t] of Object.entries(tokens)) {
  const brain = t.mind.radius * t.mind.brain
  const cloud = RADII.map((r) => r * t.mind.core)
  const centre = new Vector3(...t.mind.center)
  const path = cameraPath(t, { fov: 35, aspect: name === 'compact' ? 0.46 : 1.78, nodeOrder: order })

  const position = new Vector3()
  const target = new Vector3()
  const local = new Vector3()

  const ratio = (v, axes) =>
    Math.sqrt((v.x / (axes[0] * brain)) ** 2 + (v.y / (axes[1] * brain)) ** 2 + (v.z / (axes[2] * brain)) ** 2)

  console.log('\n' + name.toUpperCase() + '   cerebro ' + brain.toFixed(3) + '   nube ' + cloud.map((c) => (c * brain).toFixed(3)).join(' · '))
  console.log('       p   tramo         casco   nube    veredicto')

  let escaped = 0
  let swallowed = 0

  for (let i = 0; i <= 200; i += 1) {
    const p = i / 200
    sampleCamera(path, p, position, target)
    local.copy(position).sub(centre)

    const shell = ratio(local, HULL)
    const core = ratio(local, cloud)
    const inside = insideness(p)

    // Solo se exige estar dentro a partir del momento en que la señal dice
    // que lo estamos. Antes de eso, estar fuera es lo correcto.
    const mustBeInside = inside > 0.9
    const bad = mustBeInside && shell >= 1
    const tooDeep = mustBeInside && core < 1

    if (bad) escaped += 1
    if (tooDeep) swallowed += 1

    if (i % 10 === 0 || bad || tooDeep) {
      const stage = STAGES.filter((s) => p >= s.from).pop()
      console.log(
        '   ' + p.toFixed(3) +
          '   ' + stage.id.padEnd(10) +
          shell.toFixed(3).padStart(8) +
          core.toFixed(2).padStart(8) +
          '    ' + (bad ? 'FUERA DEL CEREBRO' : tooDeep ? 'DENTRO DE LA NUBE' : inside > 0.9 ? 'dentro' : ''),
      )
    }
  }

  console.log('   → ' + (escaped ? escaped + ' MUESTRAS FUERA' : 'ninguna muestra fuera del casco') +
    '   ·   ' + (swallowed ? swallowed + ' MUESTRAS EN LA NUBE' : 'ninguna dentro de la nube'))

  const areas = nodePositions(brain)
  const worst = Object.entries(areas).map(([id, v]) => [id, ratio(v, HULL), ratio(v, cloud)])
  console.log('   áreas   ' + worst.map(([id, h, c]) => id.replace('node_', 'N') + ' casco ' + h.toFixed(2) + ' nube ' + c.toFixed(2)).join('   '))
}
