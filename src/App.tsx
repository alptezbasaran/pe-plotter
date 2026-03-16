import { useState, useEffect } from 'react'
import { useGraphData } from './hooks/useGraphData'
import FileUpload from './components/FileUpload'
import PEGraph from './components/PEGraph'
import LoadingOverlay from './components/LoadingOverlay'

export default function App() {
  const { graphState, loading, error, loadFile } = useGraphData()
  const [showUpload, setShowUpload] = useState(false)
  const [defaultChecked, setDefaultChecked] = useState(false)
  const [availableFiles, setAvailableFiles] = useState<string[]>([])
  const [activeFile, setActiveFile] = useState<string | null>(null)

  // Discover available scenario files and auto-load the default
  useEffect(() => {
    fetch('/files.json')
      .then(r => { if (r.ok) return r.json() as Promise<string[]>; throw new Error('no manifest') })
      .then(files => {
        setAvailableFiles(files)
        const defaultFile = files.includes('Scenario info.txt') ? 'Scenario info.txt' : files[0]
        if (defaultFile) {
          loadServerFile(defaultFile)
        }
      })
      .catch(() => {
        // Fallback: try loading single default file (e.g. GitHub Pages)
        fetch('/Scenario%20info.txt')
          .then(r => { if (r.ok) return r.text(); throw new Error('no default') })
          .then(text => {
            const file = new File([text], 'Scenario info.txt', { type: 'text/plain' })
            loadFile(file)
            setActiveFile('Scenario info.txt')
          })
          .catch(() => { /* no default file — show upload screen */ })
      })
      .finally(() => setDefaultChecked(true))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadServerFile = (name: string) => {
    fetch('/' + encodeURIComponent(name))
      .then(r => { if (r.ok) return r.text(); throw new Error('fetch failed') })
      .then(text => {
        const file = new File([text], name, { type: 'text/plain' })
        setActiveFile(name)
        setShowUpload(false)
        loadFile(file)
      })
  }

  // Show upload screen when: no data yet (and default check done), or user clicked "Load new file"
  const showFileUpload = defaultChecked && (!graphState || showUpload)

  const handleFile = (file: File) => {
    setShowUpload(false)
    loadFile(file)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {showFileUpload && !loading ? (
        <FileUpload onFile={handleFile} />
      ) : graphState ? (
        <PEGraph
          graphState={graphState}
          onReload={() => setShowUpload(true)}
          availableFiles={availableFiles}
          activeFile={activeFile}
          onSelectFile={loadServerFile}
        />
      ) : null}

      {loading && <LoadingOverlay />}

      {error && (
        <div style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#f38ba8',
          color: '#11111b',
          padding: '10px 20px',
          borderRadius: 8,
          fontWeight: 600,
          zIndex: 30,
        }}>
          Error: {error}
        </div>
      )}
    </div>
  )
}
