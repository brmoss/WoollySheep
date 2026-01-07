import { TOTAL_ROWS, TOTAL_COLUMNS, ROWS_CONFIG } from './config.js';
import { state } from './state.js';

// Mini-map configuration
const MINIMAP_WIDTH = 150;
const MINIMAP_HEIGHT = Math.round(MINIMAP_WIDTH * (TOTAL_ROWS / TOTAL_COLUMNS));
const PIXEL_SIZE = MINIMAP_WIDTH / TOTAL_COLUMNS;

// Module state
let minimapCanvas = null;
let minimapCtx = null;
let viewportIndicator = null;
let canvasContainer = null;
let canvasWrapper = null;
let isDragging = false;

/**
 * Initialize the mini-map module
 * @param {HTMLElement} minimapContainer - The container element for the mini-map
 * @param {HTMLElement} container - The main canvas container (scrollable)
 * @param {HTMLElement} wrapper - The canvas wrapper element
 */
export const initMinimap = (minimapContainer, container, wrapper) => {
    canvasContainer = container;
    canvasWrapper = wrapper;

    // Create mini-map canvas
    minimapCanvas = document.createElement('canvas');
    minimapCanvas.id = 'minimap-canvas';
    minimapCanvas.width = MINIMAP_WIDTH;
    minimapCanvas.height = MINIMAP_HEIGHT;
    minimapContainer.appendChild(minimapCanvas);

    minimapCtx = minimapCanvas.getContext('2d');

    // Create viewport indicator
    viewportIndicator = document.createElement('div');
    viewportIndicator.id = 'minimap-viewport';
    minimapContainer.appendChild(viewportIndicator);

    // Draw initial pattern
    drawMinimapPattern();

    // Update viewport indicator
    updateViewportIndicator();

    // Set up event listeners
    setupEventListeners(minimapContainer);

    // Listen for scroll events
    canvasContainer.addEventListener('scroll', updateViewportIndicator);

    // Listen for zoom changes
    observeZoomChanges();
};

/**
 * Check if a cell at given row/col is active (not padded)
 */
const isCellActive = (row, col) => {
    for (const config of ROWS_CONFIG) {
        if (row >= config.start && row <= config.end) {
            let padding = 0;
            if (config.step) {
                const steps = row - config.start;
                const columns = config.startColumns + steps * config.step;
                padding = (TOTAL_COLUMNS - columns) / 2;
            } else {
                padding = config.padding || 0;
            }
            return col > padding && col <= TOTAL_COLUMNS - padding;
        }
    }
    return false;
};

/**
 * Draw the mini-map pattern showing all colored pixels
 */
export const drawMinimapPattern = () => {
    if (!minimapCtx) return;

    // Clear canvas
    minimapCtx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // Draw background shape (the active area)
    minimapCtx.fillStyle = '#ffffff';
    for (let row = 1; row <= TOTAL_ROWS; row++) {
        for (let col = 1; col <= TOTAL_COLUMNS; col++) {
            if (isCellActive(row, col)) {
                const x = (col - 1) * PIXEL_SIZE;
                // Rows are displayed from top (138) to bottom (1)
                const y = (TOTAL_ROWS - row) * PIXEL_SIZE;
                minimapCtx.fillRect(x, y, PIXEL_SIZE, PIXEL_SIZE);
            }
        }
    }

    // Draw outline for the shape
    minimapCtx.strokeStyle = '#cccccc';
    minimapCtx.lineWidth = 0.5;
    for (let row = 1; row <= TOTAL_ROWS; row++) {
        for (let col = 1; col <= TOTAL_COLUMNS; col++) {
            if (isCellActive(row, col)) {
                const x = (col - 1) * PIXEL_SIZE;
                const y = (TOTAL_ROWS - row) * PIXEL_SIZE;
                minimapCtx.strokeRect(x, y, PIXEL_SIZE, PIXEL_SIZE);
            }
        }
    }

    // Draw colored pixels from state
    state.pixels.forEach(pixel => {
        const bgColor = pixel.style.backgroundColor;
        if (bgColor && bgColor !== 'white' && bgColor !== 'rgb(255, 255, 255)' && bgColor !== '') {
            const row = parseInt(pixel.dataset.rowIndex);
            const col = parseInt(pixel.dataset.colIndex);

            const x = (col - 1) * PIXEL_SIZE;
            const y = (TOTAL_ROWS - row) * PIXEL_SIZE;

            minimapCtx.fillStyle = bgColor;
            minimapCtx.fillRect(x, y, PIXEL_SIZE, PIXEL_SIZE);
        }
    });
};

/**
 * Update the viewport indicator to show the currently visible area
 */
