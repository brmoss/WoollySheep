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

    // Jumper configuration state
    jumperConfig: {
        activeConfigId: 'raglan-standard',  // Currently selected jumper type
        activeSize: 'M',                     // XS, S, M, L, XL
        activePanel: 'front',                // 'front' or 'back'
        configs: new Map(),                  // Built-in jumper configurations
        customConfigs: new Map(),            // User-uploaded custom configurations
    },

    // Design state for front and back panels
    design: {
        front: {},   // { "row-col": "color" } format
        back: {},    // { "row-col": "color" } format
        metadata: {
            createdAt: null,
            modifiedAt: null,
        }
    },
};

// Helper to get pixel by coordinates
export const getPixelKey = (rowIndex, colIndex) => `${rowIndex},${colIndex}`;

export const getPixelByCoords = (rowIndex, colIndex) =>
    state.pixelMap.get(getPixelKey(rowIndex, colIndex));

// Jumper configuration helpers

/**
 * Get the currently active jumper configuration object
 * @returns {Object|null} The active configuration or null if not found
 */
export const getActiveConfig = () => {
    const { activeConfigId, configs, customConfigs } = state.jumperConfig;
    return configs.get(activeConfigId) || customConfigs.get(activeConfigId) || null;
};

/**
 * Get the rows configuration for the current jumper type and size
 * @returns {Array|null} The rowsConfig array or null if not found
 */
export const getActiveRowsConfig = () => {
    const config = getActiveConfig();
    if (!config) return null;
    const sizeConfig = config.sizes[state.jumperConfig.activeSize];
    return sizeConfig?.rowsConfig || null;
};

/**
 * Get the dimensions for the current jumper type and size
 * @returns {Object} Object with totalRows, maxColumns, centerColumn, centerRow
 */
export const getActiveDimensions = () => {
    const config = getActiveConfig();
    if (!config) {
        // Fallback to legacy defaults (original config.js values)
        return {
            totalRows: 138,
            maxColumns: 107,
            centerColumn: 54,
            centerRow: 69
        };
    }
    const sizeConfig = config.sizes[state.jumperConfig.activeSize];
    return {
        totalRows: sizeConfig.totalRows,
        maxColumns: sizeConfig.maxColumns,
        centerColumn: sizeConfig.centerColumn,
        centerRow: sizeConfig.centerRow
    };
};

/**
 * Get the design key format used for persistence
 * @param {number} rowIndex
 * @param {number} colIndex
 * @returns {string} Key in "row-col" format
 */
export const getDesignKey = (rowIndex, colIndex) => `${rowIndex}-${colIndex}`;

/**
 * Get the current panel's design data
 * @returns {Object} The design object for the active panel
 */
export const getActivePanelDesign = () => {
    return state.design[state.jumperConfig.activePanel] || {};
};
