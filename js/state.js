// Centralized application state
export const state = {
    // Pixel storage
    pixels: [],
    pixelMap: new Map(),

    // Mouse/touch state
    isMouseDown: false,
    isDragging: false,
    isTouchActive: false,

    // Mode flags
    isFillMode: false,

    // Symmetry state
    mirrorH: false,
    mirrorV: false,
    symmetryLineH: null,
    symmetryLineV: null,

    // History stacks
    undoStack: [],
    redoStack: [],

    // Zoom state
    currentZoom: 1,

    // Row highlight state
    highlightRowEnabled: false,
    highlightedRow: 1,

    // Timers
    touchTimeout: null,
    autoSaveTimeout: null,
};

// Helper to get pixel by coordinates
export const getPixelKey = (rowIndex, colIndex) => `${rowIndex},${colIndex}`;

export const getPixelByCoords = (rowIndex, colIndex) =>
    state.pixelMap.get(getPixelKey(rowIndex, colIndex));
