# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the web app (primary)

Build and serve with Docker:

```bash
docker build -t pe-plotter . && docker run -p 8080:80 pe-plotter
```

Then open `http://localhost:8080`. The default `Scenario info.txt` is bundled into the image automatically.

For local development:

```bash
npm install
npm run dev
```

## Running the legacy Python script

The script uses [PEP 723 inline metadata](https://peps.python.org/pep-0723/) for dependency declaration. Run with `uv`:

```bash
uv run ads_plotter.py
```

Or install dependencies manually and run directly:

```bash
pip install plotly
python ads_plotter.py
```

The script expects `Scenario info.txt` to be present in the working directory.

## Web app architecture

The React + TypeScript app (Vite, React Flow) reads nuclear plant simulator output and renders an interactive DAG showing how operator scenarios flow through Pivotal Events (PEs).

### Data flow

```
Scenario info.txt
  └─ parseScenarioFile()   src/lib/parser.ts
       └─ computeLayout()  src/lib/layout.ts
            └─ useGraphData()  src/hooks/useGraphData.ts
                 └─ PEGraph.tsx  (ReactFlow canvas + toolbar)
                       ├─ PENode.tsx      (custom node renderer)
                       ├─ PEEdge.tsx      (custom edge renderer)
                       ├─ NodeDetailPanel.tsx  (right-side detail panel)
                       └─ InfoPanel.tsx   (stats bar in toolbar)
```

### Key modules

**`src/lib/types.ts`**
- `ParsedData` — output of the parser: `eventTimes`, `eventDetails`, `edges`, `terminalNodes`, `sequenceCount`
- `EdgeData` — `{source, target, count}`
- `LayoutNode` — `{id, label, x, y, isTerminal, time}`

**`src/lib/parser.ts`** — `parseScenarioFile(text)`
- Detects sequence headers: `Event Hightlights for Sequence <N>` (typo in simulator output — preserved)
- PE token regex: `/^\(PE_\d+\)$/`
- Tracks consecutive PE label changes per sequence to build transition paths
- Returns deduplicated edges with traversal counts and `sequenceCount`

**`src/lib/layout.ts`** — `computeLayout(parsed)`
- Assigns x-positions from normalized PE first-occurrence times
- Stacks nodes vertically within each time column

**`src/lib/highlight.ts`** — `computeHighlight(selectedId, edges)`
- BFS backward → `ancestorNodeIds` (nodes that lead to selected)
- BFS forward → `descendantNodeIds` (nodes reachable from selected)
- Returns highlighted edge set + `incomingCount` / `outgoingCount`

**`src/lib/GraphHighlightContext.ts`**
- React context holding `HighlightState`: selected node, ancestor/descendant sets, edge set, in/out counts
- `useHighlight()` hook for consumption in node/edge/panel components

### Node visual states (PENode.tsx)

| State | Background | Text | Notes |
|---|---|---|---|
| Idle non-terminal | `#4a90d9` blue | white | default |
| Idle terminal | `#e05252` red | white | no outgoing edges |
| Ancestor | `#f59e0b` amber | `#1c1917` | leads to selected |
| Descendant | `#34d399` emerald | `#064e3b` | reachable from selected |
| Selected | `#f8fafc` near-white | `#1e1e2e` | amber ring + glow |
| Dimmed | `#1e1e2e` dark | `#45475a` | opacity 0.15 |

### Edge colors (PEEdge.tsx)

- No selection: `rgba(100,100,200,0.3)` idle blue
- Source in ancestor set: `rgba(245,158,11,0.75)` amber
- Source is selected or in descendant set: `rgba(52,211,153,0.75)` emerald
- Off-path (dimmed): `rgba(255,255,255,0.03)` near-invisible

### Event classification (NodeDetailPanel.tsx)

| Prefix | Badge | Color |
|---|---|---|
| `New Alarm:` | `HW` | `#fb923c` orange |
| `Mental Belief:` / `Procedure:` / `Info_gather_mode:` | `COG` | `#a78bfa` violet |
| anything else | `—` | `#6c7086` gray |

Events are grouped into Hardware / Cognitive / Other sections in the detail panel.

## Legacy Python script architecture

`ads_plotter.py` is a single-file pipeline that renders a Sankey diagram with Plotly.

**Data flow:**
1. `read_file()` — parses `Scenario info.txt`, extracting per-sequence PE transitions and the simulation time at which each PE first occurs
2. `map_to_sankey()` — converts event sequences into flat source/target edge lists
3. `tally()` — deduplicates edges and counts how many sequences traverse each transition
4. `convert_to_index()` — maps PE labels to integer indices for Plotly; assigns x-positions from normalized PE times; colors source nodes blue and terminal (sink) nodes red
5. `plot_sankey()` — renders the diagram with Plotly, placing nodes along the x-axis by normalized time
