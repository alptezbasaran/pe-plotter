# PE Plotter

Interactive DAG visualizer for nuclear plant simulator operator scenarios. Reads `Scenario info.txt` output from a simulator and renders how operator sequences flow through Pivotal Events (PEs).

**Live demo:** https://alptezbasaran.github.io/pe-plotter/

---

## Features

- **Interactive DAG** — nodes positioned along a time axis; pan, zoom, minimap
- **Traversal-weighted nodes** — node size scales with how many sequences pass through it
- **Branch highlighting** — violet nodes have `outDegree > 1` (sequences diverge)
- **Terminal nodes** — red nodes have no outgoing edges (sequence endpoints)
- **Node selection** — click a node to highlight its full ancestor/descendant chain
- **Sequence linearization** — selected chain animates into a horizontal line sorted by time
- **Time axis** — persistent axis bar at the bottom, ticks adapt to zoom/pan level
- **Detail panel** — events at a selected node classified as Hardware / Cognitive / Other
- **Cursor time indicator** — vertical line following the mouse with a live `t = X.X s` label at the time axis
- **Node hover glow** — white ring on hovered nodes; dimmed nodes temporarily pop into view on hover

---

## Running

### Web app (Docker)

```bash
docker build -t pe-plotter . && docker run -p 8080:80 pe-plotter
```

Open `http://localhost:8080`. The default `Scenario info.txt` is bundled into the image.

### Local development

```bash
npm install
npm run dev
```

### Legacy Python script

```bash
uv run legacy/ads_plotter.py
```

Expects `Scenario info.txt` in the working directory. Renders a Sankey diagram with Plotly.

---

## Input format

The app reads `Scenario info.txt` — simulator output containing per-sequence PE transition logs. Upload your own file via the **Load new file** button in the app.

---

## Architecture

```
Scenario info.txt
  └─ parseScenarioFile()   src/lib/parser.ts
       └─ computeLayout()  src/lib/layout.ts
            └─ useGraphData()  src/hooks/useGraphData.ts
                 └─ PEGraph.tsx
                       ├─ PENode.tsx          node renderer (size ∝ traversal count)
                       ├─ PEEdge.tsx          edge renderer (width ∝ traversal count)
                       ├─ TimeAxis.tsx            adaptive time axis overlay
                       ├─ CursorTimeIndicator.tsx cursor position → time label
                       ├─ NodeDetailPanel.tsx right-side detail panel
                       └─ InfoPanel.tsx       stats bar
```

**Canvas coordinate system:** `canvasX = ((t - minTime) / timeRange) * 16000`

---

## Deployment

Pushes to `main` automatically deploy to GitHub Pages via `.github/workflows/deploy.yml`.
