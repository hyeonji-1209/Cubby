import { useState, useEffect, useCallback } from 'react';

interface UseFetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseFetchReturn<T> extends UseFetchState<T> {
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/**
 * 데이터 페칭을 위한 커스텀 훅
 * - 자동 로딩 및 에러 상태 관리
 * - 의존성 변경 시 자동 재페칭
 * - 수동 refetch 기능
 */
export const useFetch = <T>(
  fetchFn: () => Promise<T>,
  deps: React.DependencyList = [],
  options?: {
    enabled?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  }
): UseFetchReturn<T> => {
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const enabled = options?.enabled ?? true;

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetchFn();
      setState({ data, loading: false, error: null });
      options?.onSuccess?.(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState((prev) => ({ ...prev, loading: false, error }));
      options?.onError?.(error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn, enabled, ...deps]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setData: React.Dispatch<React.SetStateAction<T | null>> = useCallback(
    (value) => {
      setState((prev) => ({
        ...prev,
        data: typeof value === 'function' ? (value as (prev: T | null) => T | null)(prev.data) : value,
      }));
    },
    []
  );

  return {
    ...state,
    refetch: fetchData,
    setData,
  };
};

export default useFetch;
