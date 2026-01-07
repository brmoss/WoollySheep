import { STORAGE_KEY, AUTOSAVE_KEY } from './config.js';
import { state } from './state.js';
import { clearHistory } from './history.js';

let autoSaveIndicator = null;

export const initPersistence = () => {
    autoSaveIndicator = document.createElement('div');
    autoSaveIndicator.id = 'autoSaveIndicator';
    autoSaveIndicator.innerHTML = '<i class="fas fa-check"></i> Auto-saved';
    document.body.appendChild(autoSaveIndicator);
};

export const getPatternData = () => {
    const patternData = {};
    state.pixels.forEach(pixel => {
        const color = pixel.style.backgroundColor;
        if (color && color !== 'white' && color !== 'rgb(255, 255, 255)' && color !== '') {
            const key = `${pixel.dataset.rowIndex}-${pixel.dataset.colIndex}`;
            patternData[key] = color;
        }
    });
    return patternData;
};

export const applyPatternData = (patternData) => {
    state.pixels.forEach(pixel => {
        pixel.style.backgroundColor = 'white';
        pixel.classList.remove('selected');
    });

    for (const [key, color] of Object.entries(patternData)) {
        const [rowIndex, colIndex] = key.split('-');
        const pixel = state.pixels.find(p =>
            p.dataset.rowIndex === rowIndex && p.dataset.colIndex === colIndex
        );
        if (pixel) {
            pixel.style.backgroundColor = color;
        }
    }
    clearHistory();
};

export const getSavedPatterns = () => {
    try {
        const patterns = localStorage.getItem(STORAGE_KEY);
        return patterns ? JSON.parse(patterns) : {};
    } catch (e) {
        console.error('Error reading patterns from localStorage:', e);
        return {};
    }
};

export const savePattern = (name) => {
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

export const loadPatternByName = (name) => {
    const patterns = getSavedPatterns();
    if (patterns[name]) {
        applyPatternData(patterns[name].data);
        return true;
    }
    return false;
};

export const deletePattern = (name) => {
    const patterns = getSavedPatterns();
    if (patterns[name]) {
        delete patterns[name];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns));
        return true;
    }
    return false;
};

const showAutoSaveIndicator = () => {
    if (autoSaveIndicator) {
        autoSaveIndicator.classList.add('show');
        setTimeout(() => {
            autoSaveIndicator.classList.remove('show');
        }, 2000);
    }
};

export const autoSave = () => {
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

export const triggerAutoSave = () => {
    clearTimeout(state.autoSaveTimeout);
    state.autoSaveTimeout = setTimeout(autoSave, 2000);
};

export const loadAutoSave = () => {
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
