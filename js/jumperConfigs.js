// Jumper Configuration Management Module
import { state } from './state.js';

// Built-in configuration file names
const BUILT_IN_CONFIGS = [
    'raglan-standard',
    'drop-shoulder-standard',
    'set-in-sleeve-standard',
    'circular-yoke-standard'
];

// Storage key for custom configurations
const CUSTOM_CONFIGS_STORAGE_KEY = 'woollySheepCustomJumperConfigs';

/**
 * Initialize jumper configurations - load built-in and custom configs
 * @returns {Promise<void>}
 */
export const initJumperConfigs = async () => {
    // Load built-in configurations
    await loadBuiltInConfigs();

    // Load custom configurations from localStorage
    loadCustomConfigsFromStorage();

    // Ensure we have a valid active configuration
    if (!state.jumperConfig.configs.has(state.jumperConfig.activeConfigId) &&
        !state.jumperConfig.customConfigs.has(state.jumperConfig.activeConfigId)) {
        // Fallback to first available config
        const firstConfig = state.jumperConfig.configs.keys().next().value;
        if (firstConfig) {
            state.jumperConfig.activeConfigId = firstConfig;
        }
    }
};

/**
 * Load all built-in configuration files
 * @returns {Promise<void>}
 */
const loadBuiltInConfigs = async () => {
    const loadPromises = BUILT_IN_CONFIGS.map(async (configId) => {
        try {
            const response = await fetch(`./jumperConfigs/${configId}.json`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const config = await response.json();

            // Validate the configuration
            const validation = validateJumperConfig(config);
            if (!validation.valid) {
                console.warn(`Config ${configId} validation warnings:`, validation.errors);
            }

            state.jumperConfig.configs.set(configId, config);
        } catch (err) {
            console.error(`Failed to load built-in config ${configId}:`, err);
        }
    });

    await Promise.all(loadPromises);
};

/**
 * Validate a jumper configuration object
 * @param {Object} config - The configuration to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export const validateJumperConfig = (config) => {
    const errors = [];

    // Required top-level fields
    if (!config.id) errors.push('Missing id');
    if (!config.name) errors.push('Missing name');
    if (!config.type) errors.push('Missing type');
    if (!config.sizes) errors.push('Missing sizes');

    // Validate each size configuration
    if (config.sizes) {
        const validSizes = ['XS', 'S', 'M', 'L', 'XL'];
        for (const [size, sizeConfig] of Object.entries(config.sizes)) {
            if (!validSizes.includes(size)) {
                errors.push(`Invalid size key: ${size}`);
                continue;
            }

            if (!sizeConfig.totalRows) errors.push(`Size ${size}: missing totalRows`);
            if (!sizeConfig.maxColumns) errors.push(`Size ${size}: missing maxColumns`);
            if (!sizeConfig.rowsConfig) errors.push(`Size ${size}: missing rowsConfig`);

            // Validate rowsConfig covers all rows
            if (sizeConfig.rowsConfig && sizeConfig.totalRows) {
                const coveredRows = new Set();
                for (const rc of sizeConfig.rowsConfig) {
                    if (typeof rc.start !== 'number' || typeof rc.end !== 'number') {
                        errors.push(`Size ${size}: rowsConfig entry missing start/end`);
                        continue;
                    }
                    for (let r = rc.start; r <= rc.end; r++) {
                        coveredRows.add(r);
                    }
                }
                for (let r = 1; r <= sizeConfig.totalRows; r++) {
                    if (!coveredRows.has(r)) {
                        errors.push(`Size ${size}: row ${r} not covered by rowsConfig`);
                        break; // Only report first missing row
                    }
                }
            }
        }
    }

    return { valid: errors.length === 0, errors };
};

/**
 * Load a custom configuration from a JSON object
 * @param {Object} config - The configuration object
 * @returns {string} The config ID (with 'custom-' prefix if needed)
 */
export const loadCustomConfig = (config) => {
    // Ensure custom prefix to avoid conflicts with built-in configs
    if (!config.id.startsWith('custom-')) {
        config.id = `custom-${config.id}`;
    }

    state.jumperConfig.customConfigs.set(config.id, config);
    saveCustomConfigsToStorage();

    return config.id;
};

/**
 * Delete a custom configuration
 * @param {string} configId - The config ID to delete
 * @returns {boolean} True if deleted, false if not found or is built-in
 */
export const deleteCustomConfig = (configId) => {
    if (!configId.startsWith('custom-')) {
        console.warn('Cannot delete built-in configuration');
        return false;
    }

    const deleted = state.jumperConfig.customConfigs.delete(configId);
    if (deleted) {
        saveCustomConfigsToStorage();
    }
    return deleted;
};

/**
 * Save custom configurations to localStorage
 */
const saveCustomConfigsToStorage = () => {
    try {
        const configs = Object.fromEntries(state.jumperConfig.customConfigs);
        localStorage.setItem(CUSTOM_CONFIGS_STORAGE_KEY, JSON.stringify(configs));
    } catch (err) {
        console.error('Failed to save custom configs:', err);
    }
};

/**
 * Load custom configurations from localStorage
 */
const loadCustomConfigsFromStorage = () => {
    try {
        const stored = localStorage.getItem(CUSTOM_CONFIGS_STORAGE_KEY);
        if (stored) {
            const configs = JSON.parse(stored);
            for (const [id, config] of Object.entries(configs)) {
                state.jumperConfig.customConfigs.set(id, config);
            }
        }
    } catch (err) {
        console.error('Failed to load custom configs from storage:', err);
    }
};

/**
 * Get a list of all available configurations
 * @returns {Array} Array of { id, name, type, isCustom } objects
 */
export const getAvailableConfigs = () => {
    const configs = [];

    // Add built-in configs
    for (const [id, config] of state.jumperConfig.configs) {
        configs.push({
            id,
            name: config.name,
            type: config.type,
            isCustom: false
        });
    }

    // Add custom configs
    for (const [id, config] of state.jumperConfig.customConfigs) {
        configs.push({
            id,
            name: config.name,
            type: config.type,
            isCustom: true
        });
    }

    return configs;
};

/**
 * Get available sizes for a specific configuration
 * @param {string} configId - The configuration ID
 * @returns {Array} Array of size strings (e.g., ['XS', 'S', 'M', 'L', 'XL'])
 */
export const getAvailableSizes = (configId) => {
    const config = state.jumperConfig.configs.get(configId) ||
                   state.jumperConfig.customConfigs.get(configId);

    if (!config || !config.sizes) {
        return ['XS', 'S', 'M', 'L', 'XL']; // Default sizes
    }

    return Object.keys(config.sizes);
};

/**
 * Get a specific configuration by ID
 * @param {string} configId - The configuration ID
 * @returns {Object|null} The configuration object or null
 */
export const getConfigById = (configId) => {
    return state.jumperConfig.configs.get(configId) ||
           state.jumperConfig.customConfigs.get(configId) ||
           null;
};

/**
 * Set the active jumper configuration
 * @param {string} configId - The configuration ID to activate
 * @param {string} size - The size to activate (optional, defaults to current)
 * @returns {boolean} True if successful
 */
export const setActiveConfig = (configId, size = null) => {
    const config = getConfigById(configId);
    if (!config) {
        console.error(`Configuration ${configId} not found`);
        return false;
    }

    state.jumperConfig.activeConfigId = configId;

    // Update size if provided and valid
    if (size && config.sizes[size]) {
        state.jumperConfig.activeSize = size;
    } else if (!config.sizes[state.jumperConfig.activeSize]) {
        // Current size not available in new config, use first available
        const firstSize = Object.keys(config.sizes)[0];
        state.jumperConfig.activeSize = firstSize;
    }

    return true;
};

/**
 * Set the active size
 * @param {string} size - The size to activate
 * @returns {boolean} True if successful
 */
export const setActiveSize = (size) => {
    const config = getConfigById(state.jumperConfig.activeConfigId);
    if (!config || !config.sizes[size]) {
        console.error(`Size ${size} not available for current configuration`);
        return false;
    }

    state.jumperConfig.activeSize = size;
    return true;
};
