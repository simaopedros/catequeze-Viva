import { useState, useEffect, useCallback } from 'react';

export interface OsmParish {
  osmId: string;         // e.g. "node/123456789"
  name: string;
  address?: string;      // street + number
  city?: string;
  state?: string;
  latitude: number;
  longitude: number;
}

interface UseOsmParishesResult {
  parishes: OsmParish[];
  loading: boolean;
  error: string | null;
}

/**
 * Searches Roman Catholic places of worship in a given city/state
 * via the free OpenStreetMap Overpass API.
 *
 * @param city   - Municipality name (e.g. "São Paulo")
 * @param state  - 2-letter state abbreviation (e.g. "SP")
 */
export function useOsmParishes(city: string, state: string): UseOsmParishesResult {
  const [parishes, setParishes] = useState<OsmParish[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchParishes = useCallback(async () => {
    const normalizedCity = city?.trim();
    const normalizedState = state?.trim()?.toUpperCase();

    if (!normalizedCity || normalizedState.length !== 2) {
      setParishes([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Overpass QL: filter amenity=place_of_worship + religion=christian + denomination=roman_catholic
      // within the administrative boundary of the city.
      const query = `
[out:json][timeout:15];
area["name"="${normalizedCity}"]["admin_level"="8"]["boundary"="administrative"]["is_in:state"="${normalizedState}"]->.city;
node["amenity"="place_of_worship"]["religion"="christian"]["denomination"="roman_catholic"](area.city);
out body;
      `.trim();

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }

      const data = await response.json();

      const results: OsmParish[] = (data.elements || [])
        .filter((el: any) => el.type === 'node' && el.tags?.name)
        .map((el: any) => ({
          osmId: `${el.type}/${el.id}`,
          name: el.tags.name,
          address: [
            el.tags['addr:street'],
            el.tags['addr:housenumber'],
          ].filter(Boolean).join(', ') || undefined,
          city: el.tags['addr:city'] || normalizedCity,
          state: el.tags['addr:state'] || normalizedState,
          latitude: el.lat,
          longitude: el.lon,
        }));

      setParishes(results);
    } catch (err: any) {
      setError(err.message || 'Erro ao consultar OpenStreetMap.');
      setParishes([]);
    } finally {
      setLoading(false);
    }
  }, [city, state]);

  useEffect(() => {
    fetchParishes();
  }, [fetchParishes]);

  return { parishes, loading, error };
}
