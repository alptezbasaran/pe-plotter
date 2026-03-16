import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { GraphState } from '../hooks/useGraphData'
import { GraphHighlightContext, IDLE } from '../lib/GraphHighlightContext'
import { computeHighlight } from '../lib/highlight'
import { buildSegments, timeToCompressedX } from '../lib/layout'
import PENode from './PENode'
import PEEdge from './PEEdge'
import NodeDetailPanel from './NodeDetailPanel'
import InfoPanel from './InfoPanel'
import TimeAxis from './TimeAxis'
import CursorTimeIndicator from './CursorTimeIndicator'

const nodeTypes = { peNode: PENode }
const edgeTypes = { peEdge: PEEdge }

const SPACING = 350
const TRANSITION = 'transform 0.35s cubic-bezier(0.4,0,0.2,1)'

/** Wrapper that provides ReactFlowProvider so inner components can use useReactFlow. */
export default function PEGraphWrapper(props: Props) {
  return (
    <ReactFlowProvider>
      <PEGraphInner {...props} />
    </ReactFlowProvider>
  )
}

/** Marquee zoom overlay: rendered outside ReactFlow but uses useReactFlow via provider. */
function MarqueeZoomOverlay() {
  const { screenToFlowPosition, fitBounds } = useReactFlow()
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null)
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null)
  const [shiftHeld, setShiftHeld] = useState(false)
  const isMarquee = marqueeStart !== null
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(true) }
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(false) }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!e.shiftKey || e.button !== 0) return
    const rect = overlayRef.current?.getBoundingClientRect()
    if (!rect) return
    setMarqueeStart({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setMarqueeEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isMarquee) return
    const rect = overlayRef.current?.getBoundingClientRect()
    if (!rect) return
    setMarqueeEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [isMarquee])

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isMarquee || !marqueeStart) return
    const rect = overlayRef.current?.getBoundingClientRect()
    if (!rect) { setMarqueeStart(null); setMarqueeEnd(null); return }

    const flowStart = screenToFlowPosition({ x: marqueeStart.x + rect.left, y: marqueeStart.y + rect.top })
    const flowEnd = screenToFlowPosition({ x: e.clientX, y: e.clientY })

    const x = Math.min(flowStart.x, flowEnd.x)
    const y = Math.min(flowStart.y, flowEnd.y)
    const width = Math.abs(flowEnd.x - flowStart.x)
    const height = Math.abs(flowEnd.y - flowStart.y)

    if (width > 10 && height > 10) {
      fitBounds({ x, y, width, height }, { padding: 0.1, duration: 400 })
    }

    setMarqueeStart(null)
    setMarqueeEnd(null)
  }, [isMarquee, marqueeStart, screenToFlowPosition, fitBounds])

  const onCancel = useCallback(() => {
    setMarqueeStart(null)
    setMarqueeEnd(null)
  }, [])

  const marqueeRect = marqueeStart && marqueeEnd ? {
    left: Math.min(marqueeStart.x, marqueeEnd.x),
    top: Math.min(marqueeStart.y, marqueeEnd.y),
    width: Math.abs(marqueeEnd.x - marqueeStart.x),
    height: Math.abs(marqueeEnd.y - marqueeStart.y),
  } : null

  return (
    <div
      ref={overlayRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onCancel}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: (shiftHeld || isMarquee) ? 'auto' : 'none',
        cursor: (shiftHeld || isMarquee) ? 'crosshair' : undefined,
        zIndex: 5,
      }}
    >
      {marqueeRect && (
        <div style={{
          position: 'absolute',
          left: marqueeRect.left,
          top: marqueeRect.top,
          width: marqueeRect.width,
          height: marqueeRect.height,
          background: 'rgba(99, 102, 241, 0.15)',
          border: '2px solid rgba(99, 102, 241, 0.6)',
          borderRadius: 2,
          pointerEvents: 'none',
        }} />
      )}
    </div>
  )
}

interface Props {
  graphState: GraphState
  onReload: () => void
  availableFiles?: string[]
  activeFile?: string | null
  onSelectFile?: (name: string) => void
}

