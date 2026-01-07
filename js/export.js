import { TOTAL_ROWS, TOTAL_COLUMNS, ROWS_CONFIG } from './config.js';
import { state } from './state.js';

// Configuration for export
const PIXEL_SIZE = 10;
const GRID_GAP = 1;
const LABEL_WIDTH = 25;
const PADDING = 10;
const LABEL_FONT_SIZE = 8;
const BACKGROUND_COLOR = '#f5f5f5';
const GRID_LINE_COLOR = '#808080';
const LABEL_COLOR = '#333333';

/**
 * Get the row configuration (columns and padding) for a given row
 */
const getRowConfig = (row) => {
    for (const config of ROWS_CONFIG) {
        if (row >= config.start && row <= config.end) {
            if (config.step) {
                const steps = row - config.start;
                const columns = config.startColumns + steps * config.step;
                const padding = (TOTAL_COLUMNS - columns) / 2;
                return { columns, padding };
            } else {
                return {
                    columns: config.columns,
                    padding: config.padding || 0
                };
            }
        }
    }
    return { columns: TOTAL_COLUMNS, padding: 0 };
};

/**
 * Get pixel color from the state for given row and column
 */
const getPixelColor = (rowIndex, colIndex) => {
    const key = `${rowIndex},${colIndex}`;
    const pixel = state.pixelMap.get(key);
    if (pixel) {
        const bgColor = pixel.style.backgroundColor;
        if (bgColor && bgColor !== 'white' && bgColor !== 'rgb(255, 255, 255)') {
            return bgColor;
        }
        return 'white';
    }
    return null; // Non-active pixel
};

/**
 * Export the pattern as a PNG image
 */
