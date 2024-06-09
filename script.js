document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const colorPicker = document.getElementById('colorPicker');
    const colorPixelsButton = document.getElementById('colorPixels');
    const clearPatternButton = document.getElementById('clearPattern');
    const undoLastButton = document.getElementById('undoLast');

    const totalRows = 138;
    const totalColumns = 107;
    const rowsConfig = [
        { start: 1, end: 103, columns: 107 },
        { start: 104, end: 104, columns: 97, padding: 5 },
        { start: 105, end: 116, startColumns: 97, step: -2 },
        { start: 117, end: 138, columns: 73, padding: 17 },
    ];
    const pixels = [];
    let lastColoredPixels = [];
    let isMouseDown = false;
    let isTouchActive = false;
    let touchTimeout;

    canvas.addEventListener('mousedown', () => isMouseDown = true);
    document.addEventListener('mouseup', () => isMouseDown = false);

    canvas.addEventListener('touchstart', (e) => {
        touchTimeout = setTimeout(() => {
            isTouchActive = true;
            handleTouch(e);
        }, 200); // 200ms threshold for long press
    });

    canvas.addEventListener('touchmove', (e) => {
        if (isTouchActive) {
            handleTouch(e);
        }
    });

    canvas.addEventListener('touchend', () => {
        clearTimeout(touchTimeout);
        isTouchActive = false;
    });

    canvas.addEventListener('click', (e) => {
        const pixel = e.target;
        if (pixel.classList.contains('pixel')) {
            toggleSelect(pixel);
        }
    });

    canvas.addEventListener('mouseover', (e) => {
        const pixel = e.target;
        if (isMouseDown && pixel.classList.contains('pixel')) {
            selectPixel(pixel);
            selectAdjacentPixels(pixel);
        }
    });

    const handleTouch = (e) => {
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element && element.classList.contains('pixel')) {
            selectPixel(element);
            selectAdjacentPixels(element);
        }
        e.preventDefault(); // Prevent scrolling while selecting pixels
    };

    const toggleSelect = (pixel) => {
        pixel.classList.toggle('selected');
    };

    const selectPixel = (pixel) => {
        if (!pixel.classList.contains('selected')) {
            pixel.classList.add('selected');
        }
    };

    const selectAdjacentPixels = (pixel) => {
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
            if (adjRowIndex >= 1 && adjRowIndex <= totalRows && adjColIndex >= 1 && adjColIndex <= totalColumns) {
                const adjPixel = pixels.find(p => parseInt(p.dataset.rowIndex) === adjRowIndex && parseInt(p.dataset.colIndex) === adjColIndex);
                if (adjPixel && !adjPixel.classList.contains('selected')) {
                    pixelsToSelect.push(adjPixel);
                }
            }
        });

        batchSelectPixels(pixelsToSelect);
    };

    const batchSelectPixels = (pixelsToSelect) => {
        requestAnimationFrame(() => {
            pixelsToSelect.forEach(pixel => pixel.classList.add('selected'));
        });
    };

    const createPixel = (isActive, rowIndex, colIndex) => {
        const pixel = document.createElement('div');
        pixel.classList.add('pixel');
        pixel.dataset.rowIndex = rowIndex;
        pixel.dataset.colIndex = colIndex;

        if (!isActive) {
            pixel.classList.add('non-selectable');
        }
        return pixel;
    };

    const rows = [];

    for (let row = totalRows; row >= 1; row--) {
        let columns = 0;
        let padding = 0;

        for (let config of rowsConfig) {
            if (row >= config.start && row <= config.end) {
                if (config.step) {
                    const steps = row - config.start;
                    columns = config.startColumns + steps * config.step;
                    padding = (totalColumns - columns) / 2;
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

        for (let col = 1; col <= totalColumns; col++) {
            const isActive = col > padding && col <= totalColumns - padding;
            const pixel = createPixel(isActive, row, col);
            rowDiv.appendChild(pixel);
            if (isActive) {
                pixels.push(pixel);
            }
        }

        const rowLabelRight = document.createElement('div');
        rowLabelRight.classList.add('row-label');
        rowLabelRight.textContent = row;

        rowDiv.appendChild(rowLabelRight);

        canvas.appendChild(rowDiv);
    }

    colorPixelsButton.addEventListener('click', () => {
        const selectedColor = colorPicker.value;
        lastColoredPixels = [];

        requestAnimationFrame(() => {
            pixels.forEach(pixel => {
                if (pixel.classList.contains('selected')) {
                    lastColoredPixels.push({ pixel: pixel, originalColor: pixel.style.backgroundColor });
                    pixel.style.backgroundColor = selectedColor;
                    pixel.classList.remove('selected');
                }
            });
        });
    });

    undoLastButton.addEventListener('click', () => {
        requestAnimationFrame(() => {
            lastColoredPixels.forEach(item => {
                item.pixel.style.backgroundColor = item.originalColor;
            });
            lastColoredPixels = [];
        });
    });

    clearPatternButton.addEventListener('click', () => {
        requestAnimationFrame(() => {
            pixels.forEach(pixel => {
                pixel.style.backgroundColor = 'white';
                pixel.classList.remove('selected');
            });
            lastColoredPixels = [];
        });
    });
});