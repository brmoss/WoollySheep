// Sidebar Module
// UI for jumper type, size, and panel selection

import { state, getActiveConfig, getActiveDimensions } from './state.js';
import { getAvailableConfigs, getAvailableSizes, validateJumperConfig, loadCustomConfig } from './jumperConfigs.js';
import { switchPanel, copyToOtherPanel, getDesignStats } from './panelManager.js';
import { switchJumperConfig, switchJumperSize, hasDesignData, getPortingInfo, saveCurrentPanelDesign } from './canvasManager.js';
import { portBothPanels } from './designPorting.js';
import { showPortingModal, initPortingModal, injectPortingModalStyles } from './portingModal.js';

// Module references
let sidebarElement = null;
let sidebarToggleBtn = null;
let jumperTypeSelect = null;
let sizeButtonsContainer = null;
let panelFrontBtn = null;
let panelBackBtn = null;
let copyPanelBtn = null;
let uploadConfigBtn = null;
let configFileInput = null;
let dimensionsDisplay = null;

let refreshMinimapCallback = null;

/**
 * Initialize the sidebar
 * @param {Object} options - Initialization options
 * @param {Function} options.refreshMinimap - Callback to refresh minimap
 */
export const initSidebar = (options = {}) => {
    refreshMinimapCallback = options.refreshMinimap;

    // Get DOM elements
    sidebarElement = document.getElementById('jumper-sidebar');
    sidebarToggleBtn = document.getElementById('sidebarToggle');
    jumperTypeSelect = document.getElementById('jumperTypeSelect');
    sizeButtonsContainer = document.querySelector('.size-buttons');
    panelFrontBtn = document.getElementById('panelFrontBtn');
    panelBackBtn = document.getElementById('panelBackBtn');
    copyPanelBtn = document.getElementById('copyPanelBtn');
    uploadConfigBtn = document.getElementById('uploadConfigBtn');
    configFileInput = document.getElementById('configFileInput');
    dimensionsDisplay = {
        rows: document.getElementById('currentRows'),
        columns: document.getElementById('currentColumns')
    };

    if (!sidebarElement) {
        console.warn('Sidebar element not found');
        return;
    }

    // Initialize porting modal
    initPortingModal();
    injectPortingModalStyles();

    // Start with sidebar collapsed by default
    sidebarElement.classList.add('collapsed');

    // Set up event listeners
    setupEventListeners();

    // Populate initial data
    populateJumperTypes();
    populateSizes();
    updateSidebarUI();
};

/**
 * Set up all event listeners
 */
const setupEventListeners = () => {
    // Sidebar toggle
    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', toggleSidebar);
    }

    // Jumper type change
    if (jumperTypeSelect) {
        jumperTypeSelect.addEventListener('change', handleJumperTypeChange);
    }

    // Size buttons
    if (sizeButtonsContainer) {
        sizeButtonsContainer.addEventListener('click', handleSizeChange);
    }

    // Panel toggle
    if (panelFrontBtn) {
        panelFrontBtn.addEventListener('click', () => handlePanelChange('front'));
    }
    if (panelBackBtn) {
        panelBackBtn.addEventListener('click', () => handlePanelChange('back'));
    }

    // Copy panel
    if (copyPanelBtn) {
        copyPanelBtn.addEventListener('click', handleCopyPanel);
    }

    // Custom config upload
    if (uploadConfigBtn && configFileInput) {
        uploadConfigBtn.addEventListener('click', () => configFileInput.click());
        configFileInput.addEventListener('change', handleConfigUpload);
    }

    // Keyboard shortcut for sidebar toggle
    document.addEventListener('keydown', (e) => {
        if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            toggleSidebar();
        }
    });
};

/**
 * Toggle sidebar visibility
 */
export const toggleSidebar = () => {
    if (sidebarElement) {
        sidebarElement.classList.toggle('collapsed');
        document.body.classList.toggle('sidebar-open');

        // Update toggle button icon
        const icon = sidebarToggleBtn?.querySelector('i');
        if (icon) {
            if (sidebarElement.classList.contains('collapsed')) {
                icon.classList.remove('fa-chevron-left');
                icon.classList.add('fa-chevron-right');
            } else {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-left');
            }
        }
    }
};

