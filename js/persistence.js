import { STORAGE_KEY, AUTOSAVE_KEY } from './config.js';
import { state, getActiveConfig } from './state.js';
import { clearHistory } from './history.js';
import { captureCanvasDesign, applyDesignToCanvas } from './canvas.js';
import { saveCurrentPanelToState, loadPanelToCanvas } from './panelManager.js';

// Save format version
const SAVE_FORMAT_VERSION = 2;

let autoSaveIndicator = null;
let refreshMinimapCallback = null;

export const initPersistence = (options = {}) => {
    refreshMinimapCallback = options.refreshMinimap;

    autoSaveIndicator = document.createElement('div');
    autoSaveIndicator.id = 'autoSaveIndicator';
    autoSaveIndicator.innerHTML = '<i class="fas fa-check"></i> Auto-saved';
    document.body.appendChild(autoSaveIndicator);
};

/**
 * Get pattern data from the current canvas (legacy format for backward compatibility)
 */
export const getPatternData = () => {
    const patternData = {};
    state.pixels.forEach(pixel => {
        const color = pixel.style.backgroundColor;
        if (color && color !== 'white' && color !== 'rgb(255, 255, 255)' && color !== '') {
            const key = `${pixel.dataset.rowIndex}-${pixel.dataset.colIndex}`;
            patternData[key] = color;
        }
    });
    return patternData;
};

/**
 * Create v2 save data with both panels and config info
 */
export const createSaveData = () => {
    // Ensure current panel is saved to state
    saveCurrentPanelToState();

    const config = getActiveConfig();

    return {
        version: SAVE_FORMAT_VERSION,
        savedAt: new Date().toISOString(),

        // Jumper configuration
        jumperConfig: {
            configId: state.jumperConfig.activeConfigId,
            size: state.jumperConfig.activeSize,
        },

        // Design data for both panels
        design: {
            front: { ...state.design.front },
            back: { ...state.design.back },
        },

        // Metadata
        metadata: {
            totalPixels: {
                front: Object.keys(state.design.front).length,
                back: Object.keys(state.design.back).length,
            },
            jumperType: config?.type || 'unknown',
            jumperName: config?.name || 'Unknown',
        },

        // Legacy compatibility - include flattened front panel data
        legacyData: {
            data: { ...state.design.front },
            pixelCount: Object.keys(state.design.front).length,
        }
    };
};

/**
 * Migrate v1 save data to v2 format
 */
const migrateV1ToV2 = (v1Data) => {
    return {
        version: SAVE_FORMAT_VERSION,
        savedAt: v1Data.savedAt || new Date().toISOString(),
        jumperConfig: {
            configId: 'raglan-standard',  // Original default config
            size: 'M',                     // Assume medium as default
        },
        design: {
            front: v1Data.data || {},
            back: {},                      // No back data in v1
        },
        metadata: {
            totalPixels: {
                front: v1Data.pixelCount || Object.keys(v1Data.data || {}).length,
                back: 0,
            },
            jumperType: 'raglan',
            jumperName: 'Legacy Pattern',
        }
    };
};

/**
 * Apply pattern data to the canvas (legacy format)
 */
export const applyPatternData = (patternData) => {
    state.pixels.forEach(pixel => {
        pixel.style.backgroundColor = 'white';
        pixel.classList.remove('selected');
    });

    for (const [key, color] of Object.entries(patternData)) {
        const [rowIndex, colIndex] = key.split('-');
        const pixel = state.pixels.find(p =>
            p.dataset.rowIndex === rowIndex && p.dataset.colIndex === colIndex
        );
        if (pixel) {
            pixel.style.backgroundColor = color;
        }
    }
    clearHistory();
};

/**
 * Apply v2 save data
 */
const applySaveData = (saveData) => {
    // Update design state
    state.design.front = saveData.design.front || {};
    state.design.back = saveData.design.back || {};

    // Load the current panel to canvas
    loadPanelToCanvas(state.jumperConfig.activePanel);

    clearHistory();

    if (refreshMinimapCallback) {
        refreshMinimapCallback();
    }
};

