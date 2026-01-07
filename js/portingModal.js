// Porting Modal Module
// UI for selecting design porting strategy when changing jumper config/size

import { PORTING_STRATEGIES, STRATEGY_NAMES, STRATEGY_DESCRIPTIONS, previewPorting } from './designPorting.js';
import { state } from './state.js';

let modalElement = null;
let onConfirmCallback = null;
let onCancelCallback = null;
let currentSourceConfig = null;
let currentTargetConfig = null;

/**
 * Initialize the porting modal (creates DOM elements)
 */
export const initPortingModal = () => {
    // Create modal if it doesn't exist
    if (document.getElementById('portingModal')) {
        modalElement = document.getElementById('portingModal');
        return;
    }

    modalElement = document.createElement('div');
    modalElement.id = 'portingModal';
    modalElement.className = 'modal';
    modalElement.innerHTML = `
        <div class="modal-content porting-modal-content">
            <span class="modal-close" id="portingModalClose">&times;</span>
            <h2>Design Transfer Options</h2>

            <div class="porting-info">
                <div class="porting-dimensions">
                    <div class="porting-source">
                        <h4>Current</h4>
                        <p id="portingSourceInfo">-</p>
                    </div>
                    <div class="porting-arrow">
                        <i class="fas fa-arrow-right"></i>
                    </div>
                    <div class="porting-target">
                        <h4>New</h4>
                        <p id="portingTargetInfo">-</p>
                    </div>
                </div>
            </div>

            <div class="porting-strategies" id="portingStrategies">
                <!-- Strategies will be populated dynamically -->
            </div>

            <div class="porting-preview" id="portingPreview">
                <!-- Preview stats will be shown here -->
            </div>

            <div class="porting-actions">
                <button id="portingConfirmBtn" class="modal-btn save-btn">
                    <i class="fas fa-check"></i> Apply
                </button>
                <button id="portingCancelBtn" class="modal-btn">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modalElement);

    // Set up event listeners
    document.getElementById('portingModalClose').addEventListener('click', hidePortingModal);
    document.getElementById('portingCancelBtn').addEventListener('click', hidePortingModal);
    document.getElementById('portingConfirmBtn').addEventListener('click', handleConfirm);

    // Close on backdrop click
    modalElement.addEventListener('click', (e) => {
        if (e.target === modalElement) {
            hidePortingModal();
        }
    });
};

/**
 * Show the porting modal
 * @param {Object} options - Modal options
 * @param {Object} options.sourceConfig - { configId, configName, size, totalRows, maxColumns }
 * @param {Object} options.targetConfig - { configId, configName, size, totalRows, maxColumns }
 * @param {Function} options.onConfirm - Callback with selected strategy
 * @param {Function} options.onCancel - Callback when cancelled
 */
export const showPortingModal = (options) => {
    if (!modalElement) {
        initPortingModal();
    }

    currentSourceConfig = options.sourceConfig;
    currentTargetConfig = options.targetConfig;
    onConfirmCallback = options.onConfirm;
    onCancelCallback = options.onCancel;

    // Update dimension info
    document.getElementById('portingSourceInfo').innerHTML = `
        <strong>${options.sourceConfig.configName}</strong><br>
        Size: ${options.sourceConfig.size}<br>
        ${options.sourceConfig.totalRows} rows × ${options.sourceConfig.maxColumns} cols
    `;

    document.getElementById('portingTargetInfo').innerHTML = `
        <strong>${options.targetConfig.configName}</strong><br>
        Size: ${options.targetConfig.size}<br>
        ${options.targetConfig.totalRows} rows × ${options.targetConfig.maxColumns} cols
    `;

    // Populate strategies
    populateStrategies();

    // Show modal
    modalElement.classList.add('show');
};

/**
 * Hide the porting modal
 */
export const hidePortingModal = () => {
    if (modalElement) {
        modalElement.classList.remove('show');
    }

    if (onCancelCallback) {
        onCancelCallback();
    }

    // Reset callbacks
    onConfirmCallback = null;
    onCancelCallback = null;
};

/**
 * Populate the strategy options
 */
const populateStrategies = () => {
    const container = document.getElementById('portingStrategies');
    container.innerHTML = '';

    const strategies = [
        PORTING_STRATEGIES.SCALE,
        PORTING_STRATEGIES.CENTER_CLIP,
        PORTING_STRATEGIES.ANCHOR_BOTTOM_CENTER,
        PORTING_STRATEGIES.ANCHOR_CENTER,
        PORTING_STRATEGIES.ANCHOR_TOP_LEFT,
        PORTING_STRATEGIES.DISCARD
    ];

    strategies.forEach((strategy, index) => {
        const isRecommended = strategy === PORTING_STRATEGIES.SCALE;
        const strategyDiv = document.createElement('div');
        strategyDiv.className = 'porting-strategy-option';
        strategyDiv.innerHTML = `
            <label>
                <input type="radio" name="portingStrategy" value="${strategy}" ${index === 0 ? 'checked' : ''}>
                <span class="strategy-name">
                    ${STRATEGY_NAMES[strategy]}
                    ${isRecommended ? '<span class="recommended-badge">Recommended</span>' : ''}
                </span>
                <span class="strategy-description">${STRATEGY_DESCRIPTIONS[strategy]}</span>
            </label>
        `;
        container.appendChild(strategyDiv);

        // Add change listener for preview
        strategyDiv.querySelector('input').addEventListener('change', updatePreview);
    });

    // Initial preview
    updatePreview();
};

/**
 * Update the preview statistics
 */
const updatePreview = () => {
    const selectedStrategy = document.querySelector('input[name="portingStrategy"]:checked')?.value;
    const previewContainer = document.getElementById('portingPreview');

    if (!selectedStrategy || !currentSourceConfig || !currentTargetConfig) {
        previewContainer.innerHTML = '';
        return;
    }

    // Get current design for preview
    const currentPanel = state.jumperConfig.activePanel;
    const currentDesign = state.design[currentPanel] || {};

    const stats = previewPorting(
        currentDesign,
        currentSourceConfig.configId,
        currentSourceConfig.size,
        currentTargetConfig.configId,
        currentTargetConfig.size,
        selectedStrategy
    );

    if (stats.originalCount === 0) {
        previewContainer.innerHTML = `
            <div class="preview-stats">
                <i class="fas fa-info-circle"></i>
                No design to transfer (canvas is empty)
            </div>
        `;
    } else if (selectedStrategy === PORTING_STRATEGIES.DISCARD) {
        previewContainer.innerHTML = `
            <div class="preview-stats warning">
                <i class="fas fa-exclamation-triangle"></i>
                All ${stats.originalCount} pixels will be discarded
            </div>
        `;
    } else {
        const preserved = Math.round((stats.portedCount / stats.originalCount) * 100);
        let statusClass = preserved >= 90 ? 'good' : preserved >= 70 ? 'warning' : 'poor';

        previewContainer.innerHTML = `
            <div class="preview-stats ${statusClass}">
                <i class="fas fa-chart-pie"></i>
                ${stats.portedCount} of ${stats.originalCount} pixels preserved (${preserved}%)
                ${stats.lostCount > 0 ? `<br><small>${stats.lostCount} pixels will be lost</small>` : ''}
            </div>
        `;
    }
};

/**
 * Handle confirm button click
 */
const handleConfirm = () => {
    const selectedStrategy = document.querySelector('input[name="portingStrategy"]:checked')?.value;

    if (selectedStrategy && onConfirmCallback) {
        onConfirmCallback(selectedStrategy);
    }

    // Hide modal (don't call cancel callback)
    if (modalElement) {
        modalElement.classList.remove('show');
    }

    onConfirmCallback = null;
    onCancelCallback = null;
};

/**
 * Add CSS styles for the porting modal
 */
export const injectPortingModalStyles = () => {
    if (document.getElementById('porting-modal-styles')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'porting-modal-styles';
    style.textContent = `
        .porting-modal-content {
            max-width: 500px;
        }

        .porting-info {
            margin-bottom: 20px;
        }

        .porting-dimensions {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            padding: 15px;
            background-color: var(--bg-tertiary);
            border-radius: 8px;
        }

        .porting-source, .porting-target {
            text-align: center;
            flex: 1;
        }

        .porting-source h4, .porting-target h4 {
            margin: 0 0 8px 0;
            color: var(--text-secondary);
            font-size: 12px;
            text-transform: uppercase;
        }

        .porting-source p, .porting-target p {
            margin: 0;
            font-size: 13px;
            line-height: 1.5;
        }

        .porting-arrow {
            color: var(--text-muted);
            font-size: 24px;
        }

        .porting-strategies {
            margin-bottom: 20px;
        }

        .porting-strategy-option {
            margin-bottom: 10px;
        }

        .porting-strategy-option label {
            display: flex;
            flex-direction: column;
            padding: 12px;
            border: 2px solid var(--border-light);
            border-radius: 8px;
            cursor: pointer;
            transition: border-color 0.2s, background-color 0.2s;
        }

        .porting-strategy-option label:hover {
            border-color: var(--border-color);
            background-color: var(--bg-tertiary);
        }

        .porting-strategy-option input:checked + .strategy-name {
            color: #9C27B0;
        }

        .porting-strategy-option input:checked ~ .strategy-description {
            color: var(--text-primary);
        }

        .porting-strategy-option label:has(input:checked) {
            border-color: #9C27B0;
            background-color: rgba(156, 39, 176, 0.05);
        }

        .strategy-name {
            font-weight: bold;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .strategy-description {
            font-size: 13px;
            color: var(--text-muted);
        }

        .recommended-badge {
            font-size: 10px;
            padding: 2px 6px;
            background-color: #4CAF50;
            color: white;
            border-radius: 10px;
            font-weight: normal;
        }

        .porting-strategy-option input[type="radio"] {
            position: absolute;
            opacity: 0;
            pointer-events: none;
        }

        .porting-preview {
            margin-bottom: 20px;
        }

        .preview-stats {
            padding: 12px;
            border-radius: 8px;
            text-align: center;
            font-size: 14px;
        }

        .preview-stats.good {
            background-color: var(--notification-success-bg);
            color: var(--notification-success-text);
        }

        .preview-stats.warning {
            background-color: var(--notification-info-bg);
            color: var(--notification-info-text);
        }

        .preview-stats.poor {
            background-color: var(--notification-error-bg);
            color: var(--notification-error-text);
        }

        .preview-stats i {
            margin-right: 8px;
        }

        .preview-stats small {
            opacity: 0.8;
        }

        .porting-actions {
            display: flex;
            gap: 10px;
        }

        .porting-actions .modal-btn {
            flex: 1;
        }
    `;
    document.head.appendChild(style);
};
