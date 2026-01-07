// Canvas Manager Module
// Orchestrates canvas operations and coordinates with other modules

import { state, getActiveConfig, getActiveDimensions } from './state.js';
import { clearCanvas, buildCanvas, applyDesignToCanvas, captureCanvasDesign } from './canvas.js';
import { setActiveConfig, setActiveSize, getConfigById } from './jumperConfigs.js';

// Module references (set during initialization)
let canvasElement = null;
let refreshMinimapCallback = null;
let clearHistoryCallback = null;
let updateSymmetryCallback = null;

/**
 * Initialize the canvas manager with required references
 * @param {Object} options - Initialization options
 * @param {HTMLElement} options.canvas - The canvas element
 * @param {Function} options.refreshMinimap - Callback to refresh minimap
 * @param {Function} options.clearHistory - Callback to clear undo/redo history
 * @param {Function} options.updateSymmetry - Callback to update symmetry lines
 */
export const initCanvasManager = (options) => {
    canvasElement = options.canvas;
    refreshMinimapCallback = options.refreshMinimap;
    clearHistoryCallback = options.clearHistory;
    updateSymmetryCallback = options.updateSymmetry;
};

/**
 * Switch to a different jumper configuration
 * @param {string} configId - The configuration ID to switch to
 * @param {string} size - The size to use (optional)
 * @param {Object} portedDesign - Pre-ported design data to apply (optional)
 * @returns {boolean} True if successful
 */
export const switchJumperConfig = (configId, size = null, portedDesign = null) => {
    if (!canvasElement) {
        console.error('Canvas manager not initialized');
        return false;
    }

    // Save current panel design before switching
    saveCurrentPanelDesign();

    // Update the active configuration
    if (!setActiveConfig(configId, size)) {
        return false;
    }

    // Rebuild the canvas with new dimensions
    rebuildCanvasWithConfig(portedDesign);

    return true;
};

/**
 * Switch to a different size within the current configuration
 * @param {string} size - The size to switch to
 * @param {Object} portedDesign - Pre-ported design data to apply (optional)
 * @returns {boolean} True if successful
 */
export const switchJumperSize = (size, portedDesign = null) => {
    if (!canvasElement) {
        console.error('Canvas manager not initialized');
        return false;
    }

    // Save current panel design before switching
    saveCurrentPanelDesign();

    // Update the active size
    if (!setActiveSize(size)) {
        return false;
    }

    // Rebuild the canvas with new dimensions
    rebuildCanvasWithConfig(portedDesign);

    return true;
};

/**
 * Rebuild the canvas with the current configuration
 * @param {Object} designData - Design data to apply after rebuild (optional)
 */
const rebuildCanvasWithConfig = (designData = null) => {
    // Clear and rebuild canvas
    clearCanvas(canvasElement);
    buildCanvas(canvasElement);

    // Apply design data if provided
    if (designData) {
        applyDesignToCanvas(designData);
    }

    // Notify dependent modules
    if (refreshMinimapCallback) {
        // Give the DOM time to update before refreshing minimap
        requestAnimationFrame(() => {
            refreshMinimapCallback();
        });
    }

    if (clearHistoryCallback) {
        clearHistoryCallback();
    }

    if (updateSymmetryCallback) {
        updateSymmetryCallback();
    }
};

/**
 * Save the current canvas design to the active panel in state
 */
export const saveCurrentPanelDesign = () => {
    const panel = state.jumperConfig.activePanel;
    state.design[panel] = captureCanvasDesign();
    state.design.metadata.modifiedAt = new Date().toISOString();
};

/**
 * Load a panel's design from state onto the canvas
 * @param {string} panel - 'front' or 'back'
 */
export const loadPanelDesign = (panel) => {
    const designData = state.design[panel] || {};

    // Clear all pixel colors first
    state.pixels.forEach(pixel => {
        pixel.style.backgroundColor = 'white';
        pixel.classList.remove('selected');
    });

    // Apply the panel's design
    applyDesignToCanvas(designData);
};

/**
 * Get information about the current canvas configuration
 * @returns {Object} Configuration info
 */
export const getCanvasInfo = () => {
    const config = getActiveConfig();
    const dimensions = getActiveDimensions();

    return {
        configId: state.jumperConfig.activeConfigId,
        configName: config?.name || 'Unknown',
        type: config?.type || 'unknown',
        size: state.jumperConfig.activeSize,
        panel: state.jumperConfig.activePanel,
        dimensions: {
            totalRows: dimensions.totalRows,
            maxColumns: dimensions.maxColumns,
            centerColumn: dimensions.centerColumn,
            centerRow: dimensions.centerRow
        }
    };
};

/**
 * Check if there is any design data in the current session
 * @returns {boolean} True if there is design data
 */
export const hasDesignData = () => {
    const frontCount = Object.keys(state.design.front).length;
    const backCount = Object.keys(state.design.back).length;
    return frontCount > 0 || backCount > 0;
};

/**
 * Check if the current panel has design data
 * @returns {boolean} True if current panel has design data
 */
export const currentPanelHasDesign = () => {
    const panel = state.jumperConfig.activePanel;
    return Object.keys(state.design[panel]).length > 0;
};

/**
 * Clear all design data for both panels
 */
export const clearAllDesigns = () => {
    state.design.front = {};
    state.design.back = {};
    state.design.metadata.modifiedAt = new Date().toISOString();

    // Clear the canvas display
    state.pixels.forEach(pixel => {
        pixel.style.backgroundColor = 'white';
        pixel.classList.remove('selected');
    });
};

/**
 * Get the source and target configuration info for porting
 * @param {string} targetConfigId - Target configuration ID
 * @param {string} targetSize - Target size
 * @returns {Object} { source, target } configuration details
 */
export const getPortingInfo = (targetConfigId, targetSize) => {
    const sourceConfig = getActiveConfig();
    const sourceDimensions = getActiveDimensions();

    const targetConfig = getConfigById(targetConfigId);
    if (!targetConfig) {
        return null;
    }

    const targetSizeConfig = targetConfig.sizes[targetSize];
    if (!targetSizeConfig) {
        return null;
    }

    return {
        source: {
            configId: state.jumperConfig.activeConfigId,
            configName: sourceConfig?.name || 'Unknown',
            size: state.jumperConfig.activeSize,
            totalRows: sourceDimensions.totalRows,
            maxColumns: sourceDimensions.maxColumns
        },
        target: {
            configId: targetConfigId,
            configName: targetConfig.name,
            size: targetSize,
            totalRows: targetSizeConfig.totalRows,
            maxColumns: targetSizeConfig.maxColumns
        }
    };
};
