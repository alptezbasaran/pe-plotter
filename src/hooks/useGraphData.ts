import { useState, useCallback } from 'react'
import type { Node, Edge } from '@xyflow/react'
import { parseScenarioFile } from '../lib/parser'
import { computeLayout, identifyGaps } from '../lib/layout'
import type { ParsedData } from '../lib/types'
import type { GapInterval } from '../lib/layout'

export interface GraphState {
  nodes: Node[]
  edges: Edge[]
  parsedData: ParsedData | null
  maxCount: number
  gapData: {
    intervals: { t0: number; t1: number; isGap: boolean }[]
    gaps: GapInterval[]
  } | null
}

export function useGraphData() {
  const [graphState, setGraphState] = useState<GraphState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFile = useCallback((file: File) => {
    setLoading(true)
    setError(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const parsed = parseScenarioFile(text)
        const layoutNodes = computeLayout(parsed)
        const gapData = identifyGaps(layoutNodes, 0.03)

        const maxCount = Math.max(...parsed.edges.map(e => e.count), 1)

        const outDegreeMap = new Map<string, number>()
        for (const { source } of parsed.edges) {
          outDegreeMap.set(source, (outDegreeMap.get(source) ?? 0) + 1)
        }

        const inCountMap = new Map<string, number>()
        for (const { target, count } of parsed.edges) {
          inCountMap.set(target, (inCountMap.get(target) ?? 0) + count)
        }
        const outCountMap = new Map<string, number>()
        for (const { source, count } of parsed.edges) {
          outCountMap.set(source, (outCountMap.get(source) ?? 0) + count)
        }
        const nodeTraversal = (id: string) =>
          Math.max(inCountMap.get(id) ?? 0, outCountMap.get(id) ?? 0) || 1
        const maxTraversalCount = Math.max(...layoutNodes.map(n => nodeTraversal(n.id)), 1)

        const nodes: Node[] = layoutNodes.map(n => ({
          id: n.id,
          type: 'peNode',
          position: { x: n.x, y: n.y },
          data: {
            label: n.label,
            isTerminal: n.isTerminal,
            time: n.time,
            details: parsed.eventDetails[n.id] ?? [],
            outDegree: outDegreeMap.get(n.id) ?? 0,
            traversalCount: nodeTraversal(n.id),
            maxTraversalCount,
          },
        }))

        const edges: Edge[] = parsed.edges.map(({ source, target, count }) => ({
          id: `${source}-->${target}`,
          source,
          target,
          type: 'peEdge',
          animated: false,
          data: { count, maxCount },
        }))

        setGraphState({ nodes, edges, parsedData: parsed, maxCount, gapData })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Parse error')
      } finally {
        setLoading(false)
      }
    }

    reader.onerror = () => {
      setError('Failed to read file')
      setLoading(false)
    }

    reader.readAsText(file)
  }, [])

  return { graphState, loading, error, loadFile }
}
