import { useRef, useEffect, useState } from 'react'
import { useViewport } from '@xyflow/react'

// Must match CANVAS_WIDTH in layout.ts
const CANVAS_WIDTH = 16000

const NICE_STEPS = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]

interface Props {
  minTime: number
  maxTime: number
}

export default function TimeAxis({ minTime, maxTime }: Props) {
  const { x: panX, zoom } = useViewport()
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(window.innerWidth)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      setWidth(entries[0].contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const timeRange = maxTime - minTime || 1

  const tLeft  = minTime + ((-panX)          / zoom / CANVAS_WIDTH) * timeRange
  const tRight = minTime + ((width - panX)   / zoom / CANVAS_WIDTH) * timeRange

  const rough    = (tRight - tLeft) / 8
  const interval = NICE_STEPS.find(s => s >= rough) ?? 5000

  const firstTick = Math.ceil(tLeft / interval) * interval
  const ticks: { t: number; sx: number }[] = []
  for (let t = firstTick; t <= tRight; t += interval) {
    const canvasX = ((t - minTime) / timeRange) * CANVAS_WIDTH
    const sx = canvasX * zoom + panX
    if (sx >= 0 && sx <= width) {
      ticks.push({ t, sx })
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 24,
        background: 'rgba(17,17,27,0.85)',
        borderTop: '1px solid #313244',
        pointerEvents: 'none',
        zIndex: 10,
        overflow: 'hidden',
      }}
    >
      {ticks.map(({ t, sx }) => (
        <div key={t} style={{ position: 'absolute', left: sx, top: 0, transform: 'translateX(-50%)' }}>
          <div style={{ width: 1, height: 5, background: '#45475a', margin: '0 auto' }} />
          <div style={{ fontSize: 9, color: '#6c7086', marginTop: 1, whiteSpace: 'nowrap', textAlign: 'center' }}>
            {Number.isInteger(t) ? t : t.toFixed(1)} s
          </div>
        </div>
      ))}
    </div>
  )
}
