import type { ParsedData, LayoutNode, CompressedSegment } from './types'

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
        label: pe.replace('PE_', ''),
        x,
        y,
        isTerminal: terminalNodes.has(pe),
        time: eventTimes[pe] ?? 0,
      })
    })
  }

  return nodes
}

const GAP_CANVAS_WIDTH = 400

export interface GapInterval {
  /** Index into the intervals array */
  index: number
  t0: number
  t1: number
}

/**
 * Identifies large time gaps between PE clusters.
 * Returns the full interval list and which intervals are gaps.
 */
export function identifyGaps(
  layoutNodes: LayoutNode[],
  threshold = 0.05
): { intervals: { t0: number; t1: number; isGap: boolean }[]; gaps: GapInterval[] } | null {
  if (layoutNodes.length === 0) return null

  const times = layoutNodes.map(n => n.time)
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)
  const timeRange = maxTime - minTime || 1

  const uniqueTimes = Array.from(new Set(times)).sort((a, b) => a - b)

  const intervals: { t0: number; t1: number; isGap: boolean }[] = []
  for (let i = 0; i < uniqueTimes.length - 1; i++) {
    const t0 = uniqueTimes[i]
    const t1 = uniqueTimes[i + 1]
    const isGap = (t1 - t0) > threshold * timeRange
    intervals.push({ t0, t1, isGap })
  }

  const gaps: GapInterval[] = intervals
    .map((iv, i) => iv.isGap ? { index: i, t0: iv.t0, t1: iv.t1 } : null)
    .filter((g): g is GapInterval => g !== null)

  if (gaps.length === 0) return null

  return { intervals, gaps }
}

/**
 * Builds compressed segments where only the gaps in collapsedSet are compressed.
 * Returns segments array for coordinate mapping.
 */
export function buildSegments(
  intervals: { t0: number; t1: number; isGap: boolean }[],
  collapsedSet: Set<number>
): CompressedSegment[] {
  const numCollapsed = intervals.filter((iv, i) => iv.isGap && collapsedSet.has(i)).length
  const normalDuration = intervals
    .filter((iv, i) => !(iv.isGap && collapsedSet.has(i)))
    .reduce((s, iv) => s + (iv.t1 - iv.t0), 0)
  const normalCanvas = Math.max(CANVAS_WIDTH - numCollapsed * GAP_CANVAS_WIDTH, CANVAS_WIDTH * 0.3)

  const segments: CompressedSegment[] = []
  let curX = 0

  for (let i = 0; i < intervals.length; i++) {
    const iv = intervals[i]
    const isCollapsed = iv.isGap && collapsedSet.has(i)
    const canvasWidth = isCollapsed
      ? GAP_CANVAS_WIDTH
      : (normalDuration > 0 ? ((iv.t1 - iv.t0) / normalDuration) * normalCanvas : 0)
    segments.push({ t0: iv.t0, t1: iv.t1, x0: curX, x1: curX + canvasWidth, isGap: iv.isGap })
    curX += canvasWidth
  }

  return segments
}

export function timeToCompressedX(t: number, segments: CompressedSegment[]): number {
  if (segments.length === 0) return 0

  // Handle time before first segment
  if (t <= segments[0].t0) return segments[0].x0

  for (const seg of segments) {
    if (t >= seg.t0 && t <= seg.t1) {
      const frac = seg.t1 > seg.t0 ? (t - seg.t0) / (seg.t1 - seg.t0) : 0
      return seg.x0 + frac * (seg.x1 - seg.x0)
    }
  }

  // After last segment
  return segments[segments.length - 1].x1
}

export function compressedXToTime(x: number, segments: CompressedSegment[]): number {
  if (segments.length === 0) return 0

  if (x <= segments[0].x0) return segments[0].t0

  for (const seg of segments) {
    if (x >= seg.x0 && x <= seg.x1) {
      const frac = seg.x1 > seg.x0 ? (x - seg.x0) / (seg.x1 - seg.x0) : 0
      return seg.t0 + frac * (seg.t1 - seg.t0)
    }
  }

  return segments[segments.length - 1].t1
}
