import { useEffect, useState } from 'react'

/**
 * Panel de ajuste, SOLO en desarrollo.
 *
 * Sirve para colocar a ojo el cerebro sobre la mano de Olaz: no puedo saber
 * dónde cae la mano sin verla, y adivinar coordenadas a ciegas es más lento
 * que mover cuatro deslizadores.
 *
 * Los valores se guardan en localStorage, así que sobreviven a las recargas.
 * Cuando estén bien, el botón copia el objeto listo para pegarlo en el código
 * y este panel desaparece.
 *
 * Escrito a mano en vez de usar leva para no arrastrar una dependencia por
 * algo que son cuatro `input type="range"`.
 */
const STORAGE_KEY = 'cb_tuning_brain'

// Valores fijados por Alex sobre la mano de Olaz.
export const DEFAULT_BRAIN_TRANSFORM = { x: -0.53, y: 0.23, z: 0.66, scale: 0.17 }

export function readBrainTransform() {
  if (typeof window === 'undefined') return DEFAULT_BRAIN_TRANSFORM
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored ? { ...DEFAULT_BRAIN_TRANSFORM, ...JSON.parse(stored) } : DEFAULT_BRAIN_TRANSFORM
  } catch {
    return DEFAULT_BRAIN_TRANSFORM
  }
}

const FIELDS = [
  { key: 'x', label: 'X', min: -2, max: 2, step: 0.01 },
  { key: 'y', label: 'Y', min: -2, max: 2, step: 0.01 },
  { key: 'z', label: 'Z', min: -2, max: 2, step: 0.01 },
  { key: 'scale', label: 'Tamaño', min: 0.05, max: 1.2, step: 0.01 },
]

export default function TuningPanel({ value, onChange }) {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      // Modo incógnito o almacenamiento lleno: no es motivo para romper nada.
    }
  }, [value])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-[60] border border-coco-dark bg-cream px-2 py-1 font-mono text-[10px] text-coco-dark"
      >
        ajustes
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 z-[60] w-60 border border-coco-dark bg-cream/95 p-3 font-mono text-[10px] text-coco-dark backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span>cerebro en la mano</span>
        <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar">
          ×
        </button>
      </div>

      {FIELDS.map((field) => (
        <label key={field.key} className="mb-2 block">
          <span className="flex justify-between">
            <span>{field.label}</span>
            <span className="tabular-nums">{value[field.key].toFixed(2)}</span>
          </span>
          <input
            type="range"
            min={field.min}
            max={field.max}
            step={field.step}
            value={value[field.key]}
            onChange={(event) =>
              onChange({ ...value, [field.key]: Number(event.target.value) })
            }
            className="w-full accent-brain-glow"
          />
        </label>
      ))}

      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(JSON.stringify(value))}
        className="mt-1 w-full border border-coco-dark py-1"
      >
        copiar valores
      </button>
    </div>
  )
}
