import type { ParsedData, EdgeData } from './types'

/**
 * Port of ads_plotter.py read_file() + map_to_sankey() + tally().
 * Sequence header: line containing both "Event" and "Hightlights" (typo preserved).
 * PE token: matches /^\(PE_\d+\)$/, parens stripped.
 * Time: parseFloat of the first token on the line.
 * eventTimes[pe] set only on first global occurrence.
 * eventDetails[pe] accumulates all description strings (everything after the PE token).
 */
export function parseScenarioFile(text: string): ParsedData {
  const eventSequences: Record<string, string[]> = {}
  const eventTimes: Record<string, number> = {}
  const eventDetails: Record<string, string[]> = {}

  let currentSequence = ''

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    const tokens = line.split(/\s+/)

    // Sequence header detection
    if (tokens.includes('Event') && tokens.includes('Hightlights')) {
      // Sequence number is second-to-last token: "*** Event Hightlights for Sequence N ***"
      currentSequence = tokens[tokens.length - 2]
      eventSequences[currentSequence] = []
      continue
    }

    if (!currentSequence) continue

    // Find PE token — matches (PE_<digits>)
    const peToken = tokens.find(t => /^\(PE_\d+\)$/.test(t))
    if (!peToken) continue

    const pe = peToken.slice(1, -1) // strip parens → PE_N
    const time = parseFloat(tokens[0])

    // Collect description (everything after the PE token on this line)
    const peIdx = rawLine.indexOf(peToken)
    const description = rawLine.slice(peIdx + peToken.length).trim()
    if (description) {
      if (!eventDetails[pe]) eventDetails[pe] = []
      eventDetails[pe].push(description)
    }

    const seq = eventSequences[currentSequence]
    let added = false

    if (seq.length === 0) {
      seq.push(pe)
      added = true
    } else if (seq[seq.length - 1] !== pe) {
      seq.push(pe)
      added = true
    }

    if (added && !(pe in eventTimes)) {
      eventTimes[pe] = time
    }
  }

  // map_to_sankey
  const rawEdges: Array<[string, string]> = []
  for (const seq of Object.values(eventSequences)) {
    for (let i = 0; i < seq.length - 1; i++) {
      rawEdges.push([seq[i], seq[i + 1]])
    }
  }

  // tally
  const counter = new Map<string, number>()
  for (const [src, tgt] of rawEdges) {
    const key = `${src}|||${tgt}`
    counter.set(key, (counter.get(key) ?? 0) + 1)
  }

  const edges: EdgeData[] = []
  const sourceSet = new Set<string>()
  const targetSet = new Set<string>()

  for (const [key, count] of counter) {
    const [source, target] = key.split('|||')
    edges.push({ source, target, count })
    sourceSet.add(source)
    targetSet.add(target)
  }

  const terminalNodes = new Set<string>()
  for (const t of targetSet) {
    if (!sourceSet.has(t)) terminalNodes.add(t)
  }

  return { eventTimes, eventDetails, edges, terminalNodes, sequenceCount: Object.keys(eventSequences).length }
}
