import { memo, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { useHighlight } from '../lib/GraphHighlightContext'

interface PENodeData {
  label: string
  isTerminal: boolean
  time: number
  details: string[]
  outDegree: number
  traversalCount: number
  maxTraversalCount: number
  [key: string]: unknown
}

function PENode({ id, data }: NodeProps) {
  const d = data as PENodeData
  const { selectedId, ancestorNodeIds, descendantNodeIds, highlightedNodeIds, searchMatchIds } = useHighlight()
  const [hovered, setHovered] = useState(false)

  const isSelected = selectedId === id
  const isSearchMatch = searchMatchIds.size > 0 && searchMatchIds.has(id)
  const isSearchDimmed = searchMatchIds.size > 0 && !isSearchMatch && !selectedId
  const isDimmed = (!!selectedId && !highlightedNodeIds.has(id)) || isSearchDimmed
  const isAncestor = !isSelected && ancestorNodeIds.has(id)
  const isDescendant = !isSelected && descendantNodeIds.has(id)
  const isBranch = !isSelected && !isAncestor && !isDescendant && d.outDegree > 1

  let bg: string
  let color: string
  let border: string
  let boxShadow: string | undefined
  const hoverRing = hovered && !isSelected ? '0 0 0 2px rgba(255,255,255,0.55)' : undefined
  let opacity: number

  if (isDimmed && !isSearchMatch) {
    bg = '#1e1e2e'
    color = '#45475a'
    border = '1px solid #313244'
    opacity = 0.15
  } else if (isSearchMatch && !isSelected && !isAncestor && !isDescendant) {
    bg = '#0891b2'
    color = '#fff'
    border = '2px solid #22d3ee'
    boxShadow = '0 0 12px rgba(34,211,238,0.6)'
    opacity = 1
  } else if (isSelected) {
    bg = '#f8fafc'
    color = '#1e1e2e'
    border = '3px solid #f59e0b'
    boxShadow = '0 0 0 4px rgba(245,158,11,0.4)'
    opacity = 1
  } else if (isAncestor) {
    bg = '#f59e0b'
    color = '#1c1917'
    border = '1px solid rgba(0,0,0,0.2)'
    opacity = 1
  } else if (isDescendant) {
    bg = '#34d399'
    color = '#064e3b'
    border = '1px solid rgba(0,0,0,0.2)'
    opacity = 1
  } else if (isBranch) {
    bg = '#7c3aed'
    color = '#fff'
    border = '1px solid rgba(0,0,0,0.3)'
    opacity = 1
  } else {
    bg = d.isTerminal ? '#f43f5e' : '#0ea5e9'
    color = '#fff'
    border = '1px solid rgba(0,0,0,0.3)'
    opacity = 1
  }

  const showTime = isSelected || isAncestor || isDescendant

  const isHighlighted = isSelected || isAncestor || isDescendant
  const t = isHighlighted ? 0 : Math.sqrt((d.traversalCount ?? 1) / (d.maxTraversalCount ?? 1))
  const padV  = isHighlighted ? 5 : 4 + Math.round(t * 5)
  const padH  = isHighlighted ? 10 : 8 + Math.round(t * 6)
  const fSize = isHighlighted ? 13 : 11 + Math.round(t * 4)

  return (
    <>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: bg,
          border,
          borderRadius: 4,
          padding: `${padV}px ${padH}px`,
          color,
          fontSize: fSize,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          opacity: isDimmed && hovered ? 0.6 : opacity,
          transition: 'opacity 0.15s, background 0.15s, box-shadow 0.1s',
          boxShadow: boxShadow ?? hoverRing,
          textAlign: 'center',
        }}
      >
        {d.label}
        {(d.traversalCount ?? 1) > 1 && (
          <div style={{ fontSize: 7, fontWeight: 400, opacity: 0.55, marginTop: 1 }}>
            {d.traversalCount}×
          </div>
        )}
        {showTime && (
          <div style={{ fontSize: 8, fontWeight: 400, opacity: 0.7, marginTop: 1 }}>
            t={d.time.toFixed(1)} s
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </>
  )
}

export default memo(PENode)