function PEGraphInner({ graphState, onReload, availableFiles, activeFile, onSelectFile }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(graphState.nodes)
  const [edges, , onEdgesChange] = useEdgesState(graphState.edges)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [mouseX, setMouseX] = useState<number | null>(null)
  const [collapsedGaps, setCollapsedGaps] = useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const { fitBounds: fitBoundsSearch } = useReactFlow()

  const originalPositions = useRef<Map<string, { x: number; y: number }>>(new Map())

  // Capture original positions whenever graphState changes; also reset collapsed state
  useEffect(() => {
    const map = new Map<string, { x: number; y: number }>()
    for (const n of graphState.nodes) {
      map.set(n.id, { x: n.position.x, y: n.position.y })
    }
    originalPositions.current = map
    setCollapsedGaps(new Set())
  }, [graphState])

  // Compute segments from currently collapsed gaps
  const segments = useMemo(() => {
    const { gapData } = graphState
    if (!gapData || collapsedGaps.size === 0) return null
    return buildSegments(gapData.intervals, collapsedGaps)
  }, [graphState.gapData, collapsedGaps]) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply/restore compressed positions when collapsed gaps change
  useEffect(() => {
    const { gapData } = graphState
    if (!gapData) return

    if (collapsedGaps.size > 0 && segments) {
      setNodes(prev => prev.map(n => {
        const cx = timeToCompressedX((n.data as { time: number }).time, segments)
        const orig = originalPositions.current.get(n.id)
        return { ...n, position: { x: cx, y: orig?.y ?? n.position.y }, style: { ...n.style, transition: TRANSITION } }
      }))
    } else {
      setNodes(prev => prev.map(n => {
        const orig = originalPositions.current.get(n.id)
        if (!orig) return n
        return { ...n, position: orig, style: { ...n.style, transition: TRANSITION } }
      }))
    }
  }, [collapsedGaps, segments]) // eslint-disable-line react-hooks/exhaustive-deps

  const baseHighlight = useMemo(
    () => selectedNode ? computeHighlight(selectedNode.id, edges) : IDLE,
    [selectedNode, edges]
  )

  // Compute search matches from comma-separated PE labels
  const searchMatchIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>()
    const terms = searchQuery.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    const ids = new Set<string>()
    for (const n of nodes) {
      const label = ((n.data as { label: string }).label ?? '').toUpperCase()
      if (terms.some(t => label.includes(t))) ids.add(n.id)
    }
    return ids
  }, [searchQuery, nodes])

  const highlight = useMemo(
    () => ({ ...baseHighlight, searchMatchIds }),
    [baseHighlight, searchMatchIds]
  )

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (!query.trim()) return
    const terms = query.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    const matched = nodes.filter(n => {
      const label = ((n.data as { label: string }).label ?? '').toUpperCase()
      return terms.some(t => label.includes(t))
    })
    if (matched.length === 0) return
    // Compute bounding box of matched nodes and zoom to fit
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const n of matched) {
      const { x, y } = n.position
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
    const pad = 150
    fitBoundsSearch(
      { x: minX - pad, y: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 },
      { padding: 0.2, duration: 400 }
    )
  }, [nodes, fitBoundsSearch])

  // Linearize on select, restore on deselect
  useEffect(() => {
    if (!selectedNode) {
      if (collapsedGaps.size > 0 && segments) {
        setNodes(prev => prev.map(n => {
          const cx = timeToCompressedX((n.data as { time: number }).time, segments)
          const orig = originalPositions.current.get(n.id)
          return { ...n, position: { x: cx, y: orig?.y ?? n.position.y }, style: { ...n.style, transition: TRANSITION } }
        }))
      } else {
        setNodes(prev => prev.map(n => {
          const orig = originalPositions.current.get(n.id)
          if (!orig) return n
          return { ...n, position: orig, style: { ...n.style, transition: TRANSITION } }
        }))
      }
      return
    }

    const { ancestorNodeIds, descendantNodeIds } = highlight
    if (ancestorNodeIds.size === 0 && descendantNodeIds.size === 0) return

    const selPos = originalPositions.current.get(selectedNode.id)
    if (!selPos) return

    // Build sorted lists using original time data
    const nodeDataById = new Map(graphState.nodes.map(n => [n.id, n.data as { time: number }]))

    const ancestorList = Array.from(ancestorNodeIds)
      .map(id => ({ id, time: nodeDataById.get(id)?.time ?? 0 }))
      .sort((a, b) => a.time - b.time)

    const descendantList = Array.from(descendantNodeIds)
      .map(id => ({ id, time: nodeDataById.get(id)?.time ?? 0 }))
      .sort((a, b) => a.time - b.time)

    const newPositions = new Map<string, { x: number; y: number }>()
    ancestorList.forEach((item, i) => {
      newPositions.set(item.id, { x: selPos.x - (ancestorList.length - i) * SPACING, y: selPos.y })
    })
    descendantList.forEach((item, i) => {
      newPositions.set(item.id, { x: selPos.x + (i + 1) * SPACING, y: selPos.y })
    })

    setNodes(prev => prev.map(n => {
      const pos = newPositions.get(n.id)
      if (!pos) return n
      return { ...n, position: pos, style: { ...n.style, transition: TRANSITION } }
    }))
  }, [selectedNode?.id, highlight.ancestorNodeIds, highlight.descendantNodeIds]) // eslint-disable-line react-hooks/exhaustive-deps

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const toggleGap = useCallback((gapIndex: number) => {
    setCollapsedGaps(prev => {
      const next = new Set(prev)
      if (next.has(gapIndex)) next.delete(gapIndex)
      else next.add(gapIndex)
      return next
    })
  }, [])

  // Compute time range for the axis
  const { minTime, maxTime } = useMemo(() => {
    const times = Object.values(graphState.parsedData?.eventTimes ?? {})
    if (times.length === 0) return { minTime: 0, maxTime: 1 }
    return { minTime: Math.min(...times), maxTime: Math.max(...times) }
  }, [graphState.parsedData])

  const hasAnyCollapsed = collapsedGaps.size > 0

  return (
    <GraphHighlightContext.Provider value={highlight}>
      <div style={{ width: '100%', height: '100%', position: 'relative', background: '#11111b' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          minZoom={0.02}
          fitView
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onMouseMove={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
            setMouseX(e.clientX - rect.left)
          }}
          onMouseLeave={() => setMouseX(null)}
          style={{ background: '#11111b' }}
        >
          <Background color="#313244" gap={40} />
          <Controls style={{ bottom: 32 }} />
          <MiniMap
            nodeColor={(n) => {
              const d = n.data as { isTerminal?: boolean; outDegree?: number }
              if (d.isTerminal) return '#f43f5e'
              if ((d.outDegree ?? 0) > 1) return '#7c3aed'
              return '#0ea5e9'
            }}
            style={{ background: '#1e1e2e', bottom: 32 }}
          />
          <TimeAxis
            minTime={minTime}
            maxTime={maxTime}
            segments={segments}
            gapData={graphState.gapData}
            collapsedGaps={collapsedGaps}
            onToggleGap={toggleGap}
          />
          <CursorTimeIndicator
            mouseX={mouseX}
            minTime={minTime}
            maxTime={maxTime}
            compressed={hasAnyCollapsed}
            segments={segments}
          />
        </ReactFlow>

        <MarqueeZoomOverlay />

        {/* Toolbar */}
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
          display: 'flex',
          gap: 6,
          zIndex: 10,
        }}>
          {availableFiles && availableFiles.length > 1 && onSelectFile ? (
            <select
              value={activeFile ?? ''}
              onChange={(e) => onSelectFile(e.target.value)}
              style={{
                background: '#4f46e5',
                border: '1px solid #6366f1',
                color: '#fff',
                borderRadius: 6,
                padding: '6px 14px',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.02em',
                boxShadow: '0 2px 8px rgba(79,70,229,0.45)',
                appearance: 'none',
                WebkitAppearance: 'none',
                paddingRight: 28,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
              }}
            >
              {availableFiles.map(f => (
                <option key={f} value={f}>{f.replace(/\.txt$/, '')}</option>
              ))}
            </select>
          ) : null}
          <button
            onClick={onReload}
            style={{
              background: '#4f46e5',
              border: '1px solid #6366f1',
              color: '#fff',
              borderRadius: 6,
              padding: '6px 14px',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.02em',
              boxShadow: '0 2px 8px rgba(79,70,229,0.45)',
            }}
          >
            Load new file
          </button>
          <InfoPanel graphState={graphState} />
          <input
            type="text"
            placeholder="Search PEs (e.g. 1080,1149)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(searchQuery) }}
            style={{
              background: '#1e1e2e',
              border: `1px solid ${searchMatchIds.size > 0 ? '#22d3ee' : searchQuery && searchMatchIds.size === 0 ? '#f43f5e' : '#6366f1'}`,
              color: '#fff',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 500,
              width: 180,
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); }}
              style={{
                background: '#313244',
                border: '1px solid #45475a',
                color: '#cdd6f4',
                borderRadius: 6,
                padding: '6px 8px',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              ✕
            </button>
          )}
        </div>

        <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      </div>
    </GraphHighlightContext.Provider>
  )
}
