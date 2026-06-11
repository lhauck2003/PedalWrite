/**
 * hooks.ts — React hooks for every API resource.
 * Each returns { data, loading, error, refetch }.
 */

import { useState, useEffect, useCallback } from "react";
import * as api from "./api";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function useApi<T>(fetcher: () => Promise<T>): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err: Error) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  return { data, loading, error, refetch };
}

export function useMe()                          { return useApi(api.fetchMe); }
export function useRiders()                      { return useApi(api.fetchRiders); }
export function useRider(id: string | null)      { return useApi(() => id !== null ? api.fetchRider(id) : Promise.resolve(null)); }
export function useDailyForms()                  { return useApi(api.fetchDailyForms); }
export function useDailyForm(id: string | null)  { return useApi(() => id !== null ? api.fetchDailyForm(id) : Promise.resolve(null)); }
export function useFinalForms()                  { return useApi(api.fetchFinalForms); }
export function useFinalForm(id: string | null)  { return useApi(() => id !== null ? api.fetchFinalForm(id) : Promise.resolve(null)); }
export function useCaregivers()                  { return useApi(api.fetchCaregivers); }
export function useCaregiverRiders()             { return useApi(api.fetchCaregiverRiders); }
export function useLeaders()                     { return useApi(api.fetchLeaders); }
export function useSessions()                    { return useApi(api.fetchSessions); }
export function useSkills(formlevel?: number)    { return useApi(() => api.fetchSkills(formlevel)); }
export function useBikes()                       { return useApi(api.fetchBikes); }
export function useBikeSpecs()                   { return useApi(api.fetchBikeSpecs); }
export function useGeneralStats()                { return useApi(api.fetchGeneralStats); }
export function useUsers()                       { return useApi(api.fetchUsers); }
