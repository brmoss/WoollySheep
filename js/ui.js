import { getSavedPatterns, savePattern, loadPatternByName, deletePattern } from './persistence.js';

let modal, modalTitle, saveSection, loadSection;
let patternNameInput, confirmSaveButton, patternList, noPatterns;
let modalNotification;
let refreshMinimapCallback = null;

export const initUI = (elements, minimapCallback = null) => {
    modal = elements.modal;
    modalTitle = elements.modalTitle;
    saveSection = elements.saveSection;
    loadSection = elements.loadSection;
    patternNameInput = elements.patternNameInput;
    confirmSaveButton = elements.confirmSaveButton;
    patternList = elements.patternList;
    noPatterns = elements.noPatterns;
    modalNotification = elements.modalNotification;
    refreshMinimapCallback = minimapCallback;
};

export const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

export const showNotification = (message, type = 'success') => {
    if (modalNotification) {
        modalNotification.textContent = message;
        modalNotification.className = `notification show ${type}`;
        setTimeout(() => {
            modalNotification.classList.remove('show');
        }, 3000);
    }
};

export const openSaveModal = () => {
    if (modalTitle) modalTitle.textContent = 'Save Pattern';
    if (saveSection) saveSection.style.display = 'block';
    if (loadSection) loadSection.style.display = 'none';
    if (patternNameInput) patternNameInput.value = '';
    if (modalNotification) modalNotification.classList.remove('show');
    if (modal) modal.classList.add('show');
    if (patternNameInput) patternNameInput.focus();
};

export const openLoadModal = () => {
    if (modalTitle) modalTitle.textContent = 'Load Pattern';
    if (saveSection) saveSection.style.display = 'none';
    if (loadSection) loadSection.style.display = 'block';
    if (modalNotification) modalNotification.classList.remove('show');
    renderPatternList();
    if (modal) modal.classList.add('show');
};

export const closeModal = () => {
    if (modal) modal.classList.remove('show');
};

export const renderPatternList = () => {
    const patterns = getSavedPatterns();
    const patternNames = Object.keys(patterns);

    const existingItems = patternList.querySelectorAll('.pattern-item');
    existingItems.forEach(item => item.remove());

    if (patternNames.length === 0) {
        if (noPatterns) noPatterns.style.display = 'block';
    } else {
        if (noPatterns) noPatterns.style.display = 'none';

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

export const handleConfirmSave = () => {
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
};