export const getSavedPatterns = () => {
    try {
        const patterns = localStorage.getItem(STORAGE_KEY);
        return patterns ? JSON.parse(patterns) : {};
    } catch (e) {
        console.error('Error reading patterns from localStorage:', e);
        return {};
    }
};

/**
 * Save pattern with v2 format
 */
export const savePattern = (name) => {
    const patterns = getSavedPatterns();
    const saveData = createSaveData();

    // Store with pattern name as key
    patterns[name] = saveData;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns));
        return true;
    } catch (e) {
        console.error('Error saving pattern:', e);
        return false;
    }
};

/**
 * Load pattern by name with version detection
 */
export const loadPatternByName = (name) => {
    const patterns = getSavedPatterns();
    const patternData = patterns[name];

    if (!patternData) {
        return false;
    }

    // Detect version and migrate if needed
    if (!patternData.version || patternData.version === 1) {
        // V1 format - migrate and apply
        const migratedData = migrateV1ToV2(patternData);
        applySaveData(migratedData);
    } else {
        // V2 format - apply directly
        applySaveData(patternData);
    }

    return true;
};

/**
 * Get info about a saved pattern (for display in load list)
 */
export const getPatternInfo = (name) => {
    const patterns = getSavedPatterns();
    const patternData = patterns[name];

    if (!patternData) {
        return null;
    }

    // V1 format
    if (!patternData.version || patternData.version === 1) {
        return {
            name,
            savedAt: patternData.savedAt,
            pixelCount: patternData.pixelCount || Object.keys(patternData.data || {}).length,
            version: 1,
            jumperType: 'Legacy',
            size: 'Unknown',
            hasFront: true,
            hasBack: false,
        };
    }

    // V2 format
    return {
        name,
        savedAt: patternData.savedAt,
        pixelCount: (patternData.metadata?.totalPixels?.front || 0) +
                    (patternData.metadata?.totalPixels?.back || 0),
        frontPixelCount: patternData.metadata?.totalPixels?.front || 0,
        backPixelCount: patternData.metadata?.totalPixels?.back || 0,
        version: patternData.version,
        jumperType: patternData.metadata?.jumperName || 'Unknown',
        size: patternData.jumperConfig?.size || 'Unknown',
        hasFront: Object.keys(patternData.design?.front || {}).length > 0,
        hasBack: Object.keys(patternData.design?.back || {}).length > 0,
    };
};

export const deletePattern = (name) => {
    const patterns = getSavedPatterns();
    if (patterns[name]) {
        delete patterns[name];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns));
        return true;
    }
    return false;
};

const showAutoSaveIndicator = () => {
    if (autoSaveIndicator) {
        autoSaveIndicator.classList.add('show');
        setTimeout(() => {
            autoSaveIndicator.classList.remove('show');
        }, 2000);
    }
};

/**
 * Auto-save with v2 format
 */
export const autoSave = () => {
    // Save current panel to state first
    saveCurrentPanelToState();

    const saveData = createSaveData();

    try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(saveData));
        showAutoSaveIndicator();
    } catch (e) {
        console.error('Auto-save failed:', e);
    }
};

export const triggerAutoSave = () => {
    clearTimeout(state.autoSaveTimeout);
    state.autoSaveTimeout = setTimeout(autoSave, 2000);
};

/**
 * Load auto-save with version detection
 */
export const loadAutoSave = () => {
    try {
        const autoSaved = localStorage.getItem(AUTOSAVE_KEY);
        if (autoSaved) {
            const parsed = JSON.parse(autoSaved);

            // V1 format
            if (!parsed.version && parsed.data) {
                if (Object.keys(parsed.data).length > 0) {
                    applyPatternData(parsed.data);
                }
                return;
            }

            // V2 format
            if (parsed.version >= 2) {
                const hasData =
                    Object.keys(parsed.design?.front || {}).length > 0 ||
                    Object.keys(parsed.design?.back || {}).length > 0;

                if (hasData) {
                    applySaveData(parsed);
                }
            }
        }
    } catch (e) {
        console.error('Error loading auto-save:', e);
    }
};
