// Grid configuration constants
export const TOTAL_ROWS = 138;
export const TOTAL_COLUMNS = 107;

export const ROWS_CONFIG = [
    { start: 1, end: 103, columns: 107 },
    { start: 104, end: 104, columns: 97, padding: 5 },
    { start: 105, end: 116, startColumns: 97, step: -2 },
    { start: 117, end: 138, columns: 73, padding: 17 },
];

// Symmetry centers
export const CENTER_COLUMN = 54;
export const CENTER_ROW = 69;

// History limits
export const HISTORY_LIMIT = 50;

// Zoom configuration
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2;
export const ZOOM_STEP = 0.1;

// Storage keys
export const STORAGE_KEY = 'woollySheepPatterns';
export const AUTOSAVE_KEY = 'woollySheepAutoSave';
