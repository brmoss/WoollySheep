document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const colorPicker = document.getElementById('colorPicker');
    const colorPixelsButton = document.getElementById('colorPixels');
    const clearPatternButton = document.getElementById('clearPattern');

    const totalRows = 138;
    const totalColumns = 107;
    const rowsConfig = [
        { start: 1, end: 103, columns: 107 },
        { start: 104, end: 104, columns: 97, padding: 5 },
        { start: 104, end: 116, startColumns: 97, step: -2 },
        { start: 117, end: 138, columns: 73, padding: 17 },
    ];
    const pixels = [];

    let isMouseDown = false;

    canvas.addEventListener('mousedown', () => isMouseDown = true);
    document.addEventListener('mouseup', () => isMouseDown = false);

    const createPixel = (isActive) => {
        const pixel = document.createElement('div');
        pixel.classList.add('pixel');
        if (isActive) {
            pixel.addEventListener('click', toggleSelect);
            pixel.addEventListener('mouseover', handleMouseOver);
        } else {
            pixel.classList.add('non-selectable');
        }
        return pixel;
    };

    const toggleSelect = (e) => {
        e.target.classList.toggle('selected');
    };

    const handleMouseOver = (e) => {
        if (isMouseDown) {
            toggleSelect(e);
        }
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
            const pixel = createPixel(isActive);
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
        pixels.forEach(pixel => {
            if (pixel.classList.contains('selected')) {
                pixel.style.backgroundColor = selectedColor;
                pixel.classList.remove('selected');
            }
        });
    });

    clearPatternButton.addEventListener('click', () => {
        pixels.forEach(pixel => {
            pixel.style.backgroundColor = 'white';
            pixel.classList.remove('selected');
        });
    });
});