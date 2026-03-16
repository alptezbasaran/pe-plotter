import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { GraphState } from '../hooks/useGraphData'
import { GraphHighlightContext, IDLE } from '../lib/GraphHighlightContext'
import { computeHighlight } from '../lib/highlight'
import PENode from './PENode'
import PEEdge from './PEEdge'
import NodeDetailPanel from './NodeDetailPanel'
import InfoPanel from './InfoPanel'
import TimeAxis from './TimeAxis'

const nodeTypes = { peNode: PENode }
const edgeTypes = { peEdge: PEEdge }

const SPACING = 220
const TRANSITION = 'transform 0.35s cubic-bezier(0.4,0,0.2,1)'

interface Props {
  graphState: GraphState
  onReload: () => void
}

export default function PEGraph({ graphState, onReload }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(graphState.nodes)
  const [edges, , onEdgesChange] = useEdgesState(graphState.edges)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  const originalPositions = useRef<Map<string, { x: number; y: number }>>(new Map())

  // Capture original positions whenever graphState changes
  useEffect(() => {
    const map = new Map<string, { x: number; y: number }>()
    for (const n of graphState.nodes) {
      map.set(n.id, { x: n.position.x, y: n.position.y })
    }
    originalPositions.current = map
  }, [graphState])

  const highlight = useMemo(
    () => selectedNode ? computeHighlight(selectedNode.id, edges) : IDLE,
    [selectedNode, edges]
  )

  // Linearize on select, restore on deselect
  useEffect(() => {
    if (!selectedNode) {
      setNodes(prev => prev.map(n => {
        const orig = originalPositions.current.get(n.id)
        if (!orig) return n
        return { ...n, position: orig, style: { ...n.style, transition: TRANSITION } }
      }))
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

  // Compute time range for the axis
  const { minTime, maxTime } = useMemo(() => {
    const times = Object.values(graphState.parsedData?.eventTimes ?? {})
    if (times.length === 0) return { minTime: 0, maxTime: 1 }
    return { minTime: Math.min(...times), maxTime: Math.max(...times) }
  }, [graphState.parsedData])

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
          <TimeAxis minTime={minTime} maxTime={maxTime} />
        </ReactFlow>

        {/* Toolbar */}
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
          display: 'flex',
          gap: 6,
          zIndex: 10,
        }}>
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
        </div>

        <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      </div>
    </GraphHighlightContext.Provider>
  )
}
