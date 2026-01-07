// Panel Manager Module
// Handles front/back panel switching and design synchronization

import { state, getActiveDimensions } from './state.js';
import { captureCanvasDesign, applyDesignToCanvas } from './canvas.js';

// Module references
let refreshMinimapCallback = null;
let clearHistoryCallback = null;
let updatePanelUICallback = null;

/**
 * Initialize the panel manager with required callbacks
 * @param {Object} options - Initialization options
 * @param {Function} options.refreshMinimap - Callback to refresh minimap
 * @param {Function} options.clearHistory - Callback to clear undo/redo history
 * @param {Function} options.updatePanelUI - Callback to update panel toggle UI
 */
export const initPanelManager = (options = {}) => {
    refreshMinimapCallback = options.refreshMinimap;
    clearHistoryCallback = options.clearHistory;
    updatePanelUICallback = options.updatePanelUI;
};

/**
 * Get the currently active panel
 * @returns {string} 'front' or 'back'
 */
export const getActivePanel = () => {
    return state.jumperConfig.activePanel;
};

/**
 * Save the current canvas state to the active panel in state.design
 */
export const saveCurrentPanelToState = () => {
    const panel = state.jumperConfig.activePanel;
    state.design[panel] = captureCanvasDesign();
    state.design.metadata.modifiedAt = new Date().toISOString();
};

/**
 * Load a panel's design from state.design onto the canvas
 * @param {string} panel - 'front' or 'back'
 */
export const loadPanelToCanvas = (panel) => {
    const panelDesign = state.design[panel] || {};

    // Clear all pixels first
    state.pixels.forEach(pixel => {
        pixel.style.backgroundColor = 'white';
        pixel.classList.remove('selected');
    });

    // Apply panel design
    applyDesignToCanvas(panelDesign);
};

/**
 * Switch between front and back panels
 * @param {string} targetPanel - 'front' or 'back'
 * @returns {boolean} True if panel was switched
 */
export const switchPanel = (targetPanel) => {
    if (targetPanel !== 'front' && targetPanel !== 'back') {
        console.error('Invalid panel:', targetPanel);
        return false;
    }

    if (targetPanel === state.jumperConfig.activePanel) {
        return false; // Already on this panel
    }

    // Save current panel design
    saveCurrentPanelToState();

    // Switch active panel
    state.jumperConfig.activePanel = targetPanel;

    // Load target panel design
    loadPanelToCanvas(targetPanel);

    // Clear history for new panel context
    if (clearHistoryCallback) {
        clearHistoryCallback();
    }

    // Update UI
    if (updatePanelUICallback) {
        updatePanelUICallback(targetPanel);
    }

    // Refresh minimap
    if (refreshMinimapCallback) {
        refreshMinimapCallback();
    }

    return true;
};

/**
 * Toggle between front and back panels
 * @returns {string} The new active panel
 */
export const togglePanel = () => {
    const newPanel = state.jumperConfig.activePanel === 'front' ? 'back' : 'front';
    switchPanel(newPanel);
    return newPanel;
};

/**
 * Copy design from one panel to another
 * @param {string} sourcePanel - Source panel ('front' or 'back')
 * @param {string} targetPanel - Target panel ('front' or 'back')
 * @param {string} mode - Copy mode: 'copy' or 'mirror'
 */
export const copyPanelDesign = (sourcePanel, targetPanel, mode = 'copy') => {
    // Save current panel first if it's the source
    if (sourcePanel === state.jumperConfig.activePanel) {
        saveCurrentPanelToState();
    }

    const sourceDesign = state.design[sourcePanel] || {};

    if (mode === 'copy') {
        // Direct copy
        state.design[targetPanel] = { ...sourceDesign };
    } else if (mode === 'mirror') {
        // Horizontal mirror (flip left-right)
        const { maxColumns } = getActiveDimensions();
        const mirroredDesign = {};

        for (const [key, color] of Object.entries(sourceDesign)) {
            const [row, col] = key.split('-').map(Number);
            const mirroredCol = maxColumns - col + 1;
            mirroredDesign[`${row}-${mirroredCol}`] = color;
        }

        state.design[targetPanel] = mirroredDesign;
    }

    state.design.metadata.modifiedAt = new Date().toISOString();

    // If we're currently viewing the target panel, refresh the canvas
    if (targetPanel === state.jumperConfig.activePanel) {
        loadPanelToCanvas(targetPanel);
        if (refreshMinimapCallback) {
            refreshMinimapCallback();
        }
    }
};

/**
 * Copy current panel's design to the other panel
 * @param {string} mode - Copy mode: 'copy' or 'mirror'
 */
export const copyToOtherPanel = (mode = 'copy') => {
    const currentPanel = state.jumperConfig.activePanel;
    const otherPanel = currentPanel === 'front' ? 'back' : 'front';
    copyPanelDesign(currentPanel, otherPanel, mode);
};

/**
 * Check if a panel has any design data
 * @param {string} panel - 'front' or 'back'
 * @returns {boolean} True if panel has design data
 */
export const panelHasDesign = (panel) => {
    return Object.keys(state.design[panel] || {}).length > 0;
};

/**
 * Get design statistics for both panels
 * @returns {Object} { front: { pixelCount }, back: { pixelCount } }
 */
export const getDesignStats = () => {
    // Ensure current panel is saved
    saveCurrentPanelToState();

    return {
        front: {
            pixelCount: Object.keys(state.design.front || {}).length
        },
        back: {
            pixelCount: Object.keys(state.design.back || {}).length
        }
    };
};

/**
 * Clear design for a specific panel
 * @param {string} panel - 'front' or 'back'
 */
export const clearPanelDesign = (panel) => {
    state.design[panel] = {};
    state.design.metadata.modifiedAt = new Date().toISOString();

    // If clearing the current panel, also clear the canvas
    if (panel === state.jumperConfig.activePanel) {
        state.pixels.forEach(pixel => {
            pixel.style.backgroundColor = 'white';
            pixel.classList.remove('selected');
        });

        if (refreshMinimapCallback) {
            refreshMinimapCallback();
        }
    }
};

/**
 * Clear designs for both panels
 */
export const clearAllPanelDesigns = () => {
    state.design.front = {};
    state.design.back = {};
    state.design.metadata.modifiedAt = new Date().toISOString();

    // Clear current canvas
    state.pixels.forEach(pixel => {
        pixel.style.backgroundColor = 'white';
        pixel.classList.remove('selected');
    });

    if (refreshMinimapCallback) {
        refreshMinimapCallback();
    }
};
