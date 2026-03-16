export default function LoadingOverlay() {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(17,17,27,0.85)',
      zIndex: 20,
      color: '#cdd6f4',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        width: 48,
        height: 48,
        border: '4px solid #45475a',
        borderTop: '4px solid #89b4fa',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginBottom: 16,
      }} />
      <div style={{ fontSize: 16, fontWeight: 600 }}>Parsing scenario file…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
