// ============================================================
// Unified formatting utilities for pisubi-v2
// Merges comex-viz-app and fdi-tracker formatters
// ============================================================

// --- Comex formatters ---

/** Format USD value as $1.2B / $50M / $3K */
export function fmt(value) {
  if (value === 0 || value == null) return '$0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** Format USD value with full separators: $1,234,567 */
export function fmtFull(value) {
  if (value == null) return '$0';
  return '$' + Math.round(value).toLocaleString('en-US');
}

/** Format as percentage (multiplies by 100): 0.123 -> "12.3%" */
export function fmtPct(value) {
  if (value == null) return '0%';
  return (value * 100).toFixed(1) + '%';
}

export const MONTHS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export const MONTHS_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// --- FDI formatters ---
// Note: FDI data is stored in millions, so 1000 = $1B

/** Format USD (millions input): 1500 -> "USD 1.5B" */
export function fmtUsd(value) {
  if (value == null || isNaN(value)) return '\u2014';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1000) return `${sign}USD ${(abs / 1000).toFixed(1)}B`;
  if (abs >= 1) return `${sign}USD ${abs.toFixed(0)}M`;
  if (abs >= 0.1) return `${sign}USD ${(abs * 1000).toFixed(0)}K`;
  return `${sign}USD ${(abs * 1000).toFixed(1)}K`;
}

/** Format USD short (millions input): 1500 -> "$1.5B" */
export function fmtUsdShort(value) {
  if (value == null || isNaN(value)) return '\u2014';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}B`;
  if (abs >= 1) return `${sign}$${abs.toFixed(0)}M`;
  return `${sign}$${(abs * 1000).toFixed(0)}K`;
}

/** Format number with locale separators: 1234.5 -> "1,234.5" */
export function fmtNum(value) {
  if (value == null || isNaN(value)) return '\u2014';
  return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
}
