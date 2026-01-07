import { state } from './state.js';
import { buildCanvas } from './canvas.js';
import { initHistory, updateUndoRedoButtons, pushToUndoStack, undo, redo } from './history.js';
import { initSymmetry, toggleMirrorH, toggleMirrorV, reflectPatternH, reflectPatternV } from './symmetry.js';
import { toggleSelect, selectPixel, selectAdjacentPixels, clearSelection } from './selection.js';
import { initFill, toggleFillMode, handleFillClick } from './fill.js';
import { initZoom, zoomIn, zoomOut, resetZoom } from './zoom.js';
import { initPersistence, triggerAutoSave, loadAutoSave } from './persistence.js';
import { initUI, openSaveModal, openLoadModal, closeModal, handleConfirmSave } from './ui.js';
import { initExport } from './export.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const canvas = document.getElementById('canvas');
    const colorPicker = document.getElementById('colorPicker');
    const colorPixelsButton = document.getElementById('colorPixels');
    const clearPatternButton = document.getElementById('clearPattern');
    const fillBtn = document.getElementById('fillBtn');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    const savePatternButton = document.getElementById('savePattern');
    const loadPatternButton = document.getElementById('loadPattern');
    const mirrorHBtn = document.getElementById('mirrorH');
    const mirrorVBtn = document.getElementById('mirrorV');
    const reflectHBtn = document.getElementById('reflectH');
    const reflectVBtn = document.getElementById('reflectV');
    const exportPNGBtn = document.getElementById('exportPNG');
    const exportPDFBtn = document.getElementById('exportPDF');
    const exportTextBtn = document.getElementById('exportText');

    // Modal elements
    const modal = document.getElementById('patternModal');
    const modalClose = document.querySelector('.modal-close');
    const modalTitle = document.getElementById('modalTitle');
    const saveSection = document.getElementById('saveSection');
    const loadSection = document.getElementById('loadSection');
    const patternNameInput = document.getElementById('patternName');
    const confirmSaveButton = document.getElementById('confirmSave');
    const patternList = document.getElementById('patternList');
    const noPatterns = document.getElementById('noPatterns');
    const modalNotification = document.getElementById('modalNotification');

    // Zoom elements
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const zoomInButton = document.getElementById('zoom-in');
    const zoomOutButton = document.getElementById('zoom-out');
    const zoomResetButton = document.getElementById('zoom-reset');
    const zoomLevelDisplay = document.getElementById('zoom-level');

    // Initialize modules
    initHistory(undoBtn, redoBtn);
    initSymmetry(mirrorHBtn, mirrorVBtn, canvasWrapper, triggerAutoSave);
    initFill(fillBtn, colorPicker, triggerAutoSave);
    initZoom(canvasWrapper, zoomLevelDisplay);
    initPersistence();
    initUI({
        modal, modalTitle, saveSection, loadSection,
        patternNameInput, confirmSaveButton, patternList, noPatterns, modalNotification
    });
    initExport(exportPNGBtn, exportTextBtn, exportPDFBtn);

    // Build canvas
    buildCanvas(canvas);

    // Touch handling helper
    const handleTouch = (e) => {
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element && element.classList.contains('pixel')) {
            selectPixel(element);
            selectAdjacentPixels(element);
        }
        e.preventDefault();
    };

    // ===== EVENT LISTENERS =====

    // Canvas mouse events
    canvas.addEventListener('mousedown', (e) => {
        state.isMouseDown = true;
        state.isDragging = false;
        const pixel = e.target;
        if (pixel.classList.contains('pixel') && !pixel.classList.contains('non-selectable')) {
            if (!state.isFillMode) {
                selectPixel(pixel);
            }
        }
    });

    document.addEventListener('mouseup', () => {
        state.isMouseDown = false;
        setTimeout(() => { state.isDragging = false; }, 10);
    });

    canvas.addEventListener('click', (e) => {
        const pixel = e.target;
        if (pixel.classList.contains('pixel')) {
            if (state.isFillMode) {
                handleFillClick(pixel);
            } else if (!state.isDragging) {
                toggleSelect(pixel);
            }
        }
    });

    canvas.addEventListener('mouseover', (e) => {
        const pixel = e.target;
        if (state.isMouseDown && pixel.classList.contains('pixel')) {
            state.isDragging = true;
            selectPixel(pixel);
            selectAdjacentPixels(pixel);
        }
    });

    // Touch events
    canvas.addEventListener('touchstart', (e) => {
        state.touchTimeout = setTimeout(() => {
            state.isTouchActive = true;
            handleTouch(e);
        }, 200);
    });

    canvas.addEventListener('touchmove', (e) => {
        if (state.isTouchActive) {
            handleTouch(e);
        }
    });

    canvas.addEventListener('touchend', () => {
        clearTimeout(state.touchTimeout);
        state.isTouchActive = false;
    });

    // Color pixels button
    colorPixelsButton.addEventListener('click', () => {
        const selectedColor = colorPicker.value;
        const changes = [];

        requestAnimationFrame(() => {
            state.pixels.forEach(pixel => {
                if (pixel.classList.contains('selected')) {
                    const rowIndex = parseInt(pixel.dataset.rowIndex);
                    const colIndex = parseInt(pixel.dataset.colIndex);
                    const oldColor = pixel.style.backgroundColor || 'white';

                    if (oldColor !== selectedColor) {
                        changes.push({
                            rowIndex,
                            colIndex,
                            oldColor,
                            newColor: selectedColor
                        });
                    }

                    pixel.style.backgroundColor = selectedColor;
                    pixel.classList.remove('selected');
                }
            });

            pushToUndoStack({ changes });
            if (changes.length > 0) {
                triggerAutoSave();
            }
        });
    });

    // Clear pattern button
    clearPatternButton.addEventListener('click', () => {
        const changes = [];

        requestAnimationFrame(() => {
            state.pixels.forEach(pixel => {
                const oldColor = pixel.style.backgroundColor || '';
                if (oldColor && oldColor !== 'white' && oldColor !== 'rgb(255, 255, 255)') {
                    const rowIndex = parseInt(pixel.dataset.rowIndex);
                    const colIndex = parseInt(pixel.dataset.colIndex);
                    changes.push({
                        rowIndex,
                        colIndex,
                        oldColor,
                        newColor: 'white'
                    });
                }
                pixel.style.backgroundColor = 'white';
                pixel.classList.remove('selected');
            });

            pushToUndoStack({ changes });
            if (changes.length > 0) {
                triggerAutoSave();
            }
        });
    });

    // Button event listeners
    undoBtn.addEventListener('click', () => undo(triggerAutoSave));
    redoBtn.addEventListener('click', () => redo(triggerAutoSave));
    fillBtn.addEventListener('click', toggleFillMode);
    mirrorHBtn.addEventListener('click', toggleMirrorH);
    mirrorVBtn.addEventListener('click', toggleMirrorV);
    reflectHBtn.addEventListener('click', reflectPatternH);
    reflectVBtn.addEventListener('click', reflectPatternV);

    // Zoom event listeners
    zoomInButton.addEventListener('click', zoomIn);
    zoomOutButton.addEventListener('click', zoomOut);
    zoomResetButton.addEventListener('click', resetZoom);
    zoomLevelDisplay.addEventListener('dblclick', resetZoom);

    // Save/Load event listeners
    savePatternButton.addEventListener('click', openSaveModal);
    loadPatternButton.addEventListener('click', openLoadModal);
    modalClose.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    confirmSaveButton.addEventListener('click', handleConfirmSave);

    patternNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleConfirmSave();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (modal.classList.contains('show')) {
                closeModal();
                return;
            }
            const hasSelection = state.pixels.some(p => p.classList.contains('selected'));
            if (hasSelection) {
                clearSelection();
                return;
            }
        }

        if (e.ctrlKey || e.metaKey) {
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                zoomIn();
            } else if (e.key === '-') {
                e.preventDefault();
                zoomOut();
            } else if (e.key === '0') {
                e.preventDefault();
                resetZoom();
            } else if (e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo(triggerAutoSave);
            } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey) || (e.key === 'Z' && e.shiftKey)) {
                e.preventDefault();
                redo(triggerAutoSave);
            }
        }
    });

    // Mouse wheel zoom
    document.getElementById('canvas-container').addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.deltaY < 0) {
                zoomIn();
            } else {
                zoomOut();
            }
        }
    }, { passive: false });

    // Initialize
    updateUndoRedoButtons();
    loadAutoSave();
});
