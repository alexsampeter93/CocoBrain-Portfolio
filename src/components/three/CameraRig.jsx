import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { Vector3 } from 'three'
import { previewNodePositions } from '../../data/nodeLayout'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

// Encuadre de reposo.
const HOME_POSITION = [0, 0, 6]
const HOME_TARGET = [0, 0, 0]

// A qué distancia se queda la cámara del nodo al llegar. Muy cerca y el nodo
// llena la pantalla sin contexto; muy lejos y no se nota que ha viajado.
const NODE_DISTANCE = 2.6

export default function CameraRig({ activeSection, sections, offsetX = 0 }) {
  const camera = useThree((state) => state.camera)
  const reducedMotion = usePrefersReducedMotion()

  // La cámara no se toca directamente desde GSAP: se anima este objeto y se
  // aplica en useFrame. Así el lookAt siempre se recalcula después del
  // movimiento y nunca se quedan desincronizados.
  const state = useRef({
    x: HOME_POSITION[0],
    y: HOME_POSITION[1],
    z: HOME_POSITION[2],
    tx: HOME_TARGET[0],
    ty: HOME_TARGET[1],
    tz: HOME_TARGET[2],
  })

  useEffect(() => {
    const section = sections.find((item) => item.id === activeSection)
    const nodePosition = section && previewNodePositions[section.nodeName]

    const destination = nodePosition
      ? (() => {
          const target = new Vector3(...nodePosition).add(new Vector3(offsetX, 0, 0))
          // Se para "delante" del nodo respecto a la cámara, no encima.
          const position = target.clone().add(new Vector3(0, 0.15, NODE_DISTANCE))
          return { position, target }
        })()
      : {
          position: new Vector3(...HOME_POSITION),
          target: new Vector3(...HOME_TARGET),
        }

    if (reducedMotion) {
      Object.assign(state.current, {
        x: destination.position.x,
        y: destination.position.y,
        z: destination.position.z,
        tx: destination.target.x,
        ty: destination.target.y,
        tz: destination.target.z,
      })
      return
    }

    const tween = gsap.to(state.current, {
      x: destination.position.x,
      y: destination.position.y,
      z: destination.position.z,
      tx: destination.target.x,
      ty: destination.target.y,
      tz: destination.target.z,
      duration: 1.5,
      // Arranca despacio y frena largo: es lo que hace que el viaje se lea
      // como una cámara y no como un salto.
      ease: 'power3.inOut',
    })

    return () => tween.kill()
  }, [activeSection, sections, offsetX, reducedMotion])

  useFrame(() => {
    const { x, y, z, tx, ty, tz } = state.current
    camera.position.set(x, y, z)
    camera.lookAt(tx, ty, tz)
  })

  return null
}
