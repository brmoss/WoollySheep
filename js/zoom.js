import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from './config.js';
import { state } from './state.js';

let canvasWrapper;
let zoomLevelDisplay;

export const initZoom = (wrapper, displayElement) => {
    canvasWrapper = wrapper;
    zoomLevelDisplay = displayElement;
};

export const updateZoom = (newZoom) => {
    state.currentZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
    if (canvasWrapper) {
        canvasWrapper.style.transform = `scale(${state.currentZoom})`;
    }
    if (zoomLevelDisplay) {
        zoomLevelDisplay.textContent = `${Math.round(state.currentZoom * 100)}%`;
    }
};

export const zoomIn = () => updateZoom(state.currentZoom + ZOOM_STEP);

export const zoomOut = () => updateZoom(state.currentZoom - ZOOM_STEP);

export const resetZoom = () => updateZoom(1);
