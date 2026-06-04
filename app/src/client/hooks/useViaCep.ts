import { useState, useEffect } from 'react';
import useDebounce from './useDebounce';

export interface ViaCepResult {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  complement: string;
}

interface ViaCepHookResult {
  data: ViaCepResult | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook that fetches address data from ViaCEP API when a valid 8-digit CEP is provided.
 * Includes 500ms debounce and returns structured address fields.
 * Falls back gracefully — all fields remain manually editable if the API is unavailable.
 */
export function useViaCep(cep: string): ViaCepHookResult {
  const debouncedCep = useDebounce(cep, 500);
  const [data, setData] = useState<ViaCepResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = debouncedCep.replace(/\D/g, '');

    if (raw.length !== 8) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`https://viacep.com.br/ws/${raw}/json/`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.erro) {
          setError('CEP não encontrado');
          setData(null);
          return;
        }
        setData({
          street: json.logradouro || '',
          neighborhood: json.bairro || '',
          city: json.localidade || '',
          state: json.uf || '',
          complement: json.complemento || '',
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError('Erro ao consultar CEP');
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedCep]);

  return { data, loading, error };
}
