import type { ParsedData, LayoutNode } from './types'

const NUM_BUCKETS = 250
const CANVAS_WIDTH = 16000
const COLUMN_HEIGHT = 80 // px between nodes in the same bucket

/**
 * Assigns x/y positions to each PE node.
 * x: time-proportional column (NUM_BUCKETS buckets across CANVAS_WIDTH)
 * y: nodes in the same bucket spread vertically, centered around 0,
 *    sorted by numeric PE index for stable ordering.
 */
export function computeLayout(data: ParsedData): LayoutNode[] {
  const { eventTimes, terminalNodes, edges } = data

  // Collect all PE labels that appear in edges
  const allPEs = new Set<string>()
  for (const { source, target } of edges) {
    allPEs.add(source)
    allPEs.add(target)
  }

  // Also include nodes that have times but may have no edges (isolated)
  for (const pe of Object.keys(eventTimes)) {
    allPEs.add(pe)
  }

  const peList = Array.from(allPEs)

  if (peList.length === 0) return []

  const times = peList.map(pe => eventTimes[pe] ?? 0)
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)
  const timeRange = maxTime - minTime || 1

  // Assign each PE to a bucket
  const buckets = new Map<number, string[]>()
  const peBucket = new Map<string, number>()

  for (const pe of peList) {
    const t = eventTimes[pe] ?? 0
    const normalized = (t - minTime) / timeRange
    const bucket = Math.min(Math.floor(normalized * NUM_BUCKETS), NUM_BUCKETS - 1)
    peBucket.set(pe, bucket)
    if (!buckets.has(bucket)) buckets.set(bucket, [])
    buckets.get(bucket)!.push(pe)
  }

  // Sort each bucket by numeric PE index for stable vertical ordering
  const peIndex = (pe: string) => parseInt(pe.replace('PE_', ''), 10)
  for (const arr of buckets.values()) {
    arr.sort((a, b) => peIndex(a) - peIndex(b))
  }

  // Build layout nodes
  const nodes: LayoutNode[] = []

  for (const [bucket, pes] of buckets) {
    const count = pes.length
    const yStart = -((count - 1) * COLUMN_HEIGHT) / 2
    const x = (bucket / NUM_BUCKETS) * CANVAS_WIDTH

    pes.forEach((pe, i) => {
      const y = yStart + i * COLUMN_HEIGHT
      nodes.push({
        id: pe,
        label: pe,
        x,
        y,
        isTerminal: terminalNodes.has(pe),
        time: eventTimes[pe] ?? 0,
      })
    })
  }

  return nodes
}
