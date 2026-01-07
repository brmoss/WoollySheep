import { TOTAL_ROWS, TOTAL_COLUMNS } from './config.js';
import { state, getPixelKey, getPixelByCoords } from './state.js';
import { pushToUndoStack } from './history.js';

let fillBtn;
let colorPicker;
let triggerAutoSaveCallback = null;
let refreshMinimapCallback = null;

export const initFill = (fillButton, colorPickerElement, autoSaveCallback, minimapCallback = null) => {
    fillBtn = fillButton;
    colorPicker = colorPickerElement;
    triggerAutoSaveCallback = autoSaveCallback;
    refreshMinimapCallback = minimapCallback;
};

export const toggleFillMode = () => {
    state.isFillMode = !state.isFillMode;
    if (fillBtn) fillBtn.classList.toggle('active', state.isFillMode);
    document.body.classList.toggle('fill-mode', state.isFillMode);
};

export const normalizeColor = (color) => {
    if (!color || color === '' || color === 'transparent') return 'white';
    if (color === 'white' || color === 'rgb(255, 255, 255)') return 'white';
    return color;
};

export const floodFill = (startPixel, fillColor) => {
    const startRowIndex = parseInt(startPixel.dataset.rowIndex);
    const startColIndex = parseInt(startPixel.dataset.colIndex);
    const targetColor = normalizeColor(startPixel.style.backgroundColor);
    const normalizedFillColor = normalizeColor(fillColor);

    if (targetColor === normalizedFillColor) return [];

    const changes = [];
    const visited = new Set();
    const queue = [[startRowIndex, startColIndex]];

    const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1]
    ];

    while (queue.length > 0) {
        const [rowIndex, colIndex] = queue.shift();
        const key = getPixelKey(rowIndex, colIndex);

        if (visited.has(key)) continue;
        visited.add(key);

        const pixel = getPixelByCoords(rowIndex, colIndex);
        if (!pixel) continue;

        const pixelColor = normalizeColor(pixel.style.backgroundColor);
        if (pixelColor !== targetColor) continue;

        changes.push({
            rowIndex,
            colIndex,
            oldColor: pixel.style.backgroundColor || 'white',
            newColor: fillColor
        });

        pixel.style.backgroundColor = fillColor;

        for (const [dRow, dCol] of directions) {
            const newRow = rowIndex + dRow;
            const newCol = colIndex + dCol;
            const newKey = getPixelKey(newRow, newCol);

            if (!visited.has(newKey) && newRow >= 1 && newRow <= TOTAL_ROWS && newCol >= 1 && newCol <= TOTAL_COLUMNS) {
                queue.push([newRow, newCol]);
            }
        }
    }

    return changes;
};

export const handleFillClick = (pixel) => {
    if (!pixel.classList.contains('pixel') || pixel.classList.contains('non-selectable')) return;

    const fillColor = colorPicker ? colorPicker.value : '#000000';
    const changes = floodFill(pixel, fillColor);

    if (changes.length > 0) {
        pushToUndoStack({ changes });
        if (triggerAutoSaveCallback) triggerAutoSaveCallback();
        if (refreshMinimapCallback) refreshMinimapCallback();
    }
};
