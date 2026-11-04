"use client";
import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_CYCLE_YEAR, AVAILABLE_YEARS } from './institutional';

const STORAGE_KEY = 'andar_active_cycle';

export function getActiveCycleYear(): string {
  if (typeof window === 'undefined') return DEFAULT_CYCLE_YEAR;
  
  // 1. Chequear query parameter en URL (?cycle=2027 o ?year=2027)
  const params = new URLSearchParams(window.location.search);
  const qYear = params.get('cycle') || params.get('year');
  if (qYear && (AVAILABLE_YEARS as readonly string[]).includes(qYear)) {
    try {
      localStorage.setItem(STORAGE_KEY, qYear);
      document.cookie = `${STORAGE_KEY}=${qYear}; path=/; max-age=31536000`;
    } catch {}
    return qYear;
  }

  // 2. Chequear localStorage
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (AVAILABLE_YEARS as readonly string[]).includes(saved)) {
      return saved;
    }
  } catch {}

  return DEFAULT_CYCLE_YEAR;
}

export function setActiveCycleYear(year: string) {
  if (typeof window === 'undefined') return;
  if (!(AVAILABLE_YEARS as readonly string[]).includes(year)) return;

  try {
    localStorage.setItem(STORAGE_KEY, year);
    document.cookie = `${STORAGE_KEY}=${year}; path=/; max-age=31536000`;
  } catch {}

  window.dispatchEvent(new CustomEvent('andar:cycle-changed', { detail: { year } }));
}

/**
 * Hook reactivo para acceder y alternar el Ciclo Lectivo Activo en cualquier componente.
 */
export function useActiveCycle() {
  const [activeYear, setYearState] = useState<string>(DEFAULT_CYCLE_YEAR);

  useEffect(() => {
    // Inicializar con el valor persistido
    setYearState(getActiveCycleYear());

    // Escuchar eventos de cambio en cualquier pestaña o componente
    const handleCycleChange = (e: any) => {
      if (e.detail?.year) {
        setYearState(e.detail.year);
      }
    };

    window.addEventListener('andar:cycle-changed', handleCycleChange);
    return () => {
      window.removeEventListener('andar:cycle-changed', handleCycleChange);
    };
  }, []);

  const changeYear = useCallback((newYear: string) => {
    setYearState(newYear);
    setActiveCycleYear(newYear);
  }, []);

  return {
    activeYear,
    setActiveYear: changeYear,
    is2026: activeYear === '2026',
    is2027: activeYear === '2027',
    availableYears: AVAILABLE_YEARS
  };
}
