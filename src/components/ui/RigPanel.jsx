import { useEffect, useState } from 'react'
import { writeRigLayout } from '../../data/rigLayout'

/**
 * Panel de montaje, SOLO en desarrollo (`/?rig`).
 *
 * Sustituye al trabajo de Blender: en vez de colocar orígenes a mano en un
 * programa de modelado, se mueven deslizadores hasta que el muñeco está
 * montado y se copian los números.
 *
 * `pivote` es el punto de la pieza que cae en la articulación; `posición` es
 * dónde se engancha esa articulación al cuerpo.
 */
const GROUPS = [
  { key: 'position', label: 'posición', min: -2.5, max: 2.5, step: 0.01 },
  { key: 'rotation', label: 'rotación', min: -3.15, max: 3.15, step: 0.01 },
  { key: 'pivot', label: 'pivote', min: -1.5, max: 1.5, step: 0.01 },
]

const AXES = ['X', 'Y', 'Z']

function Slider({ label, value, min, max, step, onChange }) {
  return (
    <label className="mb-1 flex items-center gap-2">
      <span className="w-3 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-w-0 flex-1 accent-brain-glow"
      />
      <span className="w-10 shrink-0 text-right tabular-nums">{value.toFixed(2)}</span>
    </label>
  )
}

export default function RigPanel({ parts, onChange }) {
  const [selectedId, setSelectedId] = useState(parts[0]?.id)
  const [open, setOpen] = useState(true)

  useEffect(() => {
    writeRigLayout(parts)
  }, [parts])

  const part = parts.find((item) => item.id === selectedId) ?? parts[0]
  if (!part) return null

  const update = (patch) =>
    onChange(parts.map((item) => (item.id === part.id ? { ...item, ...patch } : item)))

  const updateVector = (key, axis, value) => {
    const next = [...part[key]]
    next[axis] = value
    update({ [key]: next })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-[60] border border-coco-dark bg-cream px-2 py-1 font-mono text-[10px]"
      >
        montaje
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 z-[60] max-h-[88vh] w-72 overflow-auto border border-coco-dark bg-cream/95 p-3 font-mono text-[10px] text-coco-dark backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span>montaje de la mascota</span>
        <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar">
          ×
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {parts.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedId(item.id)}
            className={`border px-1.5 py-0.5 ${
              item.id === part.id
                ? 'border-brain-glow bg-brain-glow text-cream'
                : 'border-coco-light'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {GROUPS.map((group) => (
        <div key={group.key} className="mb-3">
          <p className="mb-1 text-coco-mid">{group.label}</p>
          {AXES.map((axis, index) => (
            <Slider
              key={axis}
              label={axis}
              value={part[group.key][index]}
              min={group.min}
              max={group.max}
              step={group.step}
              onChange={(value) => updateVector(group.key, index, value)}
            />
          ))}
        </div>
      ))}

      <div className="mb-3">
        <p className="mb-1 text-coco-mid">tamaño</p>
        <Slider
          label="S"
          value={part.scale}
          min={0.05}
          max={2}
          step={0.01}
          onChange={(value) => update({ scale: value })}
        />
      </div>

      <button
        type="button"
        onClick={() =>
          navigator.clipboard?.writeText(
            JSON.stringify(
              parts.map(({ id, pivot, position, rotation, scale }) => ({
                id,
                pivot,
                position,
                rotation,
                scale,
              })),
              null,
              2,
            ),
          )
        }
        className="w-full border border-coco-dark py-1"
      >
        copiar montaje completo
      </button>
    </div>
  )
}
