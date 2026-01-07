import { TOTAL_ROWS } from './config.js';
import { state } from './state.js';

// DOM element references
let highlightToggleBtn = null;
let highlightControls = null;
let rowInput = null;
let prevRowBtn = null;
let nextRowBtn = null;

// Initialize the row highlight module
export const initRowHighlight = (toggleBtn, controls, input, prevBtn, nextBtn) => {
    highlightToggleBtn = toggleBtn;
    highlightControls = controls;
    rowInput = input;
    prevRowBtn = prevBtn;
    nextRowBtn = nextBtn;

    // Set initial input value
    rowInput.value = state.highlightedRow;
    rowInput.min = 1;
    rowInput.max = TOTAL_ROWS;
};

// Toggle highlight mode on/off
export const toggleHighlightMode = () => {
    state.highlightRowEnabled = !state.highlightRowEnabled;

    if (state.highlightRowEnabled) {
        highlightToggleBtn.classList.add('active');
        highlightControls.classList.add('visible');
        applyRowHighlight();
    } else {
        highlightToggleBtn.classList.remove('active');
        highlightControls.classList.remove('visible');
        clearRowHighlight();
    }
};

// Apply highlight to the current row
export const applyRowHighlight = () => {
    if (!state.highlightRowEnabled) return;

    // First clear any existing highlights
    clearRowHighlight();

    // Highlight all pixels in the current row
    state.pixels.forEach(pixel => {
        const rowIndex = parseInt(pixel.dataset.rowIndex);
        if (rowIndex === state.highlightedRow) {
            pixel.classList.add('row-highlighted');
        }
    });

    // Also highlight the row labels
    const rowLabels = document.querySelectorAll('.row-label');
    rowLabels.forEach(label => {
        if (parseInt(label.textContent) === state.highlightedRow) {
            label.classList.add('row-label-highlighted');
        }
    });
};

// Clear all row highlights
export const clearRowHighlight = () => {
    document.querySelectorAll('.row-highlighted').forEach(el => {
        el.classList.remove('row-highlighted');
    });
    document.querySelectorAll('.row-label-highlighted').forEach(el => {
        el.classList.remove('row-label-highlighted');
    });
};

// Set the highlighted row number
export const setHighlightedRow = (rowNumber) => {
    // Clamp to valid range
    const newRow = Math.max(1, Math.min(TOTAL_ROWS, rowNumber));
    state.highlightedRow = newRow;
    rowInput.value = newRow;

    if (state.highlightRowEnabled) {
        applyRowHighlight();
        scrollToHighlightedRow();
    }
};

// Move to the previous row (visually down, numerically one less)
export const prevRow = () => {
    if (state.highlightedRow > 1) {
        setHighlightedRow(state.highlightedRow - 1);
    }
};

// Move to the next row (visually up, numerically one more)
export const nextRow = () => {
    if (state.highlightedRow < TOTAL_ROWS) {
        setHighlightedRow(state.highlightedRow + 1);
    }
};

// Handle input change from the row number input
export const handleRowInputChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
        setHighlightedRow(value);
    }
};

// Scroll to make the highlighted row visible
export const scrollToHighlightedRow = () => {
    const highlightedPixel = document.querySelector('.row-highlighted');
    if (highlightedPixel) {
        highlightedPixel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};

// Handle keyboard shortcuts for row navigation
export const handleRowHighlightKeydown = (e) => {
    if (!state.highlightRowEnabled) return false;

    // Only handle arrow keys when not in an input field (except the row input)
    const activeElement = document.activeElement;
    const isInputFocused = activeElement.tagName === 'INPUT' && activeElement !== rowInput;

    if (isInputFocused) return false;

    if (e.key === 'ArrowUp') {
        e.preventDefault();
        nextRow(); // Up arrow moves to higher row number (visually up)
        return true;
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        prevRow(); // Down arrow moves to lower row number (visually down)
        return true;
    }

    return false;
};
