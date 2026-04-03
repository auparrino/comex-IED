import { useState, useEffect } from 'react';

const REPORTER_FILES = {
  flows: 'fdi_flows_by_country_year.json',
  sectors: 'fdi_by_sector_year.json',
  projects: 'fdi_projects.json',
  freshness: 'data_freshness.json',
};

async function loadJson(path) {
  try {
    const base = import.meta.env.BASE_URL || '/';
    const response = await fetch(`${base}${path}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    console.warn(`Failed to load ${path}:`, err.message);
    return null;
  }
}

export function useFdiData(activeReporter) {
  const [data, setData] = useState({
    flows: null,
    sectors: null,
    projects: null,
    freshness: null,
    loading: true,
    errors: [],
  });

  useEffect(() => {
    let cancelled = false;
    setData(prev => ({ ...prev, loading: true }));

    async function load() {
      const errors = [];
      const results = {};

      await Promise.all(
        Object.entries(REPORTER_FILES).map(async ([key, file]) => {
          let result = await loadJson(`data/fdi/${activeReporter}/${file}`);
          if (!result && activeReporter === 'arg') {
            result = await loadJson(`data/fdi/${file}`);
          }
          if (!result) errors.push(key);
          results[key] = result;
        })
      );

      if (!cancelled) {
        setData({ ...results, loading: false, errors });
      }
    }

    load();
    return () => { cancelled = true; };
  }, [activeReporter]);

  return data;
}

export async function loadFdiReporters() {
  const base = import.meta.env.BASE_URL || '/';
  try {
    const r = await fetch(`${base}data/fdi/reporters.json`);
    if (r.ok) return await r.json();
  } catch (e) { /* ignore */ }
  return [
    { key: 'arg', name: 'Argentina', iso2: 'AR' },
    { key: 'ury', name: 'Uruguay', iso2: 'UY' },
    { key: 'pry', name: 'Paraguay', iso2: 'PY' },
  ];
}
