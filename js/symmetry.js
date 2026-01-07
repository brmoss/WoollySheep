import { TOTAL_ROWS, TOTAL_COLUMNS, CENTER_COLUMN, CENTER_ROW } from './config.js';
import { state, getPixelByCoords } from './state.js';
import { pushToUndoStack } from './history.js';

let mirrorHBtn, mirrorVBtn, canvasWrapper;
let triggerAutoSaveCallback = null;
let refreshMinimapCallback = null;

export const initSymmetry = (mirrorHButton, mirrorVButton, wrapper, autoSaveCallback, minimapCallback = null) => {
    mirrorHBtn = mirrorHButton;
    mirrorVBtn = mirrorVButton;
    canvasWrapper = wrapper;
    triggerAutoSaveCallback = autoSaveCallback;
    refreshMinimapCallback = minimapCallback;
};

export const getMirroredColumn = (col) => TOTAL_COLUMNS - col + 1;

export const getMirroredRow = (row) => TOTAL_ROWS - row + 1;

export const getMirroredPixels = (rowIndex, colIndex) => {
    const mirroredPixels = [];

    const originalPixel = getPixelByCoords(rowIndex, colIndex);
    if (originalPixel) {
        mirroredPixels.push({ pixel: originalPixel, rowIndex, colIndex });
    }

    if (state.mirrorH) {
        const mirroredCol = getMirroredColumn(colIndex);
        if (mirroredCol !== colIndex) {
            const mirroredPixel = getPixelByCoords(rowIndex, mirroredCol);
            if (mirroredPixel) {
                mirroredPixels.push({ pixel: mirroredPixel, rowIndex, colIndex: mirroredCol });
            }
        }
    }

    if (state.mirrorV) {
        const mirroredRow = getMirroredRow(rowIndex);
        if (mirroredRow !== rowIndex) {
            const mirroredPixel = getPixelByCoords(mirroredRow, colIndex);
            if (mirroredPixel) {
                mirroredPixels.push({ pixel: mirroredPixel, rowIndex: mirroredRow, colIndex });
            }
        }
    }

    if (state.mirrorH && state.mirrorV) {
        const mirroredCol = getMirroredColumn(colIndex);
        const mirroredRow = getMirroredRow(rowIndex);
        if (mirroredCol !== colIndex && mirroredRow !== rowIndex) {
            const mirroredPixel = getPixelByCoords(mirroredRow, mirroredCol);
            if (mirroredPixel) {
                mirroredPixels.push({ pixel: mirroredPixel, rowIndex: mirroredRow, colIndex: mirroredCol });
            }
        }
    }

    return mirroredPixels;
};

export const updateSymmetryLines = () => {
    if (state.symmetryLineH) {
        state.symmetryLineH.remove();
        state.symmetryLineH = null;
    }
    if (state.symmetryLineV) {
        state.symmetryLineV.remove();
        state.symmetryLineV = null;
    }

    if (!canvasWrapper) return;

    const pixelSize = 11;
    const gap = 1;
    const cellSize = pixelSize + gap;
    const padding = 20;

    if (state.mirrorH) {
        state.symmetryLineH = document.createElement('div');
        state.symmetryLineH.className = 'symmetry-line-h';
        const centerPixel = getPixelByCoords(TOTAL_ROWS, CENTER_COLUMN);
        if (centerPixel) {
            const rect = centerPixel.getBoundingClientRect();
            const wrapperRect = canvasWrapper.getBoundingClientRect();
            const leftPosition = (rect.left - wrapperRect.left) + (rect.width / 2);
            state.symmetryLineH.style.left = `${leftPosition}px`;
        } else {
            const rowLabelWidth = 20;
            const leftPosition = padding + rowLabelWidth + gap + (CENTER_COLUMN - 1) * cellSize + pixelSize / 2;
            state.symmetryLineH.style.left = `${leftPosition}px`;
        }
        canvasWrapper.appendChild(state.symmetryLineH);
    }

    if (state.mirrorV) {
        state.symmetryLineV = document.createElement('div');
        state.symmetryLineV.className = 'symmetry-line-v';
        // Use CENTER_COLUMN to find pixels at the symmetry boundary
        const rowAbovePixel = getPixelByCoords(CENTER_ROW + 1, CENTER_COLUMN);
        const rowBelowPixel = getPixelByCoords(CENTER_ROW, CENTER_COLUMN);
        if (rowAbovePixel && rowBelowPixel) {
            const rectAbove = rowAbovePixel.getBoundingClientRect();
            const rectBelow = rowBelowPixel.getBoundingClientRect();
            const wrapperRect = canvasWrapper.getBoundingClientRect();
            // Higher row numbers are visually at top, so row 70 is above row 69
            // Position line between bottom of upper row and top of lower row
            const topPosition = ((rectAbove.bottom + rectBelow.top) / 2) - wrapperRect.top;
            state.symmetryLineV.style.top = `${topPosition}px`;
        } else {
            const topPosition = padding + (TOTAL_ROWS - CENTER_ROW) * cellSize - gap / 2;
            state.symmetryLineV.style.top = `${topPosition}px`;
        }
        canvasWrapper.appendChild(state.symmetryLineV);
    }
};

