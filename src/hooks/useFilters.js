import { useState, useCallback, useMemo } from 'react';

export function useFilters() {
  const [yearRange, setYearRange] = useState([2003, 2024]);
  const [selectedSectors, setSelectedSectors] = useState([]);
  const [metric, setMetric] = useState('stock'); // 'stock' or 'flow'

  const toggleSector = useCallback((sector) => {
    setSelectedSectors(prev =>
      prev.includes(sector)
        ? prev.filter(s => s !== sector)
        : [...prev, sector]
    );
  }, []);

  const clearSectors = useCallback(() => {
    setSelectedSectors([]);
  }, []);

  const filterByYear = useCallback((data) => {
    if (!data) return [];
    return data.filter(d => d.year >= yearRange[0] && d.year <= yearRange[1]);
  }, [yearRange]);

  const filterBySector = useCallback((data) => {
    if (!data || selectedSectors.length === 0) return data;
    return data.filter(d =>
      selectedSectors.includes(d.sector) || selectedSectors.includes(d.sector_en)
    );
  }, [selectedSectors]);

  return {
    yearRange,
    setYearRange,
    selectedSectors,
    setSelectedSectors,
    toggleSector,
    clearSectors,
    metric,
    setMetric,
    filterByYear,
    filterBySector,
  };
}
