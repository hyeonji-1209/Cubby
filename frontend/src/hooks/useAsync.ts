import { useState, useCallback } from 'react';

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseAsyncReturn<T, Args extends unknown[]> extends UseAsyncState<T> {
  execute: (...args: Args) => Promise<T | null>;
  reset: () => void;
  setData: (data: T | null) => void;
}

/**
 * 비동기 작업을 위한 커스텀 훅
 * - loading, error 상태 자동 관리
 * - try/catch/finally 패턴 캡슐화
 */
export const useAsync = <T, Args extends unknown[] = []>(
  asyncFn: (...args: Args) => Promise<T>,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  }
): UseAsyncReturn<T, Args> => {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const data = await asyncFn(...args);
        setState({ data, loading: false, error: null });
        options?.onSuccess?.(data);
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setState((prev) => ({ ...prev, loading: false, error }));
        options?.onError?.(error);
        return null;
      }
    },
    [asyncFn, options]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  const setData = useCallback((data: T | null) => {
    setState((prev) => ({ ...prev, data }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
  };
};

/**
 * 간단한 로딩 상태 관리를 위한 훅
 */
export const useLoading = (initialState = false) => {
  const [loading, setLoading] = useState(initialState);

  const withLoading = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      setLoading(true);
      try {
        return await fn();
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, setLoading, withLoading };
};

export default useAsync;
