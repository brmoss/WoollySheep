import { TOTAL_ROWS, TOTAL_COLUMNS, ROWS_CONFIG } from './config.js';
import { state, getPixelKey, getActiveDimensions, getActiveRowsConfig } from './state.js';

// Create a single pixel element
export const createPixel = (isActive, rowIndex, colIndex) => {
    const pixel = document.createElement('div');
    pixel.classList.add('pixel');
    pixel.dataset.rowIndex = rowIndex;
    pixel.dataset.colIndex = colIndex;

    if (!isActive) {
        pixel.classList.add('non-selectable');
    }
    return pixel;
};

/**
 * Clear the canvas and reset pixel state
 * @param {HTMLElement} canvasElement - The canvas element to clear
 */
export const clearCanvas = (canvasElement) => {
    // Remove all child elements
    while (canvasElement.firstChild) {
        canvasElement.removeChild(canvasElement.firstChild);
    }

    // Clear state references
    state.pixels = [];
    state.pixelMap.clear();
};

/**
 * Build the entire canvas grid using dynamic configuration
 * Uses active jumper config if available, falls back to legacy config
 * @param {HTMLElement} canvasElement - The canvas element to build into
 */
export const buildCanvas = (canvasElement) => {
    // Get dimensions from active configuration or fall back to legacy
    const activeRowsConfig = getActiveRowsConfig();
    const dimensions = getActiveDimensions();

    const totalRows = dimensions.totalRows;
    const maxColumns = dimensions.maxColumns;
    const rowsConfig = activeRowsConfig || ROWS_CONFIG;

    // Update CSS grid columns dynamically based on configuration
    canvasElement.style.gridTemplateColumns = `auto repeat(${maxColumns}, 11px) auto`;

    for (let row = totalRows; row >= 1; row--) {
        let columns = 0;
        let padding = 0;

        for (const config of rowsConfig) {
            if (row >= config.start && row <= config.end) {
                if (config.step) {
                    const steps = row - config.start;
                    columns = config.startColumns + steps * config.step;
                    padding = (maxColumns - columns) / 2;
                } else {
                    columns = config.columns;
                    padding = config.padding || 0;
                }
                break;
            }
        }

        const rowDiv = document.createElement('div');
        rowDiv.style.display = 'contents';

        const rowLabelLeft = document.createElement('div');
        rowLabelLeft.classList.add('row-label');
        rowLabelLeft.textContent = row;
        rowDiv.appendChild(rowLabelLeft);

        for (let col = 1; col <= maxColumns; col++) {
            const isActive = col > padding && col <= maxColumns - padding;
            const pixel = createPixel(isActive, row, col);
            rowDiv.appendChild(pixel);
            if (isActive) {
                state.pixels.push(pixel);
                state.pixelMap.set(getPixelKey(row, col), pixel);
            }
        }

        const rowLabelRight = document.createElement('div');
        rowLabelRight.classList.add('row-label');
        rowLabelRight.textContent = row;
        rowDiv.appendChild(rowLabelRight);

        canvasElement.appendChild(rowDiv);
    }
};

/**
 * Rebuild the canvas with a new configuration
 * Optionally preserves or applies design data
 * @param {HTMLElement} canvasElement - The canvas element
 * @param {Object} designData - Optional design data to apply after rebuild
 */
export const rebuildCanvas = (canvasElement, designData = null) => {
    clearCanvas(canvasElement);
    buildCanvas(canvasElement);

    // Apply design data if provided
    if (designData) {
        applyDesignToCanvas(designData);
    }
};

/**
 * Apply design data to the canvas
 * @param {Object} designData - Object with "row-col" keys and color values
 */
export const applyDesignToCanvas = (designData) => {
    if (!designData) return;

    for (const [key, color] of Object.entries(designData)) {
        // Design keys are in "row-col" format, pixelMap uses "row,col"
        const [rowIndex, colIndex] = key.split('-');
        const pixel = state.pixelMap.get(`${rowIndex},${colIndex}`);
        if (pixel && color) {
            pixel.style.backgroundColor = color;
        }
    }
};

/**
 * Capture the current canvas design to an object
 * @returns {Object} Design data with "row-col" keys and color values
 */
export const captureCanvasDesign = () => {
    const design = {};

    state.pixels.forEach(pixel => {
        const color = pixel.style.backgroundColor;
        if (color && color !== 'white' && color !== 'rgb(255, 255, 255)' && color !== '') {
            const rowIndex = pixel.dataset.rowIndex;
            const colIndex = pixel.dataset.colIndex;
            design[`${rowIndex}-${colIndex}`] = color;
        }
    });

    return design;
};
