export interface ParsedData {
  /** PE label → first-occurrence simulation time */
  eventTimes: Record<string, number>
  /** PE label → array of description strings */
  eventDetails: Record<string, string[]>
  /** Deduplicated edges with counts */
  edges: EdgeData[]
  /** Set of PE labels that appear only as targets (never as source) */
  terminalNodes: Set<string>
  /** Number of distinct sequences parsed */
  sequenceCount: number
}

export interface EdgeData {
  source: string
  target: string
  count: number
}

export interface LayoutNode {
  id: string
  label: string
  x: number
  y: number
  isTerminal: boolean
  time: number
}

export interface CompressedSegment {
  t0: number; t1: number   // time range
  x0: number; x1: number   // canvas x range
  isGap: boolean
}
