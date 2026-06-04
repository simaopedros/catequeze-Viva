import { useState, useEffect } from 'react';
import useDebounce from './useDebounce';

export interface City {
  id: number;
  name: string;
}

interface UseIbgeCitiesResult {
  cities: City[];
  loading: boolean;
  error: string | null;
}

const CITIES_CACHE: Record<string, City[]> = {};

/**
 * Hook that fetches cities for a given Brazilian state (UF) from the IBGE API.
 * Results are cached per UF to avoid repeated network calls.
 * Supports optional name filter with debounce.
 */
export function useIbgeCities(uf: string, nameFilter = ''): UseIbgeCitiesResult {
  const debouncedFilter = useDebounce(nameFilter, 300);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedUf = uf.toUpperCase().trim();

  // Fetch full city list when UF changes
  useEffect(() => {
    if (normalizedUf.length !== 2) {
      setCities([]);
      return;
    }

    if (CITIES_CACHE[normalizedUf]) {
      setCities(CITIES_CACHE[normalizedUf]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${normalizedUf}/municipios`)
      .then((res) => res.json())
      .then((json: Array<{ id: number; nome: string }>) => {
        if (cancelled) return;
        const list = json.map((c) => ({ id: c.id, name: c.nome }));
        CITIES_CACHE[normalizedUf] = list;
        setCities(list);
      })
      .catch(() => {
        if (!cancelled) setError('Erro ao buscar cidades');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [normalizedUf]);

  // Filter locally by name
  const filtered = debouncedFilter
    ? cities.filter((c) => c.name.toLowerCase().includes(debouncedFilter.toLowerCase()))
    : cities;

  return { cities: filtered, loading, error };
}

/**
 * Static list of Brazilian states — no API call needed.
 */
export const BRAZILIAN_STATES = [
  { uf: 'AC', name: 'Acre' },
  { uf: 'AL', name: 'Alagoas' },
  { uf: 'AP', name: 'Amapá' },
  { uf: 'AM', name: 'Amazonas' },
  { uf: 'BA', name: 'Bahia' },
  { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' },
  { uf: 'ES', name: 'Espírito Santo' },
  { uf: 'GO', name: 'Goiás' },
  { uf: 'MA', name: 'Maranhão' },
  { uf: 'MT', name: 'Mato Grosso' },
  { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' },
  { uf: 'PA', name: 'Pará' },
  { uf: 'PB', name: 'Paraíba' },
  { uf: 'PR', name: 'Paraná' },
  { uf: 'PE', name: 'Pernambuco' },
  { uf: 'PI', name: 'Piauí' },
  { uf: 'RJ', name: 'Rio de Janeiro' },
  { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'RO', name: 'Rondônia' },
  { uf: 'RR', name: 'Roraima' },
  { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'São Paulo' },
  { uf: 'SE', name: 'Sergipe' },
  { uf: 'TO', name: 'Tocantins' },
];