/**
 * Populate jumper type dropdown
 */
const populateJumperTypes = () => {
    if (!jumperTypeSelect) return;

    const configs = getAvailableConfigs();
    jumperTypeSelect.innerHTML = '';

    configs.forEach(config => {
        const option = document.createElement('option');
        option.value = config.id;
        option.textContent = config.name + (config.isCustom ? ' (Custom)' : '');
        option.selected = config.id === state.jumperConfig.activeConfigId;
        jumperTypeSelect.appendChild(option);
    });
};

/**
 * Populate size buttons
 */
const populateSizes = () => {
    if (!sizeButtonsContainer) return;

    const sizes = getAvailableSizes(state.jumperConfig.activeConfigId);
    sizeButtonsContainer.innerHTML = '';

    const sizeLabels = {
        'XS': 'XS (32")',
        'S': 'S (34")',
        'M': 'M (36")',
        'L': 'L (38")',
        'XL': 'XL (40")'
    };

    sizes.forEach(size => {
        const button = document.createElement('button');
        button.dataset.size = size;
        button.textContent = sizeLabels[size] || size;
        button.className = size === state.jumperConfig.activeSize ? 'active' : '';
        sizeButtonsContainer.appendChild(button);
    });
};

/**
 * Handle jumper type change
 */
const handleJumperTypeChange = async (e) => {
    const newConfigId = e.target.value;

    if (newConfigId === state.jumperConfig.activeConfigId) {
        return;
    }

    // Check if we need to port design
    if (hasDesignData()) {
        const portingInfo = getPortingInfo(newConfigId, state.jumperConfig.activeSize);

        if (portingInfo) {
            showPortingModal({
                sourceConfig: portingInfo.source,
                targetConfig: portingInfo.target,
                onConfirm: (strategy) => {
                    applyConfigChange(newConfigId, state.jumperConfig.activeSize, strategy);
                },
                onCancel: () => {
                    // Revert select to previous value
                    jumperTypeSelect.value = state.jumperConfig.activeConfigId;
                }
            });
            return;
        }
    }

    // No design data, just switch
    applyConfigChange(newConfigId, state.jumperConfig.activeSize, null);
};

/**
 * Handle size change
 */
const handleSizeChange = async (e) => {
    const button = e.target.closest('[data-size]');
    if (!button) return;

    const newSize = button.dataset.size;

    if (newSize === state.jumperConfig.activeSize) {
        return;
    }

    // Check if we need to port design
    if (hasDesignData()) {
        const portingInfo = getPortingInfo(state.jumperConfig.activeConfigId, newSize);

        if (portingInfo) {
            showPortingModal({
                sourceConfig: portingInfo.source,
                targetConfig: portingInfo.target,
                onConfirm: (strategy) => {
                    applyConfigChange(state.jumperConfig.activeConfigId, newSize, strategy);
                },
                onCancel: () => {
                    // Nothing to revert for buttons
                }
            });
            return;
        }
    }

    // No design data, just switch
    applyConfigChange(state.jumperConfig.activeConfigId, newSize, null);
};

/**
 * Apply configuration/size change with optional porting
 */
const applyConfigChange = (configId, size, portingStrategy) => {
    // Save current panel first
    saveCurrentPanelDesign();

    let portedDesign = null;

    if (portingStrategy && portingStrategy !== 'discard') {
        // Port the designs
        const ported = portBothPanels(
            state.design.front,
            state.design.back,
            state.jumperConfig.activeConfigId,
            state.jumperConfig.activeSize,
            configId,
            size,
            portingStrategy
        );
        state.design.front = ported.front;
        state.design.back = ported.back;
        portedDesign = state.design[state.jumperConfig.activePanel];
    } else if (portingStrategy === 'discard') {
        state.design.front = {};
        state.design.back = {};
    }

    // Switch configuration
    if (configId !== state.jumperConfig.activeConfigId) {
        switchJumperConfig(configId, size, portedDesign);
    } else {
        switchJumperSize(size, portedDesign);
    }

    // Update UI
    populateSizes();
    updateSidebarUI();
};

