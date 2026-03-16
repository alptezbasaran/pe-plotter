import { useViewport } from '@xyflow/react'

const CANVAS_WIDTH = 16000

interface Props {
  mouseX: number | null
  minTime: number
  maxTime: number
}

export default function CursorTimeIndicator({ mouseX, minTime, maxTime }: Props) {
  const { x: panX, zoom } = useViewport()

  if (mouseX === null) return null

  const timeRange = maxTime - minTime || 1
  const canvasX = (mouseX - panX) / zoom
  const t = minTime + (canvasX / CANVAS_WIDTH) * timeRange

  if (t < minTime - timeRange * 0.05 || t > maxTime + timeRange * 0.05) return null

  return (
    <div style={{ position: 'absolute', left: mouseX, top: 0, bottom: 24, width: 1, pointerEvents: 'none', zIndex: 6 }}>
      {/* vertical line */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(203,213,225,0.18)' }} />
      {/* time label pinned to bottom of line */}
      <div style={{
        position: 'absolute',
        bottom: -22,
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#1e1e2e',
        border: '1px solid #45475a',
        color: '#e2e8f0',
        borderRadius: 4,
        padding: '2px 7px',
        fontSize: 10,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
      }}>
        {t.toFixed(1)} s
      </div>
    </div>
  )
}
