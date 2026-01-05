document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const colorPicker = document.getElementById('colorPicker');
    const colorPixelsButton = document.getElementById('colorPixels');
    const clearPatternButton = document.getElementById('clearPattern');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    const savePatternButton = document.getElementById('savePattern');
    const loadPatternButton = document.getElementById('loadPattern');

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

    const totalRows = 138;
    const totalColumns = 107;
    const rowsConfig = [
        { start: 1, end: 103, columns: 107 },
        { start: 104, end: 104, columns: 97, padding: 5 },
        { start: 105, end: 116, startColumns: 97, step: -2 },
        { start: 117, end: 138, columns: 73, padding: 17 },
    ];
    const pixels = [];
    let isMouseDown = false;
    let isTouchActive = false;
    let touchTimeout;
    let autoSaveTimeout;

    // Undo/Redo History System
    const HISTORY_LIMIT = 50;
    let undoStack = [];
    let redoStack = [];

    // Zoom state
    let currentZoom = 1;
    const minZoom = 0.5;
    const maxZoom = 2;
    const zoomStep = 0.1;

    // Storage keys
    const STORAGE_KEY = 'woollySheepPatterns';
    const AUTOSAVE_KEY = 'woollySheepAutoSave';

    // Create a map for fast pixel lookup by coordinates
    const pixelMap = new Map();
    const getPixelKey = (rowIndex, colIndex) => `${rowIndex},${colIndex}`;
    const getPixelByCoords = (rowIndex, colIndex) => pixelMap.get(getPixelKey(rowIndex, colIndex));

    // Create auto-save indicator
    const autoSaveIndicator = document.createElement('div');
    autoSaveIndicator.id = 'autoSaveIndicator';
    autoSaveIndicator.innerHTML = '<i class="fas fa-check"></i> Auto-saved';
    document.body.appendChild(autoSaveIndicator);

    // ===== UNDO/REDO FUNCTIONS =====
    const updateUndoRedoButtons = () => {
        undoBtn.disabled = undoStack.length === 0;
        redoBtn.disabled = redoStack.length === 0;
    };

    const pushToUndoStack = (operation) => {
        if (operation.changes.length === 0) return;
        undoStack.push(operation);
        if (undoStack.length > HISTORY_LIMIT) {
            undoStack.shift();
        }
        redoStack = [];
        updateUndoRedoButtons();
    };

    const undo = () => {
        if (undoStack.length === 0) return;
        const operation = undoStack.pop();
        requestAnimationFrame(() => {
            operation.changes.forEach(change => {
                const pixel = getPixelByCoords(change.rowIndex, change.colIndex);
                if (pixel) {
                    pixel.style.backgroundColor = change.oldColor;
                }
            });
        });
        redoStack.push(operation);
        updateUndoRedoButtons();
        triggerAutoSave();
    };

    const redo = () => {
        if (redoStack.length === 0) return;
        const operation = redoStack.pop();
        requestAnimationFrame(() => {
            operation.changes.forEach(change => {
                const pixel = getPixelByCoords(change.rowIndex, change.colIndex);
                if (pixel) {
                    pixel.style.backgroundColor = change.newColor;
                }
            });
        });
        undoStack.push(operation);
        updateUndoRedoButtons();
        triggerAutoSave();
    };

    // ===== ZOOM FUNCTIONS =====
    const updateZoom = (newZoom) => {
        currentZoom = Math.min(maxZoom, Math.max(minZoom, newZoom));
        canvasWrapper.style.transform = `scale(${currentZoom})`;
        zoomLevelDisplay.textContent = `${Math.round(currentZoom * 100)}%`;
    };

    const zoomIn = () => updateZoom(currentZoom + zoomStep);
    const zoomOut = () => updateZoom(currentZoom - zoomStep);
    const resetZoom = () => updateZoom(1);

    // ===== SAVE/LOAD FUNCTIONS =====
    const getPatternData = () => {
        const patternData = {};
        pixels.forEach(pixel => {
            const color = pixel.style.backgroundColor;
            if (color && color !== 'white' && color !== 'rgb(255, 255, 255)' && color !== '') {
                const key = `${pixel.dataset.rowIndex}-${pixel.dataset.colIndex}`;
                patternData[key] = color;
            }
        });
        return patternData;
    };

    const applyPatternData = (patternData) => {
        pixels.forEach(pixel => {
            pixel.style.backgroundColor = 'white';
            pixel.classList.remove('selected');
        });

        for (const [key, color] of Object.entries(patternData)) {
            const [rowIndex, colIndex] = key.split('-');
            const pixel = pixels.find(p =>
                p.dataset.rowIndex === rowIndex && p.dataset.colIndex === colIndex
            );
            if (pixel) {
                pixel.style.backgroundColor = color;
            }
        }
        undoStack = [];
        redoStack = [];
        updateUndoRedoButtons();
    };

    const getSavedPatterns = () => {
        try {
            const patterns = localStorage.getItem(STORAGE_KEY);
            return patterns ? JSON.parse(patterns) : {};
        } catch (e) {
            console.error('Error reading patterns from localStorage:', e);
            return {};
        }
    };

    const savePattern = (name) => {
        const patterns = getSavedPatterns();
        const patternData = getPatternData();

        patterns[name] = {
            data: patternData,
            savedAt: new Date().toISOString(),
            pixelCount: Object.keys(patternData).length
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns));
            return true;
        } catch (e) {
            console.error('Error saving pattern:', e);
            return false;
        }
    };

    const loadPatternByName = (name) => {
        const patterns = getSavedPatterns();
        if (patterns[name]) {
            applyPatternData(patterns[name].data);
            return true;
        }
        return false;
    };

    const deletePattern = (name) => {
        const patterns = getSavedPatterns();
        if (patterns[name]) {
            delete patterns[name];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns));
            return true;
        }
        return false;
    };

    const autoSave = () => {
        const patternData = getPatternData();
        try {
            localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
                data: patternData,
                savedAt: new Date().toISOString()
            }));
            showAutoSaveIndicator();
        } catch (e) {
            console.error('Auto-save failed:', e);
        }
    };

    const triggerAutoSave = () => {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(autoSave, 2000);
    };

    const showAutoSaveIndicator = () => {
        autoSaveIndicator.classList.add('show');
        setTimeout(() => {
            autoSaveIndicator.classList.remove('show');
        }, 2000);
    };

    const loadAutoSave = () => {
        try {
            const autoSaved = localStorage.getItem(AUTOSAVE_KEY);
            if (autoSaved) {
                const parsed = JSON.parse(autoSaved);
                if (parsed.data && Object.keys(parsed.data).length > 0) {
                    applyPatternData(parsed.data);
                }
            }
        } catch (e) {
            console.error('Error loading auto-save:', e);
        }
    };

    const showNotification = (message, type = 'success') => {
        modalNotification.textContent = message;
        modalNotification.className = `notification show ${type}`;
        setTimeout(() => {
            modalNotification.classList.remove('show');
        }, 3000);
    };

    const openSaveModal = () => {
        modalTitle.textContent = 'Save Pattern';
        saveSection.style.display = 'block';
        loadSection.style.display = 'none';
        patternNameInput.value = '';
        modalNotification.classList.remove('show');
        modal.classList.add('show');
        patternNameInput.focus();
    };

    const openLoadModal = () => {
        modalTitle.textContent = 'Load Pattern';
        saveSection.style.display = 'none';
        loadSection.style.display = 'block';
        modalNotification.classList.remove('show');
        renderPatternList();
        modal.classList.add('show');
    };

    const closeModal = () => {
        modal.classList.remove('show');
    };

    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const renderPatternList = () => {
        const patterns = getSavedPatterns();
        const patternNames = Object.keys(patterns);

        const existingItems = patternList.querySelectorAll('.pattern-item');
        existingItems.forEach(item => item.remove());

        if (patternNames.length === 0) {
            noPatterns.style.display = 'block';
        } else {
            noPatterns.style.display = 'none';

            patternNames.sort((a, b) => {
                return new Date(patterns[b].savedAt) - new Date(patterns[a].savedAt);
            });

            patternNames.forEach(name => {
                const pattern = patterns[name];
                const item = document.createElement('div');
                item.className = 'pattern-item';

                const savedDate = new Date(pattern.savedAt);
                const dateStr = savedDate.toLocaleDateString() + ' ' + savedDate.toLocaleTimeString();

                item.innerHTML = `
                    <div class="pattern-info">
                        <div class="pattern-name">${escapeHtml(name)}</div>
                        <div class="pattern-date">${dateStr} - ${pattern.pixelCount} coloured pixels</div>
                    </div>
                    <div class="pattern-actions">
                        <button class="load-btn" data-name="${escapeHtml(name)}">Load</button>
                        <button class="delete-btn" data-name="${escapeHtml(name)}">Delete</button>
                    </div>
                `;

                patternList.appendChild(item);
            });

            patternList.querySelectorAll('.load-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const name = e.target.dataset.name;
                    if (loadPatternByName(name)) {
                        showNotification(`Pattern "${name}" loaded successfully!`, 'success');
                        setTimeout(closeModal, 1500);
                    } else {
                        showNotification('Failed to load pattern.', 'error');
                    }
                });
            });

            patternList.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const name = e.target.dataset.name;
                    if (confirm(`Are you sure you want to delete "${name}"?`)) {
                        if (deletePattern(name)) {
                            showNotification(`Pattern "${name}" deleted.`, 'info');
                            renderPatternList();
                        } else {
                            showNotification('Failed to delete pattern.', 'error');
                        }
                    }
                });
            });
        }
    };

    // ===== PIXEL SELECTION =====
    canvas.addEventListener('mousedown', () => isMouseDown = true);
    document.addEventListener('mouseup', () => isMouseDown = false);

    canvas.addEventListener('touchstart', (e) => {
        touchTimeout = setTimeout(() => {
            isTouchActive = true;
            handleTouch(e);
        }, 200);
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
        e.preventDefault();
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
                const adjPixel = getPixelByCoords(adjRowIndex, adjColIndex);
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

    // ===== BUILD CANVAS =====
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
                pixelMap.set(getPixelKey(row, col), pixel);
            }
        }

        const rowLabelRight = document.createElement('div');
        rowLabelRight.classList.add('row-label');
        rowLabelRight.textContent = row;

        rowDiv.appendChild(rowLabelRight);

        canvas.appendChild(rowDiv);
    }

    // ===== EVENT LISTENERS =====
    colorPixelsButton.addEventListener('click', () => {
        const selectedColor = colorPicker.value;
        const changes = [];

        requestAnimationFrame(() => {
            pixels.forEach(pixel => {
                if (pixel.classList.contains('selected')) {
                    const rowIndex = parseInt(pixel.dataset.rowIndex);
                    const colIndex = parseInt(pixel.dataset.colIndex);
                    const oldColor = pixel.style.backgroundColor || 'white';

                    if (oldColor !== selectedColor) {
                        changes.push({
                            rowIndex: rowIndex,
                            colIndex: colIndex,
                            oldColor: oldColor,
                            newColor: selectedColor
                        });
                    }

                    pixel.style.backgroundColor = selectedColor;
                    pixel.classList.remove('selected');
                }
            });

            pushToUndoStack({ changes: changes });
            if (changes.length > 0) {
                triggerAutoSave();
            }
        });
    });

    clearPatternButton.addEventListener('click', () => {
        const changes = [];

        requestAnimationFrame(() => {
            pixels.forEach(pixel => {
                const oldColor = pixel.style.backgroundColor || '';
                if (oldColor && oldColor !== 'white' && oldColor !== 'rgb(255, 255, 255)') {
                    const rowIndex = parseInt(pixel.dataset.rowIndex);
                    const colIndex = parseInt(pixel.dataset.colIndex);
                    changes.push({
                        rowIndex: rowIndex,
                        colIndex: colIndex,
                        oldColor: oldColor,
                        newColor: 'white'
                    });
                }
                pixel.style.backgroundColor = 'white';
                pixel.classList.remove('selected');
            });

            pushToUndoStack({ changes: changes });
            if (changes.length > 0) {
                triggerAutoSave();
            }
        });
    });

    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);

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

    confirmSaveButton.addEventListener('click', () => {
        const name = patternNameInput.value.trim();
        if (!name) {
            showNotification('Please enter a pattern name.', 'error');
            patternNameInput.focus();
            return;
        }

        const patterns = getSavedPatterns();
        if (patterns[name]) {
            if (!confirm(`A pattern named "${name}" already exists. Overwrite?`)) {
                return;
            }
        }

        if (savePattern(name)) {
            showNotification(`Pattern "${name}" saved successfully!`, 'success');
            setTimeout(closeModal, 1500);
        } else {
            showNotification('Failed to save pattern. Storage may be full.', 'error');
        }
    });

    patternNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            confirmSaveButton.click();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Close modal with Escape
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            closeModal();
            return;
        }

        if (e.ctrlKey || e.metaKey) {
            // Zoom shortcuts
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                zoomIn();
            } else if (e.key === '-') {
                e.preventDefault();
                zoomOut();
            } else if (e.key === '0') {
                e.preventDefault();
                resetZoom();
            }
            // Undo/Redo shortcuts
            else if (e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey) || (e.key === 'Z' && e.shiftKey)) {
                e.preventDefault();
                redo();
            }
        }
    });

    // Mouse wheel zoom (with Ctrl/Cmd held)
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
