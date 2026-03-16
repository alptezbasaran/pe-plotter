import type { GraphState } from '../hooks/useGraphData'

interface Props {
  graphState: GraphState
}

export default function InfoPanel({ graphState }: Props) {
  const { nodes, edges, parsedData } = graphState
  if (!parsedData) return null

  const times = Object.values(parsedData.eventTimes)
  const maxTime = times.length ? Math.max(...times) : 0

  const terminalCount = nodes.filter(n => (n.data as { isTerminal?: boolean }).isTerminal).length
  const nonTerminalCount = nodes.length - terminalCount

  const chip = (text: string) => (
    <span style={{
      background: 'rgba(30,30,46,0.92)',
      border: '1px solid #45475a',
      color: '#cdd6f4',
      borderRadius: 6,
      padding: '5px 10px',
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
    }}>
      {text}
    </span>
  )

  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
      {chip(`⏱ ${maxTime.toFixed(1)} s`)}
      {chip(`◉ ${nodes.length} PE (${nonTerminalCount} + ${terminalCount} T)`)}
      {chip(`→ ${edges.length} transitions`)}
      {chip(`⑂ ${parsedData.sequenceCount} sequences`)}
    </div>
  )
}
