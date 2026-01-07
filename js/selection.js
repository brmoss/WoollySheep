import { TOTAL_ROWS, TOTAL_COLUMNS } from './config.js';
import { state, getPixelByCoords } from './state.js';
import { getMirroredPixels } from './symmetry.js';

export const toggleSelect = (pixel) => {
    if (!pixel.classList.contains('pixel') || pixel.classList.contains('non-selectable')) return;

    const rowIndex = parseInt(pixel.dataset.rowIndex);
    const colIndex = parseInt(pixel.dataset.colIndex);
    const isSelected = pixel.classList.contains('selected');

    const mirroredPixels = getMirroredPixels(rowIndex, colIndex);

    mirroredPixels.forEach(({ pixel: p }) => {
        if (isSelected) {
            p.classList.remove('selected');
        } else {
            p.classList.add('selected');
        }
    });
};

export const selectPixel = (pixel) => {
    if (!pixel.classList.contains('pixel') || pixel.classList.contains('non-selectable')) return;
    if (pixel.classList.contains('selected')) return;

    const rowIndex = parseInt(pixel.dataset.rowIndex);
    const colIndex = parseInt(pixel.dataset.colIndex);

    const mirroredPixels = getMirroredPixels(rowIndex, colIndex);
    mirroredPixels.forEach(({ pixel: p }) => {
        p.classList.add('selected');
    });
};

export const selectAdjacentPixels = (pixel) => {
    const rowIndex = parseInt(pixel.dataset.rowIndex);
    const colIndex = parseInt(pixel.dataset.colIndex);

    const adjacentOffsets = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];

    const pixelsToSelect = [pixel];

    adjacentOffsets.forEach(offset => {
        const adjRowIndex = rowIndex + offset[0];
        const adjColIndex = colIndex + offset[1];
        if (adjRowIndex >= 1 && adjRowIndex <= TOTAL_ROWS && adjColIndex >= 1 && adjColIndex <= TOTAL_COLUMNS) {
            const adjPixel = getPixelByCoords(adjRowIndex, adjColIndex);
            if (adjPixel && !adjPixel.classList.contains('selected')) {
                pixelsToSelect.push(adjPixel);
            }
        }
    });

    batchSelectPixels(pixelsToSelect);
};

export const batchSelectPixels = (pixelsToSelect) => {
    requestAnimationFrame(() => {
        pixelsToSelect.forEach(pixel => pixel.classList.add('selected'));
    });
};

export const clearSelection = () => {
    state.pixels.forEach(pixel => pixel.classList.remove('selected'));
};
