import { useRef, useEffect, useState } from 'react'
import { useViewport } from '@xyflow/react'
import type { CompressedSegment } from '../lib/types'
import type { GapInterval } from '../lib/layout'
import { timeToCompressedX } from '../lib/layout'

// Must match CANVAS_WIDTH in layout.ts
const CANVAS_WIDTH = 16000

const NICE_STEPS = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]

interface Props {
  minTime: number
  maxTime: number
  segments?: CompressedSegment[] | null
  gapData?: {
    intervals: { t0: number; t1: number; isGap: boolean }[]
    gaps: GapInterval[]
  } | null
  collapsedGaps: Set<number>
  onToggleGap: (gapIndex: number) => void
}

export default function TimeAxis({ minTime, maxTime, segments, gapData, collapsedGaps, onToggleGap }: Props) {
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
  const hasCompression = collapsedGaps.size > 0 && segments

  const tLeft  = minTime + ((-panX)          / zoom / CANVAS_WIDTH) * timeRange
  const tRight = minTime + ((width - panX)   / zoom / CANVAS_WIDTH) * timeRange

  const rough    = (tRight - tLeft) / 8
  const interval = NICE_STEPS.find(s => s >= rough) ?? 5000

  const firstTick = Math.ceil(tLeft / interval) * interval
  const ticks: { t: number; sx: number }[] = []
  for (let t = firstTick; t <= tRight; t += interval) {
    let canvasX: number
    if (hasCompression) {
      canvasX = timeToCompressedX(t, segments)
    } else {
      canvasX = ((t - minTime) / timeRange) * CANVAS_WIDTH
    }
    const sx = canvasX * zoom + panX
    if (sx >= 0 && sx <= width) {
      ticks.push({ t, sx })
    }
  }

  // Compute screen-space bands for each gap
  type GapBand = { leftSx: number; rightSx: number; gapIndex: number; isCollapsed: boolean }
  const gapBands: GapBand[] = []
  if (gapData) {
    for (const gap of gapData.gaps) {
      const isCollapsed = collapsedGaps.has(gap.index)
      let leftSx: number, rightSx: number
      if (hasCompression) {
        // Find the segment matching this gap's time range
        const seg = segments.find(s => s.t0 === gap.t0 && s.t1 === gap.t1)
        if (seg) {
          leftSx  = seg.x0 * zoom + panX
          rightSx = seg.x1 * zoom + panX
        } else {
          leftSx  = timeToCompressedX(gap.t0, segments) * zoom + panX
          rightSx = timeToCompressedX(gap.t1, segments) * zoom + panX
        }
      } else {
        leftSx  = ((gap.t0 - minTime) / timeRange) * CANVAS_WIDTH * zoom + panX
        rightSx = ((gap.t1 - minTime) / timeRange) * CANVAS_WIDTH * zoom + panX
      }
      // Only render if at least partially visible
      if (rightSx < 0 || leftSx > width) continue
      gapBands.push({ leftSx, rightSx, gapIndex: gap.index, isCollapsed })
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

      {gapBands.map(({ leftSx, rightSx, gapIndex, isCollapsed }) => {
        const bandWidth = Math.max(rightSx - leftSx, 4)
        return (
          <div
            key={`gap-${gapIndex}`}
            onClick={() => onToggleGap(gapIndex)}
            title={isCollapsed ? 'Click to expand this gap' : 'Click to collapse this gap'}
            style={{
              position: 'absolute',
              left: leftSx,
              width: bandWidth,
              top: 0,
              bottom: 0,
              background: isCollapsed
                ? 'rgba(245,158,11,0.18)'
                : 'rgba(245,158,11,0.10)',
              borderLeft:  '1px solid rgba(245,158,11,0.5)',
              borderRight: '1px solid rgba(245,158,11,0.5)',
              cursor: 'pointer',
              pointerEvents: 'auto',
              userSelect: 'none',
            }}
          />
        )
      })}
    </div>
  )
}
