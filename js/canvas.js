import { TOTAL_ROWS, TOTAL_COLUMNS, ROWS_CONFIG } from './config.js';
import { state, getPixelKey } from './state.js';

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

// Build the entire canvas grid
export const buildCanvas = (canvasElement) => {
    for (let row = TOTAL_ROWS; row >= 1; row--) {
        let columns = 0;
        let padding = 0;

        for (const config of ROWS_CONFIG) {
            if (row >= config.start && row <= config.end) {
                if (config.step) {
                    const steps = row - config.start;
                    columns = config.startColumns + steps * config.step;
                    padding = (TOTAL_COLUMNS - columns) / 2;
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

        for (let col = 1; col <= TOTAL_COLUMNS; col++) {
            const isActive = col > padding && col <= TOTAL_COLUMNS - padding;
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
