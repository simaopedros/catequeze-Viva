import { useState, useEffect, useCallback } from 'react';

export interface WikidataDiocese {
  wikidataId: string;    // e.g. "Q11234"
  name: string;
  state?: string;        // UF abbreviation
  stateLabel?: string;
}

interface UseWikidataDiocesesResult {
  dioceses: WikidataDiocese[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetches Roman Catholic dioceses in Brazil from Wikidata SPARQL.
 * Results are cached in sessionStorage for the session.
 *
 * @param stateFilter - optional 2-letter UF code to filter by state
 */
export function useWikidataDioceses(stateFilter?: string): UseWikidataDiocesesResult {
  const [dioceses, setDioceses] = useState<WikidataDiocese[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDioceses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const cacheKey = `wikidata_dioceses_br`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const all = JSON.parse(cached) as WikidataDiocese[];
        setDioceses(stateFilter ? all.filter(d => d.state === stateFilter) : all);
        setLoading(false);
        return;
      }

      // SPARQL: all Catholic dioceses in Brazil (Q155)
      const query = `
SELECT ?diocese ?dioceseLabel ?state ?stateLabel WHERE {
  ?diocese wdt:P31 wd:Q3146899.
  ?diocese wdt:P17 wd:Q155.
  OPTIONAL { ?diocese wdt:P131 ?state. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". }
}
ORDER BY ?dioceseLabel
      `.trim();

      const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Wikidata error: ${response.status}`);

      const data = await response.json();
      const results: WikidataDiocese[] = data.results.bindings.map((b: any) => {
        // Extract state UF from stateLabel (e.g. "São Paulo" → "SP")
        // or from state Q-id
        const stateId = b.state?.value?.split('/').pop() || '';
        const stateName = b.stateLabel?.value || '';
        const state = ufFromLabel(stateName) || stateId || undefined;

        return {
          wikidataId: b.diocese.value.split('/').pop(),
          name: b.dioceseLabel.value,
          state,
          stateLabel: stateName || undefined,
        };
      });

      sessionStorage.setItem(cacheKey, JSON.stringify(results));
      setDioceses(stateFilter ? results.filter(d => d.state === stateFilter) : results);
    } catch (err: any) {
      setError(err.message || 'Erro ao consultar Wikidata.');
      setDioceses([]);
    } finally {
      setLoading(false);
    }
  }, [stateFilter]);

  useEffect(() => {
    fetchDioceses();
  }, [fetchDioceses]);

  return { dioceses, loading, error };
}

/** Simple map from common state names → UF codes */
function ufFromLabel(label: string): string | null {
  const map: Record<string, string> = {
    'acre': 'AC', 'alagoas': 'AL', 'amapá': 'AP', 'amazonas': 'AM',
    'bahia': 'BA', 'ceará': 'CE', 'distrito federal': 'DF',
    'espírito santo': 'ES', 'goiás': 'GO', 'maranhão': 'MA',
    'mato grosso': 'MT', 'mato grosso do sul': 'MS',
    'minas gerais': 'MG', 'pará': 'PA', 'paraíba': 'PB',
    'paraná': 'PR', 'pernambuco': 'PE', 'piauí': 'PI',
    'rio de janeiro': 'RJ', 'rio grande do norte': 'RN',
    'rio grande do sul': 'RS', 'rondônia': 'RO', 'roraima': 'RR',
    'santa catarina': 'SC', 'são paulo': 'SP', 'sergipe': 'SE',
    'tocantins': 'TO',
  };
  return map[label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')] || null;
}
