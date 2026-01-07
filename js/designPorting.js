// Design Porting Module
// Handles porting designs between different jumper configurations and sizes

import { getConfigById } from './jumperConfigs.js';

/**
 * Available porting strategies
 */
export const PORTING_STRATEGIES = {
    SCALE: 'scale',
    CENTER_CLIP: 'center-clip',
    ANCHOR_TOP_LEFT: 'anchor-top-left',
    ANCHOR_CENTER: 'anchor-center',
    ANCHOR_BOTTOM_CENTER: 'anchor-bottom-center',
    DISCARD: 'discard'
};

/**
 * Human-readable names for porting strategies
 */
export const STRATEGY_NAMES = {
    [PORTING_STRATEGIES.SCALE]: 'Scale to Fit',
    [PORTING_STRATEGIES.CENTER_CLIP]: 'Center & Clip',
    [PORTING_STRATEGIES.ANCHOR_TOP_LEFT]: 'Anchor Top-Left',
    [PORTING_STRATEGIES.ANCHOR_CENTER]: 'Anchor Center',
    [PORTING_STRATEGIES.ANCHOR_BOTTOM_CENTER]: 'Anchor Bottom-Center',
    [PORTING_STRATEGIES.DISCARD]: 'Start Fresh'
};

/**
 * Descriptions for porting strategies
 */
export const STRATEGY_DESCRIPTIONS = {
    [PORTING_STRATEGIES.SCALE]: 'Stretch or shrink the design to fit the new dimensions',
    [PORTING_STRATEGIES.CENTER_CLIP]: 'Keep design centered, clip edges that don\'t fit',
    [PORTING_STRATEGIES.ANCHOR_TOP_LEFT]: 'Keep design anchored to top-left corner',
    [PORTING_STRATEGIES.ANCHOR_CENTER]: 'Keep design centered in both directions',
    [PORTING_STRATEGIES.ANCHOR_BOTTOM_CENTER]: 'Keep design anchored to bottom-center (hem)',
    [PORTING_STRATEGIES.DISCARD]: 'Discard current design and start with empty canvas'
};

/**
 * Get dimensions for a specific configuration and size
 * @param {string} configId - Configuration ID
 * @param {string} size - Size (XS, S, M, L, XL)
 * @returns {Object|null} Dimensions object or null
 */
const getConfigDimensions = (configId, size) => {
    const config = getConfigById(configId);
    if (!config || !config.sizes[size]) {
        return null;
    }

    const sizeConfig = config.sizes[size];
    return {
        totalRows: sizeConfig.totalRows,
        maxColumns: sizeConfig.maxColumns,
        rowsConfig: sizeConfig.rowsConfig
    };
};

/**
 * Check if a position is valid (within active area) for a given configuration
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {Object} dims - Dimensions object with totalRows, maxColumns, rowsConfig
 * @returns {boolean} True if position is valid
 */
const isValidPosition = (row, col, dims) => {
    if (row < 1 || row > dims.totalRows) return false;
    if (col < 1 || col > dims.maxColumns) return false;

    // Find the row configuration
    for (const rc of dims.rowsConfig) {
        if (row >= rc.start && row <= rc.end) {
            let padding = 0;
            if (rc.step) {
                const steps = row - rc.start;
                const columns = rc.startColumns + steps * rc.step;
                padding = (dims.maxColumns - columns) / 2;
            } else {
                padding = rc.padding || 0;
            }
            return col > padding && col <= dims.maxColumns - padding;
        }
    }

    return false;
};

/**
 * Port a design from one configuration to another
 * @param {Object} design - Source design { "row-col": "color" }
 * @param {string} sourceConfigId - Source configuration ID
 * @param {string} sourceSize - Source size
 * @param {string} targetConfigId - Target configuration ID
 * @param {string} targetSize - Target size
 * @param {string} strategy - Porting strategy
 * @returns {Object} Ported design
 */
export const portDesign = (design, sourceConfigId, sourceSize, targetConfigId, targetSize, strategy) => {
    if (!design || Object.keys(design).length === 0) {
        return {};
    }

    if (strategy === PORTING_STRATEGIES.DISCARD) {
        return {};
    }

    const sourceDims = getConfigDimensions(sourceConfigId, sourceSize);
    const targetDims = getConfigDimensions(targetConfigId, targetSize);

    if (!sourceDims || !targetDims) {
        console.error('Invalid configuration for porting');
        return {};
    }

    switch (strategy) {
        case PORTING_STRATEGIES.SCALE:
            return scaleDesign(design, sourceDims, targetDims);
        case PORTING_STRATEGIES.CENTER_CLIP:
            return centerClipDesign(design, sourceDims, targetDims);
        case PORTING_STRATEGIES.ANCHOR_TOP_LEFT:
            return anchorDesign(design, sourceDims, targetDims, 'top-left');
        case PORTING_STRATEGIES.ANCHOR_CENTER:
            return anchorDesign(design, sourceDims, targetDims, 'center');
        case PORTING_STRATEGIES.ANCHOR_BOTTOM_CENTER:
            return anchorDesign(design, sourceDims, targetDims, 'bottom-center');
        default:
            console.error('Unknown porting strategy:', strategy);
            return {};
    }
};