export const updateViewportIndicator = () => {
    if (!viewportIndicator || !canvasContainer || !canvasWrapper) return;

    // Get the container rect for visible dimensions
    const containerRect = canvasContainer.getBoundingClientRect();

    // Use container's scroll dimensions - these reflect the actual scrollable area
    const fullWidth = canvasContainer.scrollWidth;
    const fullHeight = canvasContainer.scrollHeight;

    // Calculate what portion of the canvas is visible
    const scrollLeft = canvasContainer.scrollLeft;
    const scrollTop = canvasContainer.scrollTop;
    const visibleWidth = containerRect.width;
    const visibleHeight = containerRect.height;

    // Calculate scale factors (mini-map to actual canvas)
    const scaleX = MINIMAP_WIDTH / fullWidth;
    const scaleY = MINIMAP_HEIGHT / fullHeight;

    // Calculate viewport indicator position and size
    const vpLeft = scrollLeft * scaleX;
    const vpTop = scrollTop * scaleY;
    const vpWidth = Math.min(visibleWidth * scaleX, MINIMAP_WIDTH - vpLeft);
    const vpHeight = Math.min(visibleHeight * scaleY, MINIMAP_HEIGHT - vpTop);

    // Apply styles to viewport indicator
    viewportIndicator.style.left = `${vpLeft}px`;
    viewportIndicator.style.top = `${vpTop}px`;
    viewportIndicator.style.width = `${Math.max(vpWidth, 10)}px`;
    viewportIndicator.style.height = `${Math.max(vpHeight, 10)}px`;
};

/**
 * Handle click/drag on mini-map to navigate
 * @param {MouseEvent|Touch} e - The mouse or touch event
 * @param {boolean} smooth - Whether to use smooth scrolling (for single clicks)
 */
const navigateToPosition = (e, smooth = false) => {
    if (!canvasContainer || !canvasWrapper) return;

    const rect = minimapCanvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Use container's scroll dimensions - these reflect the actual scrollable area
    const fullWidth = canvasContainer.scrollWidth;
    const fullHeight = canvasContainer.scrollHeight;

    // Calculate scale factors
    const scaleX = fullWidth / MINIMAP_WIDTH;
    const scaleY = fullHeight / MINIMAP_HEIGHT;

    // Calculate target scroll position (center the view on click point)
    const containerRect = canvasContainer.getBoundingClientRect();
    const targetX = (clickX * scaleX) - (containerRect.width / 2);
    const targetY = (clickY * scaleY) - (containerRect.height / 2);

    // Scroll to position (instant during drag for responsiveness)
    canvasContainer.scrollTo({
        left: Math.max(0, targetX),
        top: Math.max(0, targetY),
        behavior: smooth ? 'smooth' : 'instant'
    });
};

/**
 * Set up event listeners for mini-map interaction
 */
const setupEventListeners = (minimapContainer) => {
    // Click to navigate
    minimapContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        navigateToPosition(e);
    });

    minimapContainer.addEventListener('mousemove', (e) => {
        if (isDragging) {
            navigateToPosition(e);
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // Touch support
    minimapContainer.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isDragging = true;
        const touch = e.touches[0];
        navigateToPosition(touch);
    });

    minimapContainer.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (isDragging) {
            const touch = e.touches[0];
            navigateToPosition(touch);
        }
    });

    minimapContainer.addEventListener('touchend', () => {
        isDragging = false;
    });
};

/**
 * Observe zoom changes to update viewport indicator
 */
const observeZoomChanges = () => {
    // Use MutationObserver to detect zoom changes on canvas wrapper
    const observer = new MutationObserver(() => {
        updateViewportIndicator();
    });

    observer.observe(canvasWrapper, {
        attributes: true,
        attributeFilter: ['style']
    });
};

/**
 * Update mini-map when a pixel is colored
 * Call this after any pixel color change
 */
export const updateMinimapPixel = (row, col, color) => {
    if (!minimapCtx) return;

    const x = (col - 1) * PIXEL_SIZE;
    const y = (TOTAL_ROWS - row) * PIXEL_SIZE;

    if (color === 'white' || color === 'rgb(255, 255, 255)' || color === '') {
        // Clear and redraw white
        minimapCtx.fillStyle = '#ffffff';
        minimapCtx.fillRect(x, y, PIXEL_SIZE, PIXEL_SIZE);
        // Redraw border
        minimapCtx.strokeStyle = '#cccccc';
        minimapCtx.lineWidth = 0.5;
        minimapCtx.strokeRect(x, y, PIXEL_SIZE, PIXEL_SIZE);
    } else {
        minimapCtx.fillStyle = color;
        minimapCtx.fillRect(x, y, PIXEL_SIZE, PIXEL_SIZE);
    }
};

/**
 * Refresh the entire mini-map (useful after bulk operations like undo/redo)
 */
export const refreshMinimap = () => {
    drawMinimapPattern();
};
