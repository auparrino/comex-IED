import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ReporterContext = createContext(null);

const STORAGE_KEY = 'comex-mobile-reporter';
const VALID = ['arg', 'ury', 'pry'];

export function ReporterProvider({ children }) {
  const [reporter, setReporterState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return VALID.includes(saved) ? saved : 'arg';
    } catch {
      return 'arg';
    }
  });

  // Year range — null means "all years available"
  const [yearFrom, setYearFrom] = useState(null);
  const [yearTo, setYearTo] = useState(null);

  const setReporter = useCallback((next) => {
    if (!VALID.includes(next)) return;
    setReporterState(next);
    // Reset year range so each reporter gets its full range by default
    setYearFrom(null);
    setYearTo(null);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  }, []);

  const setYearRange = useCallback((from, to) => {
    setYearFrom(from);
    setYearTo(to);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.reporter = reporter;
  }, [reporter]);

  return (
    <ReporterContext.Provider value={{ reporter, setReporter, yearFrom, yearTo, setYearRange }}>
      {children}
    </ReporterContext.Provider>
  );
}

export function useReporter() {
  const ctx = useContext(ReporterContext);
  if (!ctx) throw new Error('useReporter must be used inside ReporterProvider');
  return ctx;
}

// Resolve effective year range against the available years for the active reporter
export function resolveYearRange(yearFrom, yearTo, allYears) {
  if (!allYears || allYears.length === 0) return { from: null, to: null, list: [] };
  const from = yearFrom && allYears.includes(yearFrom) ? yearFrom : allYears[0];
  const to = yearTo && allYears.includes(yearTo) ? yearTo : allYears[allYears.length - 1];
  const fromIdx = allYears.indexOf(from);
  const toIdx = allYears.indexOf(to);
  const lo = Math.min(fromIdx, toIdx);
  const hi = Math.max(fromIdx, toIdx);
  return { from: allYears[lo], to: allYears[hi], list: allYears.slice(lo, hi + 1) };
}

export const REPORTER_META = {
  arg: { name: 'Argentina', flag: '🇦🇷', iso3: 'ARG' },
  ury: { name: 'Uruguay',   flag: '🇺🇾', iso3: 'URY' },
  pry: { name: 'Paraguay',  flag: '🇵🇾', iso3: 'PRY' },
};
