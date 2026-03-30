import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'

export default function LandingPage() {
  const base = import.meta.env.BASE_URL
  const legacyHref = `${base}visualization.html`

  const cardStyle: CSSProperties = {
    background: '#1e1e2e',
    border: '1px solid #313244',
    borderRadius: 12,
    padding: 20,
    width: 340,
    minHeight: 170,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 16,
  }

  const buttonStyle: CSSProperties = {
    display: 'inline-block',
    textDecoration: 'none',
    fontWeight: 700,
    borderRadius: 8,
    padding: '10px 14px',
    background: '#89b4fa',
    color: '#11111b',
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#11111b',
        color: '#cdd6f4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <section style={{ maxWidth: 860, width: '100%' }}>
        <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.2 }}>PE Plotter</h1>
        <p style={{ marginTop: 10, marginBottom: 28, color: '#a6adc8' }}>
          Choose which visualization experience you want to open.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <article style={cardStyle}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22 }}>Interactive DAG App</h2>
              <p style={{ marginTop: 10, color: '#a6adc8' }}>
                React + React Flow application for loading and exploring scenario files.
              </p>
            </div>
            <Link to="/app" style={buttonStyle}>
              Open DAG App
            </Link>
          </article>

          <article style={cardStyle}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22 }}>Optimization Speedup</h2>
              <p style={{ marginTop: 10, color: '#a6adc8' }}>
                D3 visualization of ADS-IDAC optimization progression and parallel speedup across sequences.
              </p>
            </div>
            <a href={legacyHref} style={buttonStyle}>
              Open Speedup Chart
            </a>
          </article>
        </div>
      </section>
    </main>
  )
}
