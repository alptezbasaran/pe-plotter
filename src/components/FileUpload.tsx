import { useCallback, useRef, useState } from 'react'

interface Props {
  onFile: (file: File) => void
}

export default function FileUpload({ onFile }: Props) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }, [onFile])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    // Reset so same file can be re-uploaded
    e.target.value = ''
  }, [onFile])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      background: '#11111b',
      color: '#cdd6f4',
    }}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#89b4fa' : '#45475a'}`,
          borderRadius: 8,
          padding: '28px 48px',
          cursor: 'pointer',
          background: dragging ? 'rgba(137,180,250,0.07)' : '#1e1e2e',
          transition: 'all 0.2s',
          textAlign: 'center',
          userSelect: 'none',
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 10 }}>📂</div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
          Drop <code>Scenario info.txt</code> here
        </div>
        <div style={{ fontSize: 11, color: '#6c7086' }}>or click to browse</div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".txt"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </div>
  )
}
