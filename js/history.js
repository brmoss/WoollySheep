import { HISTORY_LIMIT } from './config.js';
import { state, getPixelByCoords } from './state.js';

let undoBtn, redoBtn;

export const initHistory = (undoButton, redoButton) => {
    undoBtn = undoButton;
    redoBtn = redoButton;
};

export const updateUndoRedoButtons = () => {
    if (undoBtn) undoBtn.disabled = state.undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = state.redoStack.length === 0;
};

export const pushToUndoStack = (operation) => {
    if (operation.changes.length === 0) return;
    state.undoStack.push(operation);
    if (state.undoStack.length > HISTORY_LIMIT) {
        state.undoStack.shift();
    }
    state.redoStack = [];
    updateUndoRedoButtons();
};

export const undo = (onComplete) => {
    if (state.undoStack.length === 0) return;
    const operation = state.undoStack.pop();
    requestAnimationFrame(() => {
        operation.changes.forEach(change => {
            const pixel = getPixelByCoords(change.rowIndex, change.colIndex);
            if (pixel) {
                pixel.style.backgroundColor = change.oldColor;
            }
        });
    });
    state.redoStack.push(operation);
    updateUndoRedoButtons();
    if (onComplete) onComplete();
};

export const redo = (onComplete) => {
    if (state.redoStack.length === 0) return;
    const operation = state.redoStack.pop();
    requestAnimationFrame(() => {
        operation.changes.forEach(change => {
            const pixel = getPixelByCoords(change.rowIndex, change.colIndex);
            if (pixel) {
                pixel.style.backgroundColor = change.newColor;
            }
        });
    });
    state.undoStack.push(operation);
    updateUndoRedoButtons();
    if (onComplete) onComplete();
};

export const clearHistory = () => {
    state.undoStack = [];
    state.redoStack = [];
    updateUndoRedoButtons();
};
