import type { Edge } from '@xyflow/react'
import type { HighlightState } from './GraphHighlightContext'

/**
 * Given a selected node and the full edge list, compute:
 *   backwardSet — all nodes that can reach selectedId (going backwards)
 *   forwardSet  — all nodes reachable from selectedId (going forwards), includes selectedId
 *
 * A node is highlighted if it's in backwardSet ∪ forwardSet.
 * An edge (u→v) is highlighted if u ∈ backwardSet AND v ∈ forwardSet.
 * This ensures only edges on paths *through* the selected node are lit up.
 */
export function computeHighlight(selectedId: string, edges: Edge[]): HighlightState {
  // Build adjacency lists
  const forward = new Map<string, string[]>()
  const backward = new Map<string, string[]>()

  for (const e of edges) {
    if (!forward.has(e.source)) forward.set(e.source, [])
    forward.get(e.source)!.push(e.target)

    if (!backward.has(e.target)) backward.set(e.target, [])
    backward.get(e.target)!.push(e.source)
  }

  function bfs(start: string, adj: Map<string, string[]>): Set<string> {
    const visited = new Set<string>([start])
    const queue = [start]
    while (queue.length) {
      const cur = queue.shift()!
      for (const next of adj.get(cur) ?? []) {
        if (!visited.has(next)) {
          visited.add(next)
          queue.push(next)
        }
      }
    }
    return visited
  }

  const backwardSet = bfs(selectedId, backward) // nodes that lead to selectedId
  const forwardSet = bfs(selectedId, forward)   // nodes reachable from selectedId

  const highlightedNodeIds = new Set([...backwardSet, ...forwardSet])

  const highlightedEdgeIds = new Set<string>()
  for (const e of edges) {
    if (highlightedNodeIds.has(e.source) && highlightedNodeIds.has(e.target)) {
      highlightedEdgeIds.add(e.id)
    }
  }

  // ancestorNodeIds = backwardSet − {selectedId}
  const ancestorNodeIds = new Set(backwardSet)
  ancestorNodeIds.delete(selectedId)

  // descendantNodeIds = forwardSet − {selectedId}
  const descendantNodeIds = new Set(forwardSet)
  descendantNodeIds.delete(selectedId)

  const incomingCount = (backward.get(selectedId) ?? []).length
  const outgoingCount = (forward.get(selectedId) ?? []).length

  return {
    selectedId,
    highlightedNodeIds,
    highlightedEdgeIds,
    ancestorNodeIds,
    descendantNodeIds,
    incomingCount,
    outgoingCount,
    searchMatchIds: new Set<string>(),
  }
}
