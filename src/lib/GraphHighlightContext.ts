import { createContext, useContext } from 'react'

export interface HighlightState {
  selectedId: string | null
  /** Nodes that are on a path passing through selectedId */
  highlightedNodeIds: Set<string>
  /** Edges whose (source ∈ backward-reachable) AND (target ∈ forward-reachable) */
  highlightedEdgeIds: Set<string>
  /** Nodes that can reach selectedId (backwardSet − {selectedId}) */
  ancestorNodeIds: Set<string>
  /** Nodes reachable from selectedId (forwardSet − {selectedId}) */
  descendantNodeIds: Set<string>
  /** Number of direct predecessors of selectedId */
  incomingCount: number
  /** Number of direct successors of selectedId */
  outgoingCount: number
  /** Nodes matching the current search query */
  searchMatchIds: Set<string>
}

export const IDLE: HighlightState = {
  selectedId: null,
  highlightedNodeIds: new Set(),
  highlightedEdgeIds: new Set(),
  ancestorNodeIds: new Set(),
  descendantNodeIds: new Set(),
  incomingCount: 0,
  outgoingCount: 0,
  searchMatchIds: new Set(),
}

export const GraphHighlightContext = createContext<HighlightState>(IDLE)

export const useHighlight = () => useContext(GraphHighlightContext)