export const exportAsPNG = () => {
    // Calculate canvas dimensions
    const cellSize = PIXEL_SIZE + GRID_GAP;
    const gridWidth = TOTAL_COLUMNS * cellSize;
    const gridHeight = TOTAL_ROWS * cellSize;
    const canvasWidth = gridWidth + (LABEL_WIDTH * 2) + (PADDING * 2);
    const canvasHeight = gridHeight + (PADDING * 2);

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Set up label font
    ctx.font = `${LABEL_FONT_SIZE}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw the grid row by row (top to bottom, rows from TOTAL_ROWS down to 1)
    for (let i = 0; i < TOTAL_ROWS; i++) {
        const rowNum = TOTAL_ROWS - i; // Row numbers go from 138 down to 1
        const rowConfig = getRowConfig(rowNum);
        const y = PADDING + (i * cellSize);

        // Draw left row label
        ctx.fillStyle = LABEL_COLOR;
        ctx.fillText(
            rowNum.toString(),
            PADDING + (LABEL_WIDTH / 2),
            y + (PIXEL_SIZE / 2)
        );

        // Draw right row label
        ctx.fillText(
            rowNum.toString(),
            canvasWidth - PADDING - (LABEL_WIDTH / 2),
            y + (PIXEL_SIZE / 2)
        );

        // Draw pixels for this row
        for (let col = 1; col <= TOTAL_COLUMNS; col++) {
            const x = PADDING + LABEL_WIDTH + ((col - 1) * cellSize);
            const isActive = col > rowConfig.padding && col <= TOTAL_COLUMNS - rowConfig.padding;

            if (isActive) {
                // Get pixel color
                const color = getPixelColor(rowNum, col);

                // Draw pixel background
                ctx.fillStyle = color || 'white';
                ctx.fillRect(x, y, PIXEL_SIZE, PIXEL_SIZE);

                // Draw pixel border
                ctx.strokeStyle = GRID_LINE_COLOR;
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x, y, PIXEL_SIZE, PIXEL_SIZE);
            }
            // Non-active pixels are left as background color (transparent area)
        }
    }

    // Create download link
    const link = document.createElement('a');
    link.download = 'knitting-pattern.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
};

// ============================================
// Written Instructions Export
// ============================================

/**
 * Convert RGB color string to a readable color name or hex
 */
const colorToName = (color) => {
    if (!color || color === 'white' || color === 'rgb(255, 255, 255)') {
        return 'white';
    }
    // Parse RGB values
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
        const r = parseInt(rgbMatch[1]);
        const g = parseInt(rgbMatch[2]);
        const b = parseInt(rgbMatch[3]);
        // Convert to hex for display
        const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
        return hex;
    }
    // If it's already a hex color or named color, return as-is
    return color;
};

/**
 * Generate written instructions for a single row
 */
const generateRowInstructions = (rowIndex) => {
    const { columns, padding } = getRowConfig(rowIndex);
    const startCol = padding + 1;
    const endCol = TOTAL_COLUMNS - padding;

    const stitches = [];
    let currentColor = null;
    let currentCount = 0;

    // Process each stitch in the row from left to right
    for (let col = startCol; col <= endCol; col++) {
        const color = getPixelColor(rowIndex, col);
        if (color === null) continue; // Skip non-active pixels

        const colorName = colorToName(color);

        if (colorName === currentColor) {
            currentCount++;
        } else {
            // Save the previous group
            if (currentCount > 0) {
                stitches.push({ count: currentCount, color: currentColor });
            }
            currentColor = colorName;
            currentCount = 1;
        }
    }

    // Don't forget the last group
    if (currentCount > 0) {
        stitches.push({ count: currentCount, color: currentColor });
    }

    // Format the row instructions
    if (stitches.length === 0) {
        return `Row ${rowIndex}: (empty)`;
    }

    const stitchDescriptions = stitches.map(s => `K${s.count} ${s.color}`);
    return `Row ${rowIndex}: ${stitchDescriptions.join(', ')}`;
};

/**
 * Generate the complete written instructions
 */
export const generateWrittenInstructions = () => {
    const lines = [];

    // Header
    lines.push('KNITTING PATTERN - WRITTEN INSTRUCTIONS');
    lines.push('========================================');
    lines.push('');
    lines.push('Legend: K = Knit stitch');
    lines.push('Colors are shown as hex codes (e.g., #ff0000 = red)');
    lines.push('');
    lines.push('----------------------------------------');
    lines.push('');

    // Generate instructions for each row (from row 1 to TOTAL_ROWS)
    for (let row = 1; row <= TOTAL_ROWS; row++) {
        const instruction = generateRowInstructions(row);
        lines.push(instruction);
    }

    lines.push('');
    lines.push('----------------------------------------');
    lines.push('END OF PATTERN');

    return lines.join('\n');
};

/**
 * Download instructions as a text file
 */
export const downloadInstructions = (filename = 'knitting-instructions.txt') => {
    const instructions = generateWrittenInstructions();
    const blob = new Blob([instructions], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// Modal reference for export instructions
let exportModal = null;

/**
 * Show instructions in a modal
 */
export const showInstructionsModal = () => {
    const instructions = generateWrittenInstructions();

    // Create modal if it doesn't exist
    if (!exportModal) {
        exportModal = document.createElement('div');
        exportModal.id = 'exportModal';
        exportModal.className = 'modal';
        exportModal.innerHTML = `
            <div class="modal-content export-modal-content">
                <span class="modal-close">&times;</span>
                <h2>Written Instructions</h2>
                <div class="export-actions">
                    <button id="downloadInstructions" class="modal-btn download-btn">
                        <i class="fas fa-download"></i> Download .txt
                    </button>
                    <button id="copyInstructions" class="modal-btn copy-btn">
                        <i class="fas fa-copy"></i> Copy to Clipboard
                    </button>
                </div>
                <textarea id="instructionsText" readonly></textarea>
                <div id="exportNotification" class="notification"></div>
            </div>
        `;
        document.body.appendChild(exportModal);

        // Event listeners for the modal
        const closeBtn = exportModal.querySelector('.modal-close');
        closeBtn.addEventListener('click', closeExportModal);

        exportModal.addEventListener('click', (e) => {
            if (e.target === exportModal) {
                closeExportModal();
            }
        });

        const downloadBtn = exportModal.querySelector('#downloadInstructions');
        downloadBtn.addEventListener('click', () => {
            downloadInstructions();
            showExportNotification('Instructions downloaded!', 'success');
        });

        const copyBtn = exportModal.querySelector('#copyInstructions');
        copyBtn.addEventListener('click', async () => {
            const textarea = exportModal.querySelector('#instructionsText');
            try {
                await navigator.clipboard.writeText(textarea.value);
                showExportNotification('Copied to clipboard!', 'success');
            } catch (err) {
                // Fallback for older browsers
                textarea.select();
                document.execCommand('copy');
                showExportNotification('Copied to clipboard!', 'success');
            }
        });
    }

    // Update the textarea with current instructions
    const textarea = exportModal.querySelector('#instructionsText');
    textarea.value = instructions;

    // Show the modal
    exportModal.classList.add('show');
};

/**
 * Close the export modal
 */
const closeExportModal = () => {
    if (exportModal) {
        exportModal.classList.remove('show');
    }
};

/**
 * Show a notification in the export modal
 */
const showExportNotification = (message, type) => {
    const notification = exportModal.querySelector('#exportNotification');
    notification.textContent = message;
    notification.className = `notification show ${type}`;
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
};

// ============================================
// PDF Export
// ============================================

/**
 * Convert RGB color string to hex color
 */
const rgbToHex = (rgb) => {
    if (!rgb || rgb === 'white' || rgb === '' || rgb === 'rgb(255, 255, 255)') return '#FFFFFF';
    if (rgb.startsWith('#')) return rgb;

    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (match) {
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }
    return '#FFFFFF';
};

/**
 * Export the pattern as a PDF document
 */
export const exportAsPDF = () => {
    // Access jsPDF from the global window object (loaded via CDN)
    const { jsPDF } = window.jspdf;

    if (!jsPDF) {
        alert('PDF library not loaded. Please check your internet connection.');
        return;
    }

    // Create PDF in landscape orientation for better grid display
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    // PDF dimensions (A4 landscape: 297mm x 210mm)
    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 10;

    // Title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Woolly Sheep Knitting Pattern', pageWidth / 2, margin + 5, { align: 'center' });

    // Calculate grid dimensions
    const gridStartY = margin + 15;
    const availableWidth = pageWidth - (2 * margin) - 20; // Space for labels on both sides
    const availableHeight = pageHeight - gridStartY - margin - 5;

    // Calculate cell size to fit the grid
    const cellWidth = availableWidth / TOTAL_COLUMNS;
    const cellHeight = availableHeight / TOTAL_ROWS;
    const cellSize = Math.min(cellWidth, cellHeight, 2); // Max 2mm per cell for readability

    // Recalculate actual grid dimensions
    const actualGridWidth = cellSize * TOTAL_COLUMNS;
    const actualGridHeight = cellSize * TOTAL_ROWS;

    // Center the grid horizontally
    const gridCenterX = (pageWidth - actualGridWidth) / 2;

    // Build a map of pixel colors from the state
    const pixelColors = new Map();
    state.pixels.forEach(pixel => {
        const row = parseInt(pixel.dataset.rowIndex);
        const col = parseInt(pixel.dataset.colIndex);
        const color = pixel.style.backgroundColor || 'white';
        pixelColors.set(`${row},${col}`, rgbToHex(color));
    });

    // Draw grid cells (from top to bottom, which is row TOTAL_ROWS to 1)
    for (let row = TOTAL_ROWS; row >= 1; row--) {
        const rowConfig = getRowConfig(row);
        const displayRow = TOTAL_ROWS - row; // Convert to display position (0 at top)
        const y = gridStartY + (displayRow * cellSize);

        for (let col = 1; col <= TOTAL_COLUMNS; col++) {
            const x = gridCenterX + ((col - 1) * cellSize);
            const isActive = col > rowConfig.padding && col <= TOTAL_COLUMNS - rowConfig.padding;

            if (isActive) {
                const color = pixelColors.get(`${row},${col}`) || '#FFFFFF';

                // Set fill color
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                pdf.setFillColor(r, g, b);

                // Draw filled rectangle
                pdf.rect(x, y, cellSize, cellSize, 'F');

                // Draw border
                pdf.setDrawColor(200, 200, 200);
                pdf.setLineWidth(0.05);
                pdf.rect(x, y, cellSize, cellSize, 'S');
            }
        }
    }

    // Draw row numbers (every 10 rows for readability)
    pdf.setFontSize(4);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);

    for (let row = TOTAL_ROWS; row >= 1; row -= 10) {
        const displayRow = TOTAL_ROWS - row;
        const y = gridStartY + (displayRow * cellSize) + (cellSize / 2) + 0.5;

        // Left side
        pdf.text(String(row), gridCenterX - 2, y, { align: 'right' });
        // Right side
        pdf.text(String(row), gridCenterX + actualGridWidth + 2, y, { align: 'left' });
    }

    // Draw column numbers (every 10 columns for readability)
    for (let col = 1; col <= TOTAL_COLUMNS; col += 10) {
        const x = gridCenterX + ((col - 1) * cellSize) + (cellSize / 2);

        // Top
        pdf.text(String(col), x, gridStartY - 1, { align: 'center' });
        // Bottom
        pdf.text(String(col), x, gridStartY + actualGridHeight + 3, { align: 'center' });
    }

    // Add footer with metadata
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    const date = new Date().toLocaleDateString();
    pdf.text(`Generated on ${date} | Grid: ${TOTAL_COLUMNS} x ${TOTAL_ROWS}`, pageWidth / 2, pageHeight - 5, { align: 'center' });

    // Save the PDF
    pdf.save('woolly-sheep-pattern.pdf');
};

/**
 * Initialize export functionality
 */
export const initExport = (exportPNGBtn, exportTextBtn, exportPDFBtn) => {
    if (exportPNGBtn) {
        exportPNGBtn.addEventListener('click', exportAsPNG);
    }
    if (exportTextBtn) {
        exportTextBtn.addEventListener('click', showInstructionsModal);

        // Add keyboard shortcut to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && exportModal && exportModal.classList.contains('show')) {
                closeExportModal();
            }
        });
    }
    if (exportPDFBtn) {
        exportPDFBtn.addEventListener('click', exportAsPDF);
    }
};
