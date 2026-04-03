// ============================================================
// Unified color system for pisubi-v2
// Merges comex-viz-app and fdi-tracker palettes
// ============================================================

// --- Comex: Fiery Ocean palette ---
export const PALETTE = {
  darkRed: '#780000',
  red: '#C1121F',
  cream: '#FDF0D5',
  darkBlue: '#003049',
  blue: '#669BBC',
};

// --- Comex: Semantic colors ---
export const COLORS = {
  bg: PALETTE.cream,
  bgCard: '#fff8eb',
  bgCardHover: '#f5e6c8',
  border: '#d4c4a0',
  text: PALETTE.darkBlue,
  textMuted: '#4a6a7a',
  textDim: '#7a9aaa',

  // Trade flows
  exports: '#669BBC',
  exportsLight: '#8ab4cc',
  imports: '#C1121F',
  importsLight: '#d44a54',

  // Balance
  surplus: '#669BBC',
  deficit: '#C1121F',

  // Accents
  accent: PALETTE.blue,
  accentDark: PALETTE.darkBlue,
  highlight: PALETTE.darkBlue,
  danger: PALETTE.red,
  dangerDark: PALETTE.darkRed,
};

// --- Comex: Chapter color scale (product breakdown) ---
export const CHAPTER_COLORS = [
  '#669BBC', '#C1121F', '#FDF0D5', '#003049', '#780000',
  '#8ab4cc', '#d44a54', '#e8d8b0', '#1a4d6b', '#9a2020',
  '#4a8da8', '#a80e18', '#d4c49e', '#0d2536', '#5c0000',
  '#7cafc0', '#e63946', '#c4b48a', '#264f6d', '#b83030',
];

export function getChapterColor(index) {
  return CHAPTER_COLORS[index % CHAPTER_COLORS.length];
}

// --- Comex: Grandes Rubros colors ---
export const RUBRO_COLORS = {
  PP:  '#4a8da8',
  MOA: '#6abf69',
  MOI: '#e8a838',
  CyE: '#a05195',
  BK:  '#4a8da8',
  BI:  '#e8a838',
  CyL: '#a05195',
  PyA: '#d45087',
  BC:  '#6abf69',
  VA:  '#ff6361',
};

// --- FDI: Sector colors ---
export const SECTOR_COLORS = {
  'Petroleo': '#d4a800',
  'Oil & Gas': '#d4a800',
  'Mineria': '#17a589',
  'Mining': '#17a589',
  'Industria manufacturera': '#1a6fa3',
  'Manufacturing': '#1a6fa3',
  'Actividades financieras': '#7d3c98',
  'Financial Activities': '#7d3c98',
  'Comunicaciones': '#669BBC',
  'Communications': '#669BBC',
  'Comercio': '#2e86c1',
  'Commerce': '#2e86c1',
  'Electricidad, gas y agua': '#c0392b',
  'Utilities': '#c0392b',
  'Energy': '#c0392b',
  'Agricultura': '#17a589',
  'Agriculture': '#17a589',
  'Technology': '#7d3c98',
  'Gas': '#d4a800',
  'LNG': '#b7950b',
  'Otros': 'rgba(0,48,73,0.35)',
  'Other': 'rgba(0,48,73,0.35)',
};

// --- FDI: Country color scale ---
export const COUNTRY_COLORS = [
  '#1a6fa3', '#17a589', '#d4a800', '#C1121F', '#7d3c98',
  '#669BBC', '#2e86c1', '#c0392b', '#b7950b', '#1abc9c',
  '#2980b9', '#8e44ad', '#e67e22', '#16a085', '#f39c12',
];

// --- FDI: Presidential periods ---
export const PRESIDENTIAL_PERIODS = [
  { name: 'Kirchner', start: 2003, end: 2007, color: '#7d3c98' },
  { name: 'CFK', start: 2007, end: 2015, color: '#669BBC' },
  { name: 'Macri', start: 2015, end: 2019, color: '#d4a800' },
  { name: 'Fernandez', start: 2019, end: 2023, color: '#1a6fa3' },
  { name: 'Milei', start: 2023, end: 2028, color: '#C1121F' },
];

export function getSectorColor(sector) {
  return SECTOR_COLORS[sector] || 'rgba(0,48,73,0.35)';
}