/**
 * Handle panel change
 */
const handlePanelChange = (panel) => {
    if (panel === state.jumperConfig.activePanel) {
        return;
    }

    switchPanel(panel);
    updatePanelButtons();
};

/**
 * Handle copy to other panel
 */
const handleCopyPanel = () => {
    const currentPanel = state.jumperConfig.activePanel;
    const otherPanel = currentPanel === 'front' ? 'back' : 'front';

    // Show confirmation if other panel has data
    const stats = getDesignStats();
    const otherPanelCount = stats[otherPanel].pixelCount;

    if (otherPanelCount > 0) {
        if (!confirm(`The ${otherPanel} panel has ${otherPanelCount} colored pixels. Replace with current design?`)) {
            return;
        }
    }

    copyToOtherPanel('copy');

    // Show feedback
    showTemporaryMessage(`Design copied to ${otherPanel} panel`);
};

/**
 * Handle custom config upload
 */
const handleConfigUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const config = JSON.parse(text);

        const validation = validateJumperConfig(config);
        if (!validation.valid) {
            alert(`Invalid configuration:\n${validation.errors.join('\n')}`);
            return;
        }

        const configId = loadCustomConfig(config);
        populateJumperTypes();

        // Optionally switch to the new config
        if (confirm(`Configuration "${config.name}" loaded. Switch to it now?`)) {
            jumperTypeSelect.value = configId;
            handleJumperTypeChange({ target: { value: configId } });
        }

    } catch (err) {
        alert(`Error loading configuration: ${err.message}`);
    }

    // Reset file input
    configFileInput.value = '';
};

/**
 * Update all sidebar UI elements
 */
export const updateSidebarUI = () => {
    updateDimensionsDisplay();
    updatePanelButtons();
    updateDesignStats();

    // Update jumper type select
    if (jumperTypeSelect) {
        jumperTypeSelect.value = state.jumperConfig.activeConfigId;
    }

    // Update size buttons
    if (sizeButtonsContainer) {
        sizeButtonsContainer.querySelectorAll('button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.size === state.jumperConfig.activeSize);
        });
    }
};

/**
 * Update dimensions display
 */
const updateDimensionsDisplay = () => {
    const dims = getActiveDimensions();

    if (dimensionsDisplay.rows) {
        dimensionsDisplay.rows.textContent = dims.totalRows;
    }
    if (dimensionsDisplay.columns) {
        dimensionsDisplay.columns.textContent = dims.maxColumns;
    }
};

/**
 * Update panel toggle buttons
 */
const updatePanelButtons = () => {
    const activePanel = state.jumperConfig.activePanel;

    if (panelFrontBtn) {
        panelFrontBtn.classList.toggle('active', activePanel === 'front');
    }
    if (panelBackBtn) {
        panelBackBtn.classList.toggle('active', activePanel === 'back');
    }
};

/**
 * Update design statistics display
 */
const updateDesignStats = () => {
    const frontCount = document.getElementById('frontPixelCount');
    const backCount = document.getElementById('backPixelCount');

    if (frontCount || backCount) {
        const stats = getDesignStats();

        if (frontCount) {
            frontCount.textContent = stats.front.pixelCount;
        }
        if (backCount) {
            backCount.textContent = stats.back.pixelCount;
        }
    }
};

/**
 * Show a temporary message in the sidebar
 */
const showTemporaryMessage = (message) => {
    const msgEl = document.createElement('div');
    msgEl.className = 'sidebar-message';
    msgEl.textContent = message;
    sidebarElement.appendChild(msgEl);

    setTimeout(() => {
        msgEl.classList.add('fade-out');
        setTimeout(() => msgEl.remove(), 300);
    }, 2000);
};
