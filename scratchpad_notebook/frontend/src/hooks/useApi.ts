import { useState, useCallback } from 'react';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async <T>(url: string, options?: RequestInit): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Request failed with status ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      const msg = err.message || 'Network request failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback(<T>(url: string) => {
    return request<T>(url, { method: 'GET' });
  }, [request]);

  const post = useCallback(<T>(url: string, data?: any) => {
    return request<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }, [request]);

  return { request, get, post, loading, error };
}

