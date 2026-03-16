import type { Node } from '@xyflow/react'
import { useHighlight } from '../lib/GraphHighlightContext'

interface Props {
  node: Node | null
  onClose: () => void
}

interface PENodeData {
  label: string
  isTerminal: boolean
  time: number
  details: string[]
  [key: string]: unknown
}

type EventCategory = 'hw' | 'cog' | 'unknown'

function classifyEvent(desc: string): EventCategory {
  if (desc.startsWith('New Alarm:')) return 'hw'
  if (
    desc.startsWith('Mental Belief:') ||
    desc.startsWith('Procedure:') ||
    desc.startsWith('Info_gather_mode:')
  ) return 'cog'
  return 'unknown'
}

function Badge({ cat }: { cat: EventCategory }) {
  const label = cat === 'hw' ? 'HW' : cat === 'cog' ? 'COG' : '—'
  const bg = cat === 'hw' ? '#fb923c' : cat === 'cog' ? '#a78bfa' : '#6c7086'
  return (
    <span style={{
      background: bg,
      color: '#fff',
      borderRadius: 3,
      fontSize: 9,
      fontWeight: 700,
      padding: '1px 4px',
      marginRight: 5,
      flexShrink: 0,
    }}>
      {label}
    </span>
  )
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      margin: '8px 0 4px',
      color: '#6c7086',
      fontSize: 10,
    }}>
      <div style={{ flex: 1, height: 1, background: '#313244' }} />
      <span style={{ whiteSpace: 'nowrap' }}>{label} ({count})</span>
      <div style={{ flex: 1, height: 1, background: '#313244' }} />
    </div>
  )
}

export default function NodeDetailPanel({ node, onClose }: Props) {
  const { incomingCount, outgoingCount } = useHighlight()
  if (!node) return null
  const d = node.data as PENodeData

  const hw = d.details.filter(e => classifyEvent(e) === 'hw')
  const cog = d.details.filter(e => classifyEvent(e) === 'cog')
  const unknown = d.details.filter(e => classifyEvent(e) === 'unknown')

  return (
    <div style={{
      position: 'absolute',
      top: 12,
      right: 12,
      width: 300,
      maxHeight: 'calc(100vh - 24px)',
      overflowY: 'auto',
      background: '#1e1e2e',
      color: '#cdd6f4',
      borderRadius: 6,
      padding: '10px 12px',
      zIndex: 10,
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      fontSize: 11,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ fontSize: 13, color: d.isTerminal ? '#f38ba8' : '#89b4fa' }}>{d.label}</strong>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#6c7086', cursor: 'pointer', fontSize: 13, lineHeight: 1 }}
        >
          ✕
        </button>
      </div>
      <div style={{ color: '#a6adc8', marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>t =</span> {d.time.toFixed(3)} s &nbsp;·&nbsp;
        {d.isTerminal ? <span style={{ color: '#f38ba8' }}>terminal</span> : <span style={{ color: '#89b4fa' }}>non-terminal</span>}
      </div>
      <div style={{ color: '#6c7086', marginBottom: 6, fontSize: 10 }}>
        ← {incomingCount} incoming &nbsp;·&nbsp; {outgoingCount} outgoing →
      </div>
      <hr style={{ border: 'none', borderTop: '1px solid #313244', margin: '7px 0' }} />
      <div style={{ fontWeight: 600, marginBottom: 2, color: '#a6adc8' }}>
        Events ({d.details.length})
      </div>
      {d.details.length === 0 ? (
        <div style={{ color: '#585b70' }}>—</div>
      ) : (
        <>
          {hw.length > 0 && (
            <>
              <SectionHeader label="Hardware" count={hw.length} />
              {hw.map((desc, i) => (
                <div key={`hw-${i}`} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 3, lineHeight: 1.45 }}>
                  <Badge cat="hw" />
                  <span>{desc}</span>
                </div>
              ))}
            </>
          )}
          {cog.length > 0 && (
            <>
              <SectionHeader label="Cognitive" count={cog.length} />
              {cog.map((desc, i) => (
                <div key={`cog-${i}`} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 3, lineHeight: 1.45 }}>
                  <Badge cat="cog" />
                  <span>{desc}</span>
                </div>
              ))}
            </>
          )}
          {unknown.length > 0 && (
            <>
              <SectionHeader label="Other" count={unknown.length} />
              {unknown.map((desc, i) => (
                <div key={`unk-${i}`} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 3, lineHeight: 1.45 }}>
                  <Badge cat="unknown" />
                  <span>{desc}</span>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  )
}
