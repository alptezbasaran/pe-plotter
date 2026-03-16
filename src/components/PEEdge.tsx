import { memo } from 'react'
import { getBezierPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import { useHighlight } from '../lib/GraphHighlightContext'

interface PEEdgeData {
  count: number
  maxCount: number
  [key: string]: unknown
}

function PEEdge({
  id,
  source,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data,
}: EdgeProps) {
  const d = data as PEEdgeData
  const { selectedId, ancestorNodeIds, descendantNodeIds, highlightedEdgeIds } = useHighlight()

  const strokeWidth = 1 + (d.count / d.maxCount) * 8
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })

  let stroke: string
  let effectiveWidth: number

  if (!selectedId) {
    stroke = 'rgba(100,100,200,0.3)'
    effectiveWidth = strokeWidth
  } else if (!highlightedEdgeIds.has(id)) {
    stroke = 'rgba(255,255,255,0.03)'
    effectiveWidth = Math.max(strokeWidth * 0.4, 0.5)
  } else if (ancestorNodeIds.has(source)) {
    // edge flows through ancestor territory → amber
    stroke = 'rgba(245,158,11,0.75)'
    effectiveWidth = strokeWidth
  } else if (source === selectedId || descendantNodeIds.has(source)) {
    // edge flows out of selected or through descendants → emerald
    stroke = 'rgba(52,211,153,0.75)'
    effectiveWidth = strokeWidth
  } else {
    stroke = 'rgba(100,100,200,0.3)'
    effectiveWidth = strokeWidth
  }

  return (
    <path
      id={id}
      d={edgePath}
      fill="none"
      stroke={stroke}
      strokeWidth={effectiveWidth}
      style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
    />
  )
}

export default memo(PEEdge)