export const toggleMirrorH = () => {
    state.mirrorH = !state.mirrorH;
    if (mirrorHBtn) mirrorHBtn.classList.toggle('active', state.mirrorH);
    updateSymmetryLines();
};

export const toggleMirrorV = () => {
    state.mirrorV = !state.mirrorV;
    if (mirrorVBtn) mirrorVBtn.classList.toggle('active', state.mirrorV);
    updateSymmetryLines();
};

export const reflectPatternH = () => {
    const changes = [];

    state.pixels.forEach(pixel => {
        const color = pixel.style.backgroundColor;
        if (color && color !== 'white' && color !== 'rgb(255, 255, 255)' && color !== '') {
            const rowIndex = parseInt(pixel.dataset.rowIndex);
            const colIndex = parseInt(pixel.dataset.colIndex);
            const mirroredCol = getMirroredColumn(colIndex);

            if (mirroredCol !== colIndex) {
                const mirroredPixel = getPixelByCoords(rowIndex, mirroredCol);
                if (mirroredPixel && !mirroredPixel.classList.contains('non-selectable')) {
                    const oldColor = mirroredPixel.style.backgroundColor || 'white';
                    if (oldColor !== color) {
                        changes.push({
                            rowIndex: rowIndex,
                            colIndex: mirroredCol,
                            oldColor: oldColor,
                            newColor: color
                        });
                        mirroredPixel.style.backgroundColor = color;
                    }
                }
            }
        }
    });

    if (changes.length > 0) {
        pushToUndoStack({ changes });
        if (triggerAutoSaveCallback) triggerAutoSaveCallback();
        if (refreshMinimapCallback) refreshMinimapCallback();
    }
};

export const reflectPatternV = () => {
    const changes = [];

    state.pixels.forEach(pixel => {
        const color = pixel.style.backgroundColor;
        if (color && color !== 'white' && color !== 'rgb(255, 255, 255)' && color !== '') {
            const rowIndex = parseInt(pixel.dataset.rowIndex);
            const colIndex = parseInt(pixel.dataset.colIndex);
            const mirroredRow = getMirroredRow(rowIndex);

            if (mirroredRow !== rowIndex) {
                const mirroredPixel = getPixelByCoords(mirroredRow, colIndex);
                if (mirroredPixel && !mirroredPixel.classList.contains('non-selectable')) {
                    const oldColor = mirroredPixel.style.backgroundColor || 'white';
                    if (oldColor !== color) {
                        changes.push({
                            rowIndex: mirroredRow,
                            colIndex: colIndex,
                            oldColor: oldColor,
                            newColor: color
                        });
                        mirroredPixel.style.backgroundColor = color;
                    }
                }
            }
        }
    });

    if (changes.length > 0) {
        pushToUndoStack({ changes });
        if (triggerAutoSaveCallback) triggerAutoSaveCallback();
        if (refreshMinimapCallback) refreshMinimapCallback();
    }
};
