# WoollySheep - Claude Context Document

This document provides context for Claude instances working on this codebase.

## Project Overview

**WoollySheep** is a browser-based knitting pattern designer for jumpers/sweaters. Users can:
- Design pixel-based patterns on a grid representing a jumper shape
- Select and color pixels with various tools (click, drag, fill)
- Use symmetry/mirror modes for balanced designs
- Export designs as PNG, PDF, or text instructions
- Save/load patterns to localStorage
- Switch between different jumper styles and sizes
- Design both front and back panels

## Tech Stack

- **Pure vanilla JavaScript** (ES6 modules)
- **No build tools** - runs directly in browser
- **Requires local web server** (ES modules don't work via `file://` protocol)
- Run with: `python3 -m http.server 8000` then open `http://localhost:8000`

## File Structure

```
WoollySheep/
├── index.html              # Main HTML with sidebar and canvas structure
├── styles.css              # All styling including dark mode, sidebar, modals
├── js/
│   ├── main.js             # Entry point, event listeners, initialization
│   ├── state.js            # Centralized application state
│   ├── config.js           # Legacy constants (fallback values)
│   ├── canvas.js           # Grid building, pixel creation
│   ├── canvasManager.js    # Orchestrates canvas rebuilds for config changes
│   ├── panelManager.js     # Front/back panel switching
│   ├── jumperConfigs.js    # Loads/validates jumper JSON configurations
│   ├── designPorting.js    # Strategies for porting designs between sizes
│   ├── portingModal.js     # UI modal for porting strategy selection
│   ├── sidebar.js          # Sidebar UI for jumper settings
│   ├── selection.js        # Pixel selection logic
│   ├── fill.js             # Flood fill tool
│   ├── symmetry.js         # Mirror modes and reflection
│   ├── history.js          # Undo/redo functionality
│   ├── zoom.js             # Canvas zoom controls
│   ├── minimap.js          # Mini-map navigation widget
│   ├── rowHighlight.js     # Row highlighting for knitting guidance
│   ├── persistence.js      # Save/load patterns, autosave (v2 format)
│   ├── ui.js               # Save/load modal UI
│   └── export.js           # PNG, PDF, text export
└── jumperConfigs/          # JSON files defining jumper shapes
    ├── raglan-standard.json
    ├── drop-shoulder-standard.json
    ├── set-in-sleeve-standard.json
    └── circular-yoke-standard.json
```

## Key Architecture Concepts

### State Management (`js/state.js`)

Centralized state object containing:
```javascript
state = {
    pixels: [],              // Array of pixel DOM elements
    pixelMap: Map(),         // Quick lookup: "row,col" -> pixel element

    // Mode flags
    isFillMode: false,
    mirrorH: false,
    mirrorV: false,

    // History
    undoStack: [],
    redoStack: [],

    // Jumper configuration
    jumperConfig: {
        activeConfigId: 'raglan-standard',
        activeSize: 'M',
        activePanel: 'front',      // 'front' or 'back'
        configs: Map(),            // Built-in configs loaded from JSON
        customConfigs: Map(),      // User-uploaded configs
    },

    // Design data (separate from canvas display)
    design: {
        front: {},   // { "row-col": "color" }
        back: {},
    }
}
```

### Jumper Configurations

Each jumper type is defined in a JSON file with this structure:
```json
{
    "id": "raglan-standard",
    "name": "Raglan Jumper",
    "type": "raglan",
    "sizes": {
        "M": {
            "totalRows": 138,
            "maxColumns": 107,
            "centerColumn": 54,
            "centerRow": 69,
            "rowsConfig": [
                { "start": 1, "end": 103, "columns": 107 },
                { "start": 104, "end": 104, "columns": 97, "padding": 5 },
                { "start": 105, "end": 116, "startColumns": 97, "step": -2 },
                { "start": 117, "end": 138, "columns": 73, "padding": 17 }
            ]
        }
    }
}
```

The `rowsConfig` array defines the shape - each row range specifies how many columns are active (the jumper silhouette).

### Design Porting

When users change jumper size/style with an existing design, they choose a porting strategy:
- **Scale**: Interpolate design to fit new dimensions
- **Center & Clip**: Keep centered, clip edges if smaller
- **Anchor Top-Left/Center/Bottom-Center**: Preserve position from anchor point
- **Discard**: Clear design and start fresh

### Persistence (v2 Format)

Save format includes both panels and jumper config:
```javascript
{
    version: 2,
    savedAt: "ISO timestamp",
    jumperConfig: { configId, size },
    design: { front: {...}, back: {...} },
    metadata: { totalPixels, jumperType, jumperName },
    legacyData: { data, pixelCount }  // v1 backward compatibility
}
```

## Module Responsibilities

| Module | Purpose |
|--------|---------|
| `canvas.js` | Builds the pixel grid, clears/rebuilds canvas |
| `canvasManager.js` | Coordinates config/size changes, triggers rebuilds |
| `panelManager.js` | Switches front/back, saves/loads panel designs |
| `jumperConfigs.js` | Fetches JSON configs, validates, manages custom uploads |
| `designPorting.js` | Implements porting algorithms |
| `portingModal.js` | Shows porting UI when changing size/style |
| `sidebar.js` | Handles sidebar UI, jumper/size/panel selection |
| `persistence.js` | localStorage save/load, autosave, v1→v2 migration |
| `minimap.js` | Renders mini overview, click-to-navigate |
| `symmetry.js` | Mirror modes (live mirroring while drawing) |
| `fill.js` | Flood fill algorithm |

## Initialization Flow (`main.js`)

1. `initDarkMode()` - Load dark mode preference
2. `await initJumperConfigs()` - Fetch JSON configs
3. Get DOM element references
4. Initialize modules (history, zoom, persistence, UI, export, rowHighlight)
5. `buildCanvas(canvas)` - Create pixel grid
6. `initMinimap()` - Create mini-map
7. Initialize modules needing minimap callback (symmetry, fill)
8. `initCanvasManager()`, `initPanelManager()`, `initSidebar()`
9. Set up event listeners
10. `loadAutoSave()` - Restore previous session

## CSS Architecture

- Uses CSS custom properties for theming (light/dark mode)
- Sidebar: fixed position, slides in/out with transform
- Toggle button: fixed position outside sidebar, moves when sidebar opens
- Canvas: CSS Grid layout with dynamic column count
- Pixels: 10x10px with 1px gap

## Recent Changes (Multi-Jumper Support)

Added in commit `f5cead1`:
- 4 jumper styles with 5 sizes each
- Front/back panel toggle
- Design porting system with 5 strategies
- Collapsible sidebar UI
- v2 persistence format with migration
- Custom JSON config upload

## Known Issues / Notes

1. **Requires web server**: ES modules and fetch() don't work from `file://` protocol
2. **Minimap uses legacy constants**: `minimap.js` still imports from `config.js` (works but doesn't update for different configs)
3. **Sidebar toggle**: Button is outside sidebar element, positioned fixed

## Common Tasks

### Adding a new jumper style
1. Create `jumperConfigs/new-style.json` following existing schema
2. Add filename to `BUILT_IN_CONFIGS` array in `jumperConfigs.js`

### Modifying canvas behavior
- Grid building: `canvas.js` → `buildCanvas()`
- Pixel interactions: `main.js` event listeners + `selection.js`
- Color application: look for `pushToUndoStack()` calls

### Debugging
Add `console.log` statements and use browser DevTools. Remember to hard refresh (`Cmd+Shift+R`) to bypass cache.