/**
 * Scale design to fit new dimensions
 */
const scaleDesign = (design, sourceDims, targetDims) => {
    const scaleX = targetDims.maxColumns / sourceDims.maxColumns;
    const scaleY = targetDims.totalRows / sourceDims.totalRows;
    const portedDesign = {};

    for (const [key, color] of Object.entries(design)) {
        const [row, col] = key.split('-').map(Number);

        // Scale the position
        const newRow = Math.round(row * scaleY);
        const newCol = Math.round(col * scaleX);

        // Check if valid in target
        if (isValidPosition(newRow, newCol, targetDims)) {
            const newKey = `${newRow}-${newCol}`;
            // Don't overwrite if already set (first pixel wins for overlaps)
            if (!portedDesign[newKey]) {
                portedDesign[newKey] = color;
            }
        }
    }

    return portedDesign;
};

/**
 * Center the design and clip edges that don't fit
 */
const centerClipDesign = (design, sourceDims, targetDims) => {
    const rowOffset = Math.floor((targetDims.totalRows - sourceDims.totalRows) / 2);
    const colOffset = Math.floor((targetDims.maxColumns - sourceDims.maxColumns) / 2);
    const portedDesign = {};

    for (const [key, color] of Object.entries(design)) {
        const [row, col] = key.split('-').map(Number);
        const newRow = row + rowOffset;
        const newCol = col + colOffset;

        if (isValidPosition(newRow, newCol, targetDims)) {
            portedDesign[`${newRow}-${newCol}`] = color;
        }
    }

    return portedDesign;
};

/**
 * Anchor design to a specific position
 */
const anchorDesign = (design, sourceDims, targetDims, anchor) => {
    let rowOffset = 0;
    let colOffset = 0;

    switch (anchor) {
        case 'top-left':
            // Anchor to top-left (row numbers go from bottom to top, so "top" means high row numbers)
            rowOffset = targetDims.totalRows - sourceDims.totalRows;
            colOffset = 0;
            break;
        case 'center':
            rowOffset = Math.floor((targetDims.totalRows - sourceDims.totalRows) / 2);
            colOffset = Math.floor((targetDims.maxColumns - sourceDims.maxColumns) / 2);
            break;
        case 'bottom-center':
            // Bottom means low row numbers (row 1 is at the bottom/hem)
            rowOffset = 0;
            colOffset = Math.floor((targetDims.maxColumns - sourceDims.maxColumns) / 2);
            break;
    }

    const portedDesign = {};
    for (const [key, color] of Object.entries(design)) {
        const [row, col] = key.split('-').map(Number);
        const newRow = row + rowOffset;
        const newCol = col + colOffset;

        if (isValidPosition(newRow, newCol, targetDims)) {
            portedDesign[`${newRow}-${newCol}`] = color;
        }
    }

    return portedDesign;
};

/**
 * Port both front and back designs
 * @param {Object} frontDesign - Front panel design
 * @param {Object} backDesign - Back panel design
 * @param {string} sourceConfigId - Source configuration ID
 * @param {string} sourceSize - Source size
 * @param {string} targetConfigId - Target configuration ID
 * @param {string} targetSize - Target size
 * @param {string} strategy - Porting strategy
 * @returns {Object} { front, back } ported designs
 */
export const portBothPanels = (frontDesign, backDesign, sourceConfigId, sourceSize, targetConfigId, targetSize, strategy) => {
    return {
        front: portDesign(frontDesign, sourceConfigId, sourceSize, targetConfigId, targetSize, strategy),
        back: portDesign(backDesign, sourceConfigId, sourceSize, targetConfigId, targetSize, strategy)
    };
};

/**
 * Preview the result of porting (returns statistics)
 * @param {Object} design - Source design
 * @param {string} sourceConfigId - Source configuration ID
 * @param {string} sourceSize - Source size
 * @param {string} targetConfigId - Target configuration ID
 * @param {string} targetSize - Target size
 * @param {string} strategy - Porting strategy
 * @returns {Object} { originalCount, portedCount, lostCount }
 */
export const previewPorting = (design, sourceConfigId, sourceSize, targetConfigId, targetSize, strategy) => {
    const originalCount = Object.keys(design || {}).length;

    if (strategy === PORTING_STRATEGIES.DISCARD) {
        return {
            originalCount,
            portedCount: 0,
            lostCount: originalCount
        };
    }

    const ported = portDesign(design, sourceConfigId, sourceSize, targetConfigId, targetSize, strategy);
    const portedCount = Object.keys(ported).length;

    return {
        originalCount,
        portedCount,
        lostCount: originalCount - portedCount
    };
};
